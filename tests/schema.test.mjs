import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";

const source = await readFile(
  new URL("../lib/schema.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { migrate } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("upgrading a populated legacy database preserves patient credentials and active sessions", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE patients(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,data TEXT NOT NULL,version INTEGER NOT NULL);
      CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','patient')),patient_id TEXT UNIQUE REFERENCES patients(id) ON DELETE CASCADE,name TEXT NOT NULL);
      CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
      CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      INSERT INTO patients VALUES('legacy-patient','legacy@example.test','{"name":"Legacy patient","allergies":"Recorded allergy"}',7);
      INSERT INTO users VALUES('legacy-user','legacy@example.test','preserved-hash','patient','legacy-patient','Legacy patient');
      INSERT INTO sessions VALUES('session-hash','legacy-user',9999999999999);`);
    const patientBefore = db.prepare("SELECT * FROM patients").get();
    migrate(db);
    migrate(db);
    assert.deepEqual(db.prepare("SELECT * FROM patients").get(), patientBefore);
    const user = db.prepare("SELECT * FROM users").get();
    assert.equal(user.password_hash, "preserved-hash");
    assert.equal(user.patient_id, "legacy-patient");
    assert.equal(user.active, 1);
    assert.equal(
      db.prepare("SELECT user_id FROM sessions").get().user_id,
      "legacy-user",
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(db.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);
    db.exec(
      "INSERT INTO users VALUES('new-nurse','nurse@example.test','hash','nurse',NULL,'Nurse',1,'registration');",
    );
  } finally {
    db.close();
  }
});
