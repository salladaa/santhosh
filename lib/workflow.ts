import "server-only";
import { randomUUID } from "node:crypto";
import { db, findPatient } from "./db";
import { addVisit, audit, object, textField } from "./care";
import { InputError } from "./validation";
import type { Session } from "./types";
import type { WorkflowSnapshot } from "./workflow-types";
function permit(user: Session, roles: string[]) {
  if (!roles.includes(user.role))
    throw new InputError("This action is not available for your role.", 403);
}
function transaction<T>(work: () => T): T {
  db().exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db().exec("COMMIT");
    return result;
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }
}
function version(data: Record<string, unknown>) {
  if (!Number.isInteger(data.version) || Number(data.version) < 1)
    throw new InputError("Reload this item before continuing.", 409);
  return Number(data.version);
}
export function workflowSnapshot(user: Session): WorkflowSnapshot {
  const clinical = ["admin", "doctor"].includes(user.role);
  const front = ["admin", "reception"].includes(user.role);
  const own = user.role === "patient";
  const encounters =
    clinical || front || user.role === "nurse"
      ? db()
          .prepare(
            `SELECT e.id,e.patient_id AS patientId,json_extract(p.data,'$.name') AS patientName,json_extract(p.data,'$.age') AS age,COALESCE(json_extract(p.data,'$.allergies'),'') AS allergies,e.complaint,e.intake_notes AS intakeNotes,e.status,e.doctor_id AS doctorId,u.name AS doctorName,e.visit_id AS visitId,e.version,e.created_at AS createdAt FROM encounters e JOIN patients p ON p.id=e.patient_id LEFT JOIN users u ON u.id=e.doctor_id WHERE e.status!='Completed' OR e.updated_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days') ORDER BY e.created_at`,
          )
          .all()
          .map((r) => ({ ...r }))
      : [];
  const labs =
    clinical || user.role === "lab" || own
      ? db()
          .prepare(
            `SELECT l.id,l.encounter_id AS encounterId,e.patient_id AS patientId,json_extract(p.data,'$.name') AS patientName,json_extract(p.data,'$.age') AS age,l.test_name AS testName,l.instructions,l.status,l.result,l.version,l.updated_at AS updatedAt FROM lab_orders l JOIN encounters e ON e.id=l.encounter_id JOIN patients p ON p.id=e.patient_id ${own ? "WHERE e.patient_id=? AND l.status='Released'" : ""} ORDER BY l.updated_at DESC`,
          )
          .all(...(own ? [user.patientId!] : []))
          .map((r) => ({ ...r }))
      : [];
  const pharmacy =
    clinical || user.role === "pharmacy" || own
      ? db()
          .prepare(
            `SELECT o.id,o.encounter_id AS encounterId,e.patient_id AS patientId,json_extract(p.data,'$.name') AS patientName,json_extract(p.data,'$.age') AS age,COALESCE(json_extract(p.data,'$.allergies'),'') AS allergies,u.name AS doctorName,json_extract(v.data,'$.medicines') AS medicines,o.status,o.note,o.version,o.updated_at AS updatedAt FROM pharmacy_orders o JOIN encounters e ON e.id=o.encounter_id JOIN patients p ON p.id=e.patient_id JOIN visits v ON v.id=o.visit_id JOIN users u ON u.id=v.doctor_id ${own ? "WHERE e.patient_id=?" : ""} ORDER BY o.updated_at DESC`,
          )
          .all(...(own ? [user.patientId!] : []))
          .map((r) => ({
            ...r,
            medicines: JSON.parse(String(r.medicines)),
            note: own ? "" : r.note,
          }))
      : [];
  const patients = front
    ? db()
        .prepare(
          "SELECT id,json_extract(data,'$.name') AS name,json_extract(data,'$.age') AS age,json_extract(data,'$.phone') AS phone FROM patients ORDER BY name",
        )
        .all()
        .map((r) => ({ ...r }))
    : [];
  return {
    encounters,
    labs,
    pharmacy,
    patients,
    checkedAt: new Date().toISOString(),
  } as unknown as WorkflowSnapshot;
}
export function sendToQueue(value: unknown, user: Session) {
  permit(user, ["admin", "reception"]);
  const data = object(value),
    patientId = textField(data, "patientId", 100),
    complaint = textField(data, "complaint", 2000),
    notes = textField(data, "notes", 5000, false);
  return transaction(() => {
    if (!findPatient(patientId))
      throw new InputError("Patient not found.", 404);
    if (
      db()
        .prepare(
          "SELECT id FROM encounters WHERE patient_id=? AND status!='Completed'",
        )
        .get(patientId)
    )
      throw new InputError("This patient is already in the queue.", 409);
    const id = randomUUID(),
      now = new Date().toISOString();
    db()
      .prepare(
        "INSERT INTO encounters(id,patient_id,complaint,intake_notes,status,created_at,updated_at) VALUES(?,?,?,?,'Waiting',?,?)",
      )
      .run(id, patientId, complaint, notes, now, now);
    audit(user, "Sent patient to shared doctor queue", "encounter", id);
    return id;
  });
}
export function claimEncounter(id: string, value: unknown, user: Session) {
  permit(user, ["doctor"]);
  const data = object(value),
    expected = version(data);
  return transaction(() => {
    const row = db().prepare("SELECT * FROM encounters WHERE id=?").get(id);
    if (!row) throw new InputError("Visit not found.", 404);
    if (row.version !== expected || row.status !== "Waiting")
      throw new InputError(
        "Another doctor has taken this patient. The queue will refresh.",
        409,
      );
    db()
      .prepare(
        "UPDATE encounters SET doctor_id=?,status='In consultation',version=version+1,updated_at=? WHERE id=?",
      )
      .run(user.userId, new Date().toISOString(), id);
    audit(user, "Claimed patient consultation", "encounter", id);
  });
}
export function releaseEncounter(id: string, value: unknown, user: Session) {
  permit(user, ["admin", "doctor"]);
  const data = object(value),
    expected = version(data);
  transaction(() => {
    const row = db().prepare("SELECT * FROM encounters WHERE id=?").get(id);
    if (!row) throw new InputError("Visit not found.", 404);
    if (
      row.version !== expected ||
      row.status !== "In consultation" ||
      row.visit_id
    )
      throw new InputError(
        "This consultation can no longer be returned to the queue.",
        409,
      );
    if (user.role !== "admin" && row.doctor_id !== user.userId)
      throw new InputError(
        "Only the assigned doctor can return this patient.",
        403,
      );
    db()
      .prepare(
        "UPDATE encounters SET doctor_id=NULL,status='Waiting',version=version+1,updated_at=? WHERE id=?",
      )
      .run(new Date().toISOString(), id);
    audit(user, "Returned patient to shared queue", "encounter", id);
  });
}
export function confirmConsultation(id: string, value: unknown, user: Session) {
  permit(user, ["doctor"]);
  const data = object(value),
    expected = version(data),
    row = db().prepare("SELECT * FROM encounters WHERE id=?").get(id);
  if (!row) throw new InputError("Visit not found.", 404);
  if (row.doctor_id !== user.userId)
    throw new InputError(
      "Claim this patient before recording the consultation.",
      403,
    );
  if (row.version !== expected || row.status !== "In consultation")
    throw new InputError(
      "This consultation has already changed. Reload the queue.",
      409,
    );
  if (!Array.isArray(data.labTests) || data.labTests.length > 20)
    throw new InputError("Use up to 20 lab orders.");
  const labs = data.labTests.map((t) => {
    const d = object(t);
    return {
      name: textField(d, "name", 200),
      instructions: textField(d, "instructions", 1000, false),
    };
  });
  return addVisit(String(row.patient_id), data, user, (visitId) => {
    const now = new Date().toISOString();
    const updated = db()
      .prepare(
        "UPDATE encounters SET visit_id=?,status='Completed',version=version+1,updated_at=? WHERE id=? AND version=? AND status='In consultation' AND doctor_id=?",
      )
      .run(visitId, now, id, expected, user.userId);
    if (Number(updated.changes) !== 1)
      throw new InputError(
        "The consultation changed before confirmation. Reload the queue.",
        409,
      );
    for (const lab of labs)
      db()
        .prepare(
          "INSERT INTO lab_orders(id,encounter_id,test_name,instructions,status,updated_at) VALUES(?,?,?,?,'Ordered',?)",
        )
        .run(randomUUID(), id, lab.name, lab.instructions, now);
    if ((data.medicines as unknown[]).length)
      db()
        .prepare(
          "INSERT INTO pharmacy_orders(id,encounter_id,visit_id,status,updated_at) VALUES(?,?,?,'Pending',?)",
        )
        .run(randomUUID(), id, visitId, now);
    audit(
      user,
      "Confirmed consultation and sent department orders",
      "encounter",
      id,
    );
  });
}
export function updateLab(id: string, value: unknown, user: Session) {
  const data = object(value),
    expected = version(data),
    status = textField(data, "status", 30);
  permit(user, status === "Released" ? ["admin", "doctor"] : ["lab"]);
  transaction(() => {
    const row = db().prepare("SELECT * FROM lab_orders WHERE id=?").get(id);
    if (!row) throw new InputError("Order not found.", 404);
    const next: Record<string, string> = {
      Ordered: "Collected",
      Collected: "In progress",
      "In progress": "Completed",
      Completed: "Released",
    };
    if (row.version !== expected || next[String(row.status)] !== status)
      throw new InputError(
        "Order changed or invalid transition. Refresh the queue.",
        409,
      );
    const result =
      status === "Completed"
        ? textField(data, "result", 10000)
        : String(row.result);
    db()
      .prepare(
        "UPDATE lab_orders SET status=?,result=?,version=version+1,updated_at=? WHERE id=?",
      )
      .run(status, result, new Date().toISOString(), id);
    audit(user, `Lab order ${status.toLowerCase()}`, "lab_order", id);
  });
}
export function updatePharmacy(id: string, value: unknown, user: Session) {
  permit(user, ["pharmacy"]);
  const data = object(value),
    expected = version(data),
    status = textField(data, "status", 30),
    note = textField(data, "note", 1000, false);
  transaction(() => {
    const row = db()
      .prepare("SELECT * FROM pharmacy_orders WHERE id=?")
      .get(id);
    if (!row) throw new InputError("Prescription not found.", 404);
    const next: Record<string, string> = {
      Pending: "Preparing",
      Preparing: "Ready",
      Ready: "Dispensed",
    };
    if (row.version !== expected || next[String(row.status)] !== status)
      throw new InputError(
        "Prescription changed or invalid transition. Refresh the queue.",
        409,
      );
    db()
      .prepare(
        "UPDATE pharmacy_orders SET status=?,note=?,version=version+1,updated_at=? WHERE id=?",
      )
      .run(status, note, new Date().toISOString(), id);
    audit(user, `Pharmacy ${status.toLowerCase()}`, "pharmacy_order", id);
  });
}
