import "server-only";
import { db, demoEnabled } from "./db";
export function systemStatus() {
  const connection = db();
  const tables = [
    "patients",
    "users",
    "appointments",
    "visits",
    "reports",
    "invoices",
    "payments",
    "beds",
    "admissions",
    "nursing_notes",
    "audit_events",
    "encounters",
    "lab_orders",
    "pharmacy_orders",
  ] as const;
  const counts = Object.fromEntries(
    tables.map((table) => [
      table,
      Number(
        connection.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!
          .count,
      ),
    ]),
  );
  return {
    database: "SQLite",
    healthy:
      connection.prepare("PRAGMA quick_check").get()?.quick_check === "ok",
    schemaVersion: String(
      connection
        .prepare("SELECT value FROM settings WHERE key='schema_version'")
        .get()?.value || "unknown",
    ),
    demo: demoEnabled(),
    counts,
    timeZone: "Asia/Kolkata",
    currency: "INR",
    reportEncryptionConfigured:
      !!process.env.PORTAL_REPORT_KEY &&
      /^[a-f0-9]{64}$/i.test(process.env.PORTAL_REPORT_KEY),
    originConfigured: !!process.env.PORTAL_ORIGIN,
    backupKeyConfigured:
      !!process.env.PORTAL_BACKUP_KEY &&
      /^[a-f0-9]{64}$/i.test(process.env.PORTAL_BACKUP_KEY),
    lastBackup: String(
      connection
        .prepare("SELECT value FROM settings WHERE key='last_backup'")
        .get()?.value || "",
    ),
    checkedAt: new Date().toISOString(),
  };
}
export function auditEvents() {
  return db()
    .prepare(
      "SELECT id,actor_name AS actor,action,resource_type AS resourceType,resource_id AS resourceId,created_at AS createdAt FROM audit_events ORDER BY id DESC LIMIT 100",
    )
    .all() as unknown as {
    id: number;
    actor: string;
    action: string;
    resourceType: string;
    resourceId: string;
    createdAt: string;
  }[];
}
