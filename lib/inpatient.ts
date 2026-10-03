import "server-only";
import { randomUUID } from "node:crypto";
import { db, findPatient } from "./db";
import { audit, object, textField, doctors } from "./care";
import { InputError } from "./validation";
import type { Session, Bed, Admission } from "./types";
function transaction<T>(work: () => T) {
  db().exec("BEGIN IMMEDIATE");
  try {
    const r = work();
    db().exec("COMMIT");
    return r;
  } catch (e) {
    db().exec("ROLLBACK");
    throw e;
  }
}
export function beds(): Bed[] {
  return db()
    .prepare(
      "SELECT b.*,EXISTS(SELECT 1 FROM admissions a WHERE a.bed_id=b.id AND a.discharged_at IS NULL) AS occupied FROM beds b ORDER BY ward,label",
    )
    .all() as unknown as Bed[];
}
export function createBed(value: unknown, user: Session) {
  const data = object(value),
    ward = textField(data, "ward", 80),
    label = textField(data, "label", 30);
  return transaction(() => {
    if (
      db()
        .prepare("SELECT id FROM beds WHERE ward=? AND label=?")
        .get(ward, label)
    )
      throw new InputError("This bed already exists.", 409);
    const id = randomUUID();
    db().prepare("INSERT INTO beds VALUES(?,?,?)").run(id, ward, label);
    audit(user, "Created bed", "bed", id);
    return id;
  });
}
export function admissions(patientId?: string): Admission[] {
  const rows = db()
    .prepare(
      `SELECT a.id,a.patient_id AS patientId,json_extract(p.data,'$.name') AS patientName,b.ward,b.label AS bed,u.name AS doctorName,a.reason,a.admitted_at AS admittedAt,a.discharged_at AS dischargedAt,a.discharge_summary AS dischargeSummary,a.version FROM admissions a JOIN patients p ON p.id=a.patient_id JOIN beds b ON b.id=a.bed_id JOIN users u ON u.id=a.doctor_id ${patientId ? "WHERE a.patient_id=?" : ""} ORDER BY a.admitted_at DESC`,
    )
    .all(...(patientId ? [patientId] : []));
  return rows.map((row) => ({
    ...row,
    notes: db()
      .prepare(
        "SELECT n.id,u.name AS author,n.observations,n.created_at AS createdAt FROM nursing_notes n JOIN users u ON u.id=n.author_id WHERE n.admission_id=? ORDER BY n.created_at DESC",
      )
      .all(String(row.id)),
  })) as unknown as Admission[];
}
export function admit(value: unknown, user: Session) {
  const data = object(value),
    patientId = textField(data, "patientId", 100),
    bedId = textField(data, "bedId", 100),
    doctorId = textField(data, "doctorId", 100),
    reason = textField(data, "reason", 1000);
  return transaction(() => {
    if (!findPatient(patientId))
      throw new InputError("Patient not found.", 404);
    if (!doctors().some((d) => d.id === doctorId))
      throw new InputError("Select an active doctor.");
    if (!beds().some((b) => b.id === bedId && !b.occupied))
      throw new InputError("This bed is not available.", 409);
    if (
      db()
        .prepare(
          "SELECT id FROM admissions WHERE patient_id=? AND discharged_at IS NULL",
        )
        .get(patientId)
    )
      throw new InputError("This patient is already admitted.", 409);
    const id = randomUUID();
    db()
      .prepare(
        "INSERT INTO admissions(id,patient_id,bed_id,doctor_id,reason,admitted_at) VALUES(?,?,?,?,?,?)",
      )
      .run(id, patientId, bedId, doctorId, reason, new Date().toISOString());
    audit(user, "Admitted patient", "admission", id);
    return id;
  });
}
export function addNursingNote(id: string, value: unknown, user: Session) {
  const observations = textField(object(value), "observations", 5000);
  return transaction(() => {
    const row = db()
      .prepare("SELECT discharged_at FROM admissions WHERE id=?")
      .get(id);
    if (!row) throw new InputError("Admission not found.", 404);
    if (row.discharged_at)
      throw new InputError("This admission is closed.", 409);
    const noteId = randomUUID();
    db()
      .prepare("INSERT INTO nursing_notes VALUES(?,?,?,?,?)")
      .run(noteId, id, user.userId, observations, new Date().toISOString());
    audit(user, "Added nursing note", "admission", id);
    return noteId;
  });
}
export function discharge(id: string, value: unknown, user: Session) {
  const data = object(value),
    summary = textField(data, "summary", 10000);
  transaction(() => {
    const row = db().prepare("SELECT * FROM admissions WHERE id=?").get(id);
    if (!row) throw new InputError("Admission not found.", 404);
    if (row.discharged_at || row.version !== data.version)
      throw new InputError(
        "Admission changed or is already discharged. Reload before continuing.",
        409,
      );
    db()
      .prepare(
        "UPDATE admissions SET discharged_at=?,discharge_summary=?,version=version+1 WHERE id=?",
      )
      .run(new Date().toISOString(), summary, id);
    audit(user, "Discharged patient", "admission", id);
  });
}
