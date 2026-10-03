import { DatabaseSync } from "node:sqlite";
import { createDecipheriv } from "node:crypto";
import { open, mkdtemp, rm, copyFile, chmod } from "node:fs/promises";
import { createReadStream, createWriteStream, constants } from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
const [input, destination] = process.argv.slice(2),
  key = process.env.PORTAL_BACKUP_KEY;
if (!input || !destination || !key || !/^[a-f0-9]{64}$/i.test(key))
  throw new Error(
    "Usage: node scripts/restore.mjs backup.sah NEW-database.sqlite (set PORTAL_BACKUP_KEY). Existing files are never overwritten.",
  );
const file = await open(resolve(input), "r"),
  scratch = await mkdtemp(join(tmpdir(), "allada-restore-"));
try {
  const { size } = await file.stat();
  if (size < 32) throw new Error("Invalid backup.");
  const header = Buffer.alloc(16),
    tag = Buffer.alloc(16);
  await file.read(header, 0, 16, 0);
  await file.read(tag, 0, 16, size - 16);
  if (header.subarray(0, 4).toString() !== "SAH1")
    throw new Error("Invalid backup format.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    header.subarray(4),
  );
  decipher.setAuthTag(tag);
  const restored = join(scratch, "verified.sqlite");
  await pipeline(
    createReadStream(resolve(input), { start: 16, end: size - 17 }),
    decipher,
    createWriteStream(restored, { mode: 0o600 }),
  );
  const connection = new DatabaseSync(restored);
  try {
    if (
      connection.prepare("PRAGMA integrity_check").get().integrity_check !==
        "ok" ||
      connection.prepare("PRAGMA foreign_key_check").all().length
    )
      throw new Error("Restored database failed integrity checks.");
  } finally {
    connection.close();
  }
  await copyFile(restored, resolve(destination), constants.COPYFILE_EXCL);
  await chmod(resolve(destination), 0o600);
  console.log(
    `Verified database restored to ${resolve(destination)}. Stop the app before changing PORTAL_DB_PATH. Keep the original report encryption key.`,
  );
} finally {
  await file.close();
  await rm(scratch, { recursive: true, force: true });
}
