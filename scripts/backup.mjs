import { DatabaseSync } from "node:sqlite";
import { createCipheriv, randomBytes } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm, chmod, stat } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const key = process.env.PORTAL_BACKUP_KEY;
if (!key || !/^[a-f0-9]{64}$/i.test(key))
  throw new Error(
    "Set PORTAL_BACKUP_KEY to a 32-byte hex key in your secret environment.",
  );
const source = resolve(process.env.PORTAL_DB_PATH || ".portal/portal.sqlite");
const target = resolve(process.env.PORTAL_BACKUP_DIR || ".portal/backups");
await mkdir(target, { recursive: true, mode: 0o700 });
const scratch = await mkdtemp(join(tmpdir(), "allada-backup-"));
let connection;
try {
  await stat(source);
  connection = new DatabaseSync(source);
  connection.exec("PRAGMA busy_timeout=10000");
  const snapshot = join(scratch, "snapshot.sqlite");
  connection.prepare("VACUUM INTO ?").run(snapshot);
  await chmod(snapshot, 0o600);
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const file = join(
    target,
    `hospital-${new Date().toISOString().replaceAll(":", "-")}-${randomBytes(4).toString("hex")}.sah`,
  );
  // Header: 4-byte magic, 12-byte IV; encrypted stream; trailing 16-byte GCM tag.
  await writeFile(file, Buffer.concat([Buffer.from("SAH1"), iv]), {
    flag: "wx",
    mode: 0o600,
  });
  await pipeline(
    createReadStream(snapshot),
    cipher,
    createWriteStream(file, { flags: "a", mode: 0o600 }),
  );
  await writeFile(file, cipher.getAuthTag(), { flag: "a" });
  connection
    .prepare(
      "INSERT INTO settings VALUES('last_backup',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .run(new Date().toISOString());
  console.log(`Encrypted backup created: ${file}`);
} finally {
  connection?.close();
  await rm(scratch, { recursive: true, force: true });
}
