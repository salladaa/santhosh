"use client";
import type { Admission, Bed, Session } from "@/lib/types";
import type { Choice } from "./appointments";
import { WorkflowForm, Field, TextArea, value } from "./workflow-form";
import { dateTimeLabel } from "@/lib/format";
import { T } from "./language";
export function InpatientWorkspace({
  records,
  beds,
  patients,
  doctors,
  role,
}: {
  records: Admission[];
  beds: Bed[];
  patients: Choice[];
  doctors: Choice[];
  role: Session["role"];
}) {
  return (
    <div className="workflow-stack">
      {role === "admin" && (
        <div className="record-grid">
          <details className="panel workflow-panel">
            <summary>
              <T>Add bed</T>
            </summary>
            <WorkflowForm
              url="/api/beds"
              label="Add bed"
              payload={(d) => ({
                ward: value(d, "ward"),
                label: value(d, "label"),
              })}
            >
              <Field label="Ward" name="ward" maxLength={80} />
              <Field label="Bed number" name="label" maxLength={30} />
            </WorkflowForm>
          </details>
          <details className="panel workflow-panel">
            <summary>
              <T>Admit patient</T>
            </summary>
            <WorkflowForm
              url="/api/admissions"
              label="Admit patient"
              payload={(d) => ({
                patientId: value(d, "patientId"),
                bedId: value(d, "bedId"),
                doctorId: value(d, "doctorId"),
                reason: value(d, "reason"),
              })}
            >
              <label>
                <T>Patient</T>
                <select name="patientId" required>
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <T>Beds</T>
                <select name="bedId" required>
                  <option value="">Select available bed</option>
                  {beds
                    .filter((b) => !b.occupied)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.ward} · {b.label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <T>Doctor</T>
                <select name="doctorId" required>
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <TextArea label="Reason" name="reason" />
            </WorkflowForm>
          </details>
        </div>
      )}
      {role !== "patient" && (
        <section className="panel workflow-panel">
          <h2>
            <T>Beds</T>
          </h2>
          <div className="bed-grid">
            {beds.map((b) => (
              <div
                className={`bed-card ${b.occupied ? "occupied" : ""}`}
                key={b.id}
              >
                <strong>
                  {b.ward} · {b.label}
                </strong>
                <span>
                  <T>{b.occupied ? "Occupied" : "Available"}</T>
                </span>
              </div>
            ))}
          </div>
          {!beds.length && (
            <p>
              <T>No records yet</T>
            </p>
          )}
        </section>
      )}
      <section className="panel workflow-panel">
        <h2>
          <T>Admission history</T>
        </h2>
        {records.map((a) => (
          <article className="workflow-card" key={a.id}>
            <h3>
              {a.patientName} · {a.ward} / {a.bed}
            </h3>
            <p>
              <T>{a.dischargedAt ? "Discharged" : "Admitted"}</T> ·{" "}
              {a.doctorName}
            </p>
            <p className="muted">
              {dateTimeLabel(a.admittedAt)} IST
              {a.dischargedAt ? ` → ${dateTimeLabel(a.dischargedAt)} IST` : ""}
            </p>
            <p>{a.reason}</p>
            {a.dischargeSummary && (
              <div className="care-text">
                <strong>
                  <T>Discharge summary</T>
                </strong>
                <p>{a.dischargeSummary}</p>
              </div>
            )}
            <details className="compact-details">
              <summary>
                <T>Nursing notes</T> ({a.notes.length})
              </summary>
              {a.notes.map((n) => (
                <div className="nursing-note" key={n.id}>
                  <p>{n.observations}</p>
                  <small>
                    {n.author} · {dateTimeLabel(n.createdAt)} IST
                  </small>
                </div>
              ))}
            </details>
            {!a.dischargedAt && role !== "patient" && (
              <details className="compact-details">
                <summary>
                  <T>Add nursing note</T>
                </summary>
                <WorkflowForm
                  url={`/api/admissions/${a.id}/notes`}
                  label="Add nursing note"
                  payload={(d) => ({ observations: value(d, "observations") })}
                >
                  <TextArea name="observations" label="Observations" />
                </WorkflowForm>
              </details>
            )}
            {!a.dischargedAt && (role === "doctor" || role === "admin") && (
              <details className="compact-details">
                <summary>
                  <T>Discharge patient</T>
                </summary>
                <WorkflowForm
                  url={`/api/admissions/${a.id}/discharge`}
                  label="Discharge patient"
                  payload={(d) => ({
                    summary: value(d, "summary"),
                    version: a.version,
                  })}
                >
                  <TextArea label="Discharge summary" name="summary" />
                  <label className="checkbox-label">
                    <input type="checkbox" required />I confirm the discharge
                    details and follow-up instructions are complete. /
                    డిశ్చార్జ్ వివరాలు నిర్ధారించాను.
                  </label>
                </WorkflowForm>
              </details>
            )}
          </article>
        ))}
        {!records.length && (
          <p className="muted">
            <T>No records yet</T>
          </p>
        )}
      </section>
    </div>
  );
}
