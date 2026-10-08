import "server-only";
import { migrate } from "./schema";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { patients } from "@/data/patients";
import { hashPassword } from "./password";
import type { Patient, PatientInput, Activity } from "./types";
import { InputError } from "./validation";

let database: DatabaseSync | undefined;
export const demoEnabled = () =>
  process.env.PORTAL_DEMO === "true" ||
  (process.env.NODE_ENV !== "production" &&
    process.env.PORTAL_DEMO !== "false");
export function db() {
  if (database) return database;
  const path = resolve(
    /* turbopackIgnore: true */ process.env.PORTAL_DB_PATH ||
      ".portal/portal.sqlite",
  );
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const connection = new DatabaseSync(path);
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','patient')), patient_id TEXT UNIQUE REFERENCES patients(id) ON DELETE CASCADE, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  migrate(connection);
  connection.exec("BEGIN IMMEDIATE");
  try {
    if (
      !connection
        .prepare("SELECT value FROM settings WHERE key='initialized'")
        .get()
    ) {
      const demo = demoEnabled();
      const email =
        process.env.PORTAL_ADMIN_EMAIL || (demo ? "admin@hospital.com" : "");
      const password =
        process.env.PORTAL_ADMIN_PASSWORD || (demo ? "admin123" : "");
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        !password ||
        password.length > 128 ||
        (!demo && password.length < 12)
      )
        throw new Error(
          "Set PORTAL_ADMIN_EMAIL and PORTAL_ADMIN_PASSWORD (12+ characters) before starting.",
        );
      connection
        .prepare(
          "INSERT INTO users (id,email,password_hash,role,patient_id,name) VALUES (?, ?, ?, 'admin', NULL, ?)",
        )
        .run(
          randomUUID(),
          email.trim().toLowerCase(),
          hashPassword(password),
          "Hospital administrator",
        );
      if (demo)
        for (const seed of patients) {
          const { password: seedPassword, ...record } = seed;
          const dates: Record<string, string> = {
            "1": "2026-04-30",
            "2": "2026-05-10",
            "3": "2026-05-05",
          };
          const data = { ...record, nextCheckup: dates[record.id] };
          connection
            .prepare("INSERT INTO patients VALUES (?, ?, ?, 1)")
            .run(record.id, record.email, JSON.stringify(data));
          connection
            .prepare(
              "INSERT INTO users (id,email,password_hash,role,patient_id,name) VALUES (?, ?, ?, 'patient', ?, ?)",
            )
            .run(
              randomUUID(),
              record.email,
              hashPassword(seedPassword),
              record.id,
              record.name,
            );
        }
      connection
        .prepare("INSERT INTO settings VALUES ('initialized', '1')")
        .run();
      connection
        .prepare("INSERT INTO settings VALUES ('mode', ?)")
        .run(demo ? "demo" : "configured");
    }
    const mode = connection
      .prepare("SELECT value FROM settings WHERE key='mode'")
      .get();
    if (!demoEnabled() && mode?.value !== "configured")
      throw new Error(
        "Use a fresh database with configured administrator credentials. Demo databases cannot be opened with demo mode disabled.",
      );
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    connection.close();
    throw error;
  }
  database = connection;
  return database;
}
function fromRow(row: Record<string, unknown>): Patient {
  return { ...JSON.parse(String(row.data)), version: Number(row.version) };
}
export function listPatients(): Patient[] {
  return db()
    .prepare(
      "SELECT data, version FROM patients ORDER BY json_extract(data, '$.name') COLLATE NOCASE",
    )
    .all()
    .map(fromRow);
}
export function findPatient(id: string): Patient | null {
  const row = db()
    .prepare("SELECT data, version FROM patients WHERE id=?")
    .get(id);
  return row ? fromRow(row) : null;
}
export function activity(): Activity[] {
  return db()
    .prepare(
      "SELECT id, actor, action, subject, created_at AS createdAt FROM activity ORDER BY id DESC LIMIT 50",
    )
    .all() as unknown as Activity[];
}
function log(actor: string, action: string, subject: string) {
  db()
    .prepare(
      "INSERT INTO activity (actor, action, subject, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(actor, action, subject, new Date().toISOString());
}
export function savePatient(input: PatientInput, actor: string, id?: string) {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const existing = id ? findPatient(id) : null;
    if (id && !existing) throw new InputError("Patient not found.", 404);
    if (existing && existing.version !== input.version)
      throw new InputError(
        "This record changed in another session. Reload before saving.",
        409,
      );
    const duplicate = connection
      .prepare("SELECT patient_id FROM users WHERE email=?")
      .get(input.email);
    if (duplicate && duplicate.patient_id !== id)
      throw new InputError("This email is already in use.", 409);
    const { password, ...fields } = input;
    delete fields.version;
    const patientId = id || randomUUID();
    const record = { ...fields, id: patientId };
    if (existing) {
      connection
        .prepare(
          "UPDATE patients SET email=?, data=?, version=version+1 WHERE id=?",
        )
        .run(input.email, JSON.stringify(record), patientId);
      connection
        .prepare("UPDATE users SET email=?, name=? WHERE patient_id=?")
        .run(input.email, input.name, patientId);
      if (password) {
        connection
          .prepare("UPDATE users SET password_hash=? WHERE patient_id=?")
          .run(hashPassword(password), patientId);
        connection
          .prepare(
            "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE patient_id=?)",
          )
          .run(patientId);
      }
    } else {
      connection
        .prepare("INSERT INTO patients VALUES (?, ?, ?, 1)")
        .run(patientId, input.email, JSON.stringify(record));
      connection
        .prepare(
          "INSERT INTO users (id,email,password_hash,role,patient_id,name) VALUES (?, ?, ?, 'patient', ?, ?)",
        )
        .run(
          randomUUID(),
          input.email,
          hashPassword(password!),
          patientId,
          input.name,
        );
    }
    log(
      actor,
      existing ? "Updated patient record" : "Registered patient",
      input.name,
    );
    connection.exec("COMMIT");
    return findPatient(patientId)!;
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}
export function deletePatient(id: string, version: number, actor: string) {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const patient = findPatient(id);
    if (!patient) throw new InputError("Patient not found.", 404);
    if (patient.version !== version)
      throw new InputError("This record changed. Reload before deleting.", 409);
    const used = connection
      .prepare(
        "SELECT (SELECT COUNT(*) FROM appointments WHERE patient_id=?) + (SELECT COUNT(*) FROM visits WHERE patient_id=?) + (SELECT COUNT(*) FROM reports WHERE patient_id=?) + (SELECT COUNT(*) FROM invoices WHERE patient_id=?) + (SELECT COUNT(*) FROM admissions WHERE patient_id=?) + (SELECT COUNT(*) FROM encounters WHERE patient_id=?) AS total",
      )
      .get(id, id, id, id, id, id);
    if (Number(used?.total))
      throw new InputError(
        "This patient has hospital records and cannot be deleted. Retain the medical history.",
        409,
      );
    connection.prepare("DELETE FROM patients WHERE id=?").run(id);
    log(actor, "Deleted patient record", patient.name);
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}
