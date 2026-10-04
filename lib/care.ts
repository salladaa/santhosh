import "server-only";
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { db, demoEnabled, findPatient } from "./db";
import { InputError } from "./validation";
import { hashPassword } from "./password";
import type {
  Session,
  Staff,
  Appointment,
  Visit,
  Report,
  Invoice,
  Medicine,
  CareData,
} from "./types";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Invalid request.");
  return value as Record<string, unknown>;
}
export function textField(
  data: Record<string, unknown>,
  key: string,
  max = 200,
  required = true,
) {
  const value = data[key];
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new InputError(`Check ${key} (maximum ${max} characters).`);
  return value.trim();
}
export function passwordField(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (typeof value !== "string" || !value.length || value.length > 128)
    throw new InputError("Enter a password of up to 128 characters.");
  return value;
}
export function audit(
  user: Session,
  action: string,
  resourceType: string,
  resourceId: string,
) {
  db()
    .prepare(
      "INSERT INTO audit_events(actor_id,actor_name,action,resource_type,resource_id,created_at) VALUES(?,?,?,?,?,?)",
    )
    .run(
      user.userId,
      user.name,
      action,
      resourceType,
      resourceId,
      new Date().toISOString(),
    );
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
function patientExists(id: string) {
  if (!findPatient(id)) throw new InputError("Patient not found.", 404);
}
export function staff(): Staff[] {
  return (
    db()
      .prepare(
        "SELECT id,name,email,role,active,registration FROM users WHERE role IN ('admin','doctor','nurse') ORDER BY name",
      )
      .all()
      // SQLite rows have a null prototype; React client props require plain objects.
      .map((row) => ({ ...row })) as unknown as Staff[]
  );
}
export function doctors() {
  return staff()
    .filter((s) => s.role === "doctor" && s.active)
    .map(({ id, name, registration }) => ({ id, name, registration }));
}
export function saveStaff(value: unknown, actor: Session) {
  const data = object(value),
    name = textField(data, "name", 100),
    email = textField(data, "email", 254).toLowerCase(),
    password = passwordField(data, "password"),
    registration = textField(data, "registration", 100);
  const role = data.role === "nurse" ? "nurse" : "doctor";
  if (data.role && !["doctor", "nurse"].includes(String(data.role)))
    throw new InputError("Choose doctor or nurse.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12)
    throw new InputError(
      "Use a valid email and a password of at least 12 characters.",
    );
  return transaction(() => {
    if (db().prepare("SELECT id FROM users WHERE email=?").get(email))
      throw new InputError("This email is already in use.", 409);
    const id = randomUUID();
    db()
      .prepare(
        "INSERT INTO users(id,email,password_hash,role,patient_id,name,registration) VALUES(?,?,?,?,NULL,?,?)",
      )
      .run(id, email, hashPassword(password), role, name, registration);
    audit(actor, "Created staff account", "staff", id);
    return id;
  });
}
export function setStaffActive(id: string, active: boolean, actor: Session) {
  transaction(() => {
    const target = db().prepare("SELECT role FROM users WHERE id=?").get(id);
    if (!target || !["doctor", "nurse"].includes(String(target.role)))
      throw new InputError(
        "Only doctor and nurse accounts can be changed here.",
        400,
      );
    db()
      .prepare("UPDATE users SET active=? WHERE id=?")
      .run(active ? 1 : 0, id);
    db().prepare("DELETE FROM sessions WHERE user_id=?").run(id);
    audit(
      actor,
      active ? "Enabled staff account" : "Disabled staff account",
      "staff",
      id,
    );
  });
}
const appointmentSelect = `SELECT a.id,a.patient_id AS patientId,json_extract(p.data,'$.name') AS patientName,a.doctor_id AS doctorId,u.name AS doctorName,a.starts_at AS startsAt,a.duration,a.reason,a.status,a.version FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=a.doctor_id`;
export function appointments(patientId?: string): Appointment[] {
  return db()
    .prepare(
      appointmentSelect +
        (patientId ? " WHERE a.patient_id=?" : "") +
        " ORDER BY a.starts_at DESC",
    )
    .all(...(patientId ? [patientId] : []))
    .map((row) => ({ ...row })) as unknown as Appointment[];
}
function validateSlot(data: Record<string, unknown>) {
  const local = textField(data, "localTime", 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new InputError("Choose an appointment date and time in IST.");
  const datePart = local.slice(0, 10);
  if (
    !Number.isFinite(Date.parse(local + ":00+05:30")) ||
    new Date(datePart).toISOString().slice(0, 10) !== datePart ||
    Number(local.slice(11, 13)) > 23 ||
    Number(local.slice(14)) > 59
  )
    throw new InputError("Invalid appointment date or time.");
  const startsAt = new Date(local + ":00+05:30").toISOString();
  if (Date.parse(startsAt) < Date.now() - 60000)
    throw new InputError("Choose a future appointment time.");
  const duration = Number(data.duration);
  if (![15, 30, 45, 60].includes(duration))
    throw new InputError("Choose 15, 30, 45 or 60 minutes.");
  return { startsAt, duration };
}
function checkConflict(
  patientId: string,
  doctorId: string,
  startsAt: string,
  duration: number,
  exclude = "",
) {
  const end = new Date(Date.parse(startsAt) + duration * 60000).toISOString();
  const conflict = db()
    .prepare(
      "SELECT id FROM appointments WHERE id<>? AND (doctor_id=? OR patient_id=?) AND status IN ('Scheduled','Checked in') AND starts_at<? AND julianday(starts_at) + duration/1440.0 > julianday(?)",
    )
    .get(exclude, doctorId, patientId, end, startsAt);
  if (conflict)
    throw new InputError(
      "The doctor or patient already has a confirmed appointment during this time.",
      409,
    );
}
export function createAppointment(value: unknown, user: Session) {
  const data = object(value),
    patientId =
      user.role === "patient"
        ? user.patientId!
        : textField(data, "patientId", 100),
    doctorId = textField(data, "doctorId", 100),
    reason = textField(data, "reason", 500);
  const slot = validateSlot(data);
  return transaction(() => {
    patientExists(patientId);
    if (!doctors().some((d) => d.id === doctorId))
      throw new InputError("Choose an active doctor.");
    if (
      user.role === "patient" &&
      Number(
        db()
          .prepare(
            "SELECT COUNT(*) AS n FROM appointments WHERE patient_id=? AND status='Requested'",
          )
          .get(patientId)?.n,
      ) >= 5
    )
      throw new InputError(
        "You already have five pending requests. Contact the hospital.",
        409,
      );
    checkConflict(patientId, doctorId, slot.startsAt, slot.duration);
    const id = randomUUID();
    db()
      .prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,1,?)")
      .run(
        id,
        patientId,
        doctorId,
        slot.startsAt,
        slot.duration,
        reason,
        user.role === "patient" ? "Requested" : "Scheduled",
        new Date().toISOString(),
      );
    audit(user, "Created appointment", "appointment", id);
    return id;
  });
}
export function updateAppointment(id: string, value: unknown, user: Session) {
  const data = object(value);
  return transaction(() => {
    const current = db()
      .prepare(appointmentSelect + " WHERE a.id=?")
      .get(id) as unknown as Appointment | undefined;
    if (!current) throw new InputError("Appointment not found.", 404);
    if (user.role === "patient" && current.patientId !== user.patientId)
      throw new InputError("Access denied.", 403);
    if (data.version !== current.version)
      throw new InputError("Appointment changed. Reload before updating.", 409);
    const status = textField(data, "status", 30);
    const allowed: Record<string, string[]> = {
      Requested: ["Scheduled", "Cancelled"],
      Scheduled: ["Scheduled", "Checked in", "Cancelled"],
      "Checked in": ["Completed", "Cancelled"],
      Completed: [],
      Cancelled: [],
    };
    if (!allowed[current.status].includes(status))
      throw new InputError("That appointment status change is not allowed.");
    if (
      user.role === "patient" &&
      (status !== "Cancelled" ||
        !["Requested", "Scheduled"].includes(current.status) ||
        Date.parse(current.startsAt) <= Date.now())
    )
      throw new InputError(
        "Please contact the hospital to change this appointment.",
        403,
      );
    let { startsAt, duration } = current;
    if (data.localTime && user.role !== "patient" && status === "Scheduled")
      ({ startsAt, duration } = validateSlot(data));
    if (status === "Scheduled") {
      if (!doctors().some((d) => d.id === current.doctorId))
        throw new InputError(
          "This doctor is unavailable. Cancel and book with an active doctor.",
        );
      if (Date.parse(startsAt) <= Date.now())
        throw new InputError("Choose a future time before confirming.");
      checkConflict(
        current.patientId,
        current.doctorId,
        startsAt,
        duration,
        id,
      );
    }
    db()
      .prepare(
        "UPDATE appointments SET status=?,starts_at=?,duration=?,version=version+1 WHERE id=?",
      )
      .run(status, startsAt, duration, id);
    audit(user, `Appointment ${status.toLowerCase()}`, "appointment", id);
  });
}
export function visits(patientId: string): Visit[] {
  return db()
    .prepare(
      "SELECT v.id,v.patient_id AS patientId,u.name AS doctorName,u.registration,v.visit_date AS visitDate,v.data,v.created_at AS createdAt FROM visits v JOIN users u ON u.id=v.doctor_id WHERE v.patient_id=? ORDER BY v.created_at DESC",
    )
    .all(patientId)
    .map((row) => {
      const { data, ...fields } = row;
      return { ...fields, ...JSON.parse(String(data)) } as Visit;
    });
}
export function addVisit(patientId: string, value: unknown, user: Session) {
  const data = object(value),
    doctorId =
      user.role === "doctor" ? user.userId : textField(data, "doctorId", 100);
  const complaint = textField(data, "complaint", 2000),
    diagnosis = textField(data, "diagnosis", 2000),
    notes = textField(data, "notes", 5000, false),
    vitals = textField(data, "vitals", 1000, false),
    followUp = textField(data, "followUp", 1000, false);
  if (!Array.isArray(data.medicines) || data.medicines.length > 30)
    throw new InputError("Use up to 30 medicines per visit.");
  const medicines: Medicine[] = data.medicines.map((m) => {
    const d = object(m);
    return {
      name: textField(d, "name"),
      dose: textField(d, "dose"),
      frequency: textField(d, "frequency"),
      duration: textField(d, "duration"),
      instructions: textField(d, "instructions", 500, false),
    };
  });
  return transaction(() => {
    patientExists(patientId);
    if (!doctors().some((d) => d.id === doctorId))
      throw new InputError("Select an active registered doctor.");
    const id = randomUUID(),
      now = new Date().toISOString();
    db().prepare("INSERT INTO visits VALUES(?,?,?,?,?,?)").run(
      id,
      patientId,
      doctorId,
      now,
      JSON.stringify({
        complaint,
        diagnosis,
        notes,
        vitals,
        medicines,
        followUp,
      }),
      now,
    );
    audit(user, "Recorded visit", "visit", id);
    return id;
  });
}
function encryptionKey(): Buffer {
  let key = process.env.PORTAL_REPORT_KEY;
  if (!key && demoEnabled()) {
    key = String(
      db()
        .prepare("SELECT value FROM settings WHERE key='demo_report_key'")
        .get()?.value || "",
    );
    if (!key) {
      key = randomBytes(32).toString("hex");
      db()
        .prepare("INSERT OR IGNORE INTO settings VALUES('demo_report_key',?)")
        .run(key);
      key = String(
        db()
          .prepare("SELECT value FROM settings WHERE key='demo_report_key'")
          .get()!.value,
      );
    }
  }
  if (!key || !/^[a-f0-9]{64}$/i.test(key))
    throw new InputError(
      "Report storage is not configured. Ask the administrator to set the encryption key.",
      503,
    );
  return Buffer.from(key, "hex");
}
export function reports(patientId: string): Report[] {
  return db()
    .prepare(
      "SELECT id,patient_id AS patientId,title,mime,size,created_at AS createdAt FROM reports WHERE patient_id=? ORDER BY created_at DESC",
    )
    .all(patientId)
    .map((row) => ({ ...row })) as unknown as Report[];
}
export function addReport(
  patientId: string,
  title: string,
  mime: string,
  bytes: Buffer,
  user: Session,
) {
  patientExists(patientId);
  if (!title.trim() || title.length > 150)
    throw new InputError("Enter a report title under 150 characters.");
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new InputError("Reports must be between 1 byte and 10 MB.", 413);
  const valid =
    (mime === "application/pdf" &&
      bytes.subarray(0, 5).toString() === "%PDF-") ||
    (mime === "image/png" &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mime === "image/jpeg" &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255);
  if (!valid)
    throw new InputError(
      "Choose a PDF, JPEG or PNG report matching its file type.",
      415,
    );
  const id = randomUUID(),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`${id}:${patientId}`));
  const content = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return transaction(() => {
    db()
      .prepare("INSERT INTO reports VALUES(?,?,?,?,?,?,?,?,?,?)")
      .run(
        id,
        patientId,
        title.trim(),
        mime,
        bytes.length,
        content,
        iv,
        cipher.getAuthTag(),
        user.userId,
        new Date().toISOString(),
      );
    audit(user, "Uploaded report", "report", id);
    return id;
  });
}
export function readReport(id: string, user: Session) {
  const row = db().prepare("SELECT * FROM reports WHERE id=?").get(id);
  if (!row) throw new InputError("Report not found.", 404);
  if (user.role === "patient" && user.patientId !== row.patient_id)
    throw new InputError("Access denied.", 403);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    row.iv as Uint8Array,
  );
  decipher.setAAD(Buffer.from(`${id}:${row.patient_id}`));
  decipher.setAuthTag(row.tag as Uint8Array);
  const content = Buffer.concat([
    decipher.update(row.content as Uint8Array),
    decipher.final(),
  ]);
  audit(user, "Downloaded report", "report", id);
  return { content, mime: String(row.mime) };
}
export function invoices(patientId?: string): Invoice[] {
  return db()
    .prepare(
      `SELECT i.id,i.number,i.patient_id AS patientId,json_extract(p.data,'$.name') AS patientName,i.items,i.total_paise AS totalPaise,COALESCE((SELECT SUM(amount_paise) FROM payments WHERE invoice_id=i.id),0) AS paidPaise,i.created_at AS createdAt FROM invoices i JOIN patients p ON p.id=i.patient_id ${patientId ? "WHERE i.patient_id=?" : ""} ORDER BY i.number DESC`,
    )
    .all(...(patientId ? [patientId] : []))
    .map((row) => ({
      ...row,
      items: JSON.parse(String(row.items)),
    })) as unknown as Invoice[];
}
export function createInvoice(value: unknown, user: Session) {
  const data = object(value),
    patientId = textField(data, "patientId", 100);
  if (
    !Array.isArray(data.items) ||
    !data.items.length ||
    data.items.length > 50
  )
    throw new InputError("Add 1–50 invoice items.");
  const items = data.items.map((item) => {
    const d = object(item),
      description = textField(d, "description");
    const amount = d.amount;
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10000000 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
    )
      throw new InputError(
        "Use positive amounts with no more than two decimal places.",
      );
    return { description, amount };
  });
  return transaction(() => {
    patientExists(patientId);
    const id = randomUUID(),
      number = Number(
        db()
          .prepare("SELECT COALESCE(MAX(number),0)+1 AS n FROM invoices")
          .get()!.n,
      );
    db()
      .prepare("INSERT INTO invoices VALUES(?,?,?,?,?,?,?)")
      .run(
        id,
        number,
        patientId,
        JSON.stringify(items),
        items.reduce((s, i) => s + Math.round(i.amount * 100), 0),
        user.userId,
        new Date().toISOString(),
      );
    audit(user, "Created invoice", "invoice", id);
    return id;
  });
}
export function recordPayment(id: string, value: unknown, user: Session) {
  const data = object(value),
    amount = data.amount,
    method = textField(data, "method", 30),
    reference = textField(data, "reference", 100, false);
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 10000000 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 ||
    !["Cash", "UPI", "Card", "Bank transfer"].includes(method)
  )
    throw new InputError("Enter a valid amount and payment method.");
  if (!reference)
    throw new InputError(
      "Enter a receipt number or bank/card/UPI transaction reference.",
    );
  transaction(() => {
    const invoice = invoices().find((i) => i.id === id);
    if (!invoice) throw new InputError("Invoice not found.", 404);
    if (
      db()
        .prepare(
          "SELECT id FROM payments WHERE invoice_id=? AND method=? AND reference=?",
        )
        .get(id, method, reference)
    )
      throw new InputError(
        "This receipt or transaction has already been recorded.",
        409,
      );
    const paise = Math.round(amount * 100);
    if (paise > invoice.totalPaise - invoice.paidPaise)
      throw new InputError("Payment exceeds the remaining balance.", 409);
    db()
      .prepare("INSERT INTO payments VALUES(?,?,?,?,?,?,?)")
      .run(
        randomUUID(),
        id,
        paise,
        method,
        reference,
        user.userId,
        new Date().toISOString(),
      );
    audit(user, "Recorded payment", "invoice", id);
  });
}
export function careData(patientId: string, user: Session): CareData {
  patientExists(patientId);
  if (user.role === "patient" && user.patientId !== patientId)
    throw new InputError("Access denied.", 403);
  audit(user, "Viewed patient history", "patient", patientId);
  return {
    appointments: appointments(patientId),
    visits: visits(patientId),
    reports: reports(patientId),
    invoices:
      user.role === "admin" || user.role === "patient"
        ? invoices(patientId)
        : [],
  };
}
