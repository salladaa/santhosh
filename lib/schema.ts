import type { DatabaseSync } from "node:sqlite";

// Additive, transactional migrations preserve the existing patient database.
export function migrate(connection: DatabaseSync) {
  connection.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE");
  try {
    const usersSql = String(
      connection
        .prepare("SELECT sql FROM sqlite_master WHERE name='users'")
        .get()?.sql,
    );
    if (!usersSql.includes("'nurse'")) {
      const oldColumns = connection
        .prepare("PRAGMA table_info(users)")
        .all()
        .map((r) => r.name);
      connection.exec(`CREATE TABLE users_new (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','patient','doctor','nurse')), patient_id TEXT UNIQUE REFERENCES patients(id) ON DELETE CASCADE, name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,registration TEXT NOT NULL DEFAULT '');
      INSERT INTO users_new SELECT id,email,password_hash,role,patient_id,name,${oldColumns.includes("active") ? "active" : "1"},${oldColumns.includes("registration") ? "registration" : "''"} FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;`);
    }
    const columns = connection
      .prepare("PRAGMA table_info(users)")
      .all()
      .map((r) => r.name);
    if (!columns.includes("active"))
      connection.exec(
        "ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
      );
    if (!columns.includes("registration"))
      connection.exec(
        "ALTER TABLE users ADD COLUMN registration TEXT NOT NULL DEFAULT ''",
      );
    connection.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), doctor_id TEXT NOT NULL REFERENCES users(id),
        starts_at TEXT NOT NULL, duration INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Requested','Scheduled','Checked in','Completed','Cancelled')), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS appointment_schedule ON appointments(doctor_id, starts_at);
      CREATE INDEX IF NOT EXISTS patient_schedule ON appointments(patient_id, starts_at);
      CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), doctor_id TEXT NOT NULL REFERENCES users(id),
        visit_date TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS patient_visits ON visits(patient_id, created_at);
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), title TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
        content BLOB NOT NULL, iv BLOB NOT NULL, tag BLOB NOT NULL, uploaded_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS patient_reports ON reports(patient_id, created_at);
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE, patient_id TEXT NOT NULL REFERENCES patients(id), items TEXT NOT NULL,
        total_paise INTEGER NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id), amount_paise INTEGER NOT NULL, method TEXT NOT NULL,
        reference TEXT NOT NULL, recorded_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS invoice_payments ON payments(invoice_id);
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, action TEXT NOT NULL,
        resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS beds(id TEXT PRIMARY KEY, ward TEXT NOT NULL, label TEXT NOT NULL, UNIQUE(ward,label));
      CREATE TABLE IF NOT EXISTS admissions(id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id),bed_id TEXT NOT NULL REFERENCES beds(id),doctor_id TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL,admitted_at TEXT NOT NULL,discharged_at TEXT,discharge_summary TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1);
      CREATE UNIQUE INDEX IF NOT EXISTS occupied_bed ON admissions(bed_id) WHERE discharged_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS admitted_patient ON admissions(patient_id) WHERE discharged_at IS NULL;
      CREATE TABLE IF NOT EXISTS nursing_notes(id TEXT PRIMARY KEY,admission_id TEXT NOT NULL REFERENCES admissions(id),author_id TEXT NOT NULL REFERENCES users(id),observations TEXT NOT NULL,created_at TEXT NOT NULL);
      INSERT INTO settings (key,value) VALUES ('schema_version','3') ON CONFLICT(key) DO UPDATE SET value='3';
    `);
    if (connection.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("Database relationship check failed.");
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  } finally {
    connection.exec("PRAGMA foreign_keys=ON");
  }
}
