"use client";
import Link from "next/link";
import { useState } from "react";
import type { CareData, Medicine, Session } from "@/lib/types";
import { dateTimeLabel, money } from "@/lib/format";
import { WorkflowForm, Field, TextArea, value } from "./workflow-form";
import { AppointmentWorkspace, type Choice } from "./appointments";
import { T } from "./language";
const blankMedicine = (): Medicine => ({
  name: "",
  dose: "",
  frequency: "",
  duration: "",
  instructions: "",
});
function VisitForm({
  patientId,
  doctors,
  role,
}: {
  patientId: string;
  doctors: Choice[];
  role: Session["role"];
}) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const enteredMedicines = medicines.filter((medicine) =>
    Object.values(medicine).some((field) => field.trim()),
  );
  return (
    <WorkflowForm
      url={`/api/patients/${patientId}/visits`}
      label="Record visit"
      beforeSubmit={() =>
        enteredMedicines.length > 0 ||
        window.confirm(
          "Are you sure you want to continue without adding medicines?\n\nమందులు జోడించకుండా కొనసాగించాలనుకుంటున్నారా?",
        )
      }
      payload={(d) => ({
        doctorId: value(d, "doctorId"),
        complaint: value(d, "complaint"),
        diagnosis: value(d, "diagnosis"),
        vitals: value(d, "vitals"),
        notes: value(d, "notes"),
        followUp: value(d, "followUp"),
        medicines: enteredMedicines,
      })}
    >
      <div className="form-grid">
        {role === "admin" && (
          <label>
            <T>Doctor</T>
            <select name="doctorId" required>
              <option value="">Select treating doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Field label="Complaint" name="complaint" maxLength={2000} />
        <Field label="Diagnosis" name="diagnosis" maxLength={2000} />
        <Field
          label="Vitals"
          name="vitals"
          required={false}
          placeholder="BP, pulse, temperature, SpO₂ (with units)"
        />
        <TextArea label="Care notes" name="notes" required={false} />
        <TextArea
          label="Follow-up instructions"
          name="followUp"
          required={false}
        />
      </div>
      <h3>
        <T>Medicines</T>
      </h3>
      <p className="muted">
        Medicines are optional. Empty medicine rows are ignored. / మందులు
        జోడించడం ఐచ్ఛికం.
      </p>
      {medicines.map((m, i) => (
        <div className="medicine-form" key={i}>
          {(
            [
              ["name", "Medicine"],
              ["dose", "Dose"],
              ["frequency", "Frequency"],
              ["duration", "Duration"],
              ["instructions", "Instructions"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <T>{label}</T>
              <input
                required={
                  key !== "instructions" &&
                  Object.values(m).some((field) => field.trim())
                }
                maxLength={key === "instructions" ? 500 : 200}
                value={m[key]}
                onChange={(e) =>
                  setMedicines(
                    medicines.map((item, index) =>
                      index === i ? { ...item, [key]: e.target.value } : item,
                    ),
                  )
                }
              />
            </label>
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              setMedicines(medicines.filter((_, index) => index !== i))
            }
          >
            <T>Remove</T>
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={medicines.length >= 30}
        onClick={() => setMedicines([...medicines, blankMedicine()])}
      >
        <T>Add medicine</T>
      </button>
      <p className="muted">
        Confirm all details before saving. Visits are retained as history; enter
        a new visit to document a correction. / సేవ్ చేసే ముందు వివరాలు
        నిర్ధారించండి.
      </p>
    </WorkflowForm>
  );
}
function ReportUpload({ patientId }: { patientId: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="workflow-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const d = new FormData(e.currentTarget),
          file = d.get("file") as File;
        try {
          if (!file.size || file.size > 10 * 1024 * 1024)
            throw new Error("Choose a PDF, JPEG or PNG under 10 MB.");
          const response = await fetch(
            `/api/patients/${patientId}/reports?title=${encodeURIComponent(value(d, "title"))}`,
            {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            },
          );
          if (!response.ok) throw new Error((await response.json()).error);
          window.location.reload();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
          setBusy(false);
        }
      }}
    >
      <Field label="Report title" name="title" maxLength={150} />
      <label>
        <T>Choose file</T>
        <input
          name="file"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          required
        />
      </label>
      <small>PDF / JPEG / PNG · maximum 10 MB · private patient access</small>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        <T>{busy ? "Saving…" : "Upload report"}</T>
      </button>
    </form>
  );
}
export function CareWorkspace({
  patientId,
  data,
  doctors,
  role,
  patientName,
}: {
  patientId: string;
  data: CareData;
  doctors: Choice[];
  role: Session["role"];
  patientName: string;
}) {
  const patient = role === "patient";
  return (
    <div className="workflow-stack">
      <AppointmentWorkspace
        records={data.appointments}
        patients={[{ id: patientId, name: patientName }]}
        doctors={doctors}
        patient={patient}
      />
      {(role === "admin" || role === "doctor") && (
        <details className="panel workflow-panel">
          <summary>
            <T>Add visit</T>
          </summary>
          <p className="notice">
            For a shared-queue consultation with pharmacy and lab orders, use{" "}
            <Link href="/admin/workflow">Live workflow</Link>. This form records
            a standalone visit only.
          </p>
          <VisitForm patientId={patientId} doctors={doctors} role={role} />
        </details>
      )}
      <section className="panel workflow-panel">
        <div className="panel-heading">
          <h2>
            <T>Visit history</T>
          </h2>
          <button
            className="button secondary no-print"
            onClick={() => window.print()}
          >
            <T>Print</T>
          </button>
        </div>
        {data.visits.length ? (
          data.visits.map((v) => (
            <article className="workflow-card print-record" key={v.id}>
              <h3>
                {dateTimeLabel(v.visitDate)} IST · {v.doctorName}
              </h3>
              <p className="muted">Registration: {v.registration}</p>
              <dl className="clinical-details">
                <div>
                  <dt>
                    <T>Complaint</T>
                  </dt>
                  <dd>{v.complaint}</dd>
                </div>
                <div>
                  <dt>
                    <T>Diagnosis</T>
                  </dt>
                  <dd>{v.diagnosis}</dd>
                </div>
                {v.vitals && (
                  <div>
                    <dt>
                      <T>Vitals</T>
                    </dt>
                    <dd>{v.vitals}</dd>
                  </div>
                )}
                {v.notes && (
                  <div>
                    <dt>
                      <T>Care notes</T>
                    </dt>
                    <dd>{v.notes}</dd>
                  </div>
                )}
              </dl>
              {v.medicines.length > 0 && (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Medicine",
                          "Dose",
                          "Frequency",
                          "Duration",
                          "Instructions",
                        ].map((h) => (
                          <th key={h}>
                            <T>{h}</T>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {v.medicines.map((m, i) => (
                        <tr key={i}>
                          <td>{m.name}</td>
                          <td>{m.dose}</td>
                          <td>{m.frequency}</td>
                          <td>{m.duration}</td>
                          <td>{m.instructions || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {v.followUp && (
                <p className="care-text">
                  <strong>
                    <T>Follow-up instructions</T>:{" "}
                  </strong>
                  {v.followUp}
                </p>
              )}
            </article>
          ))
        ) : (
          <p className="muted">
            <T>No records yet</T>
          </p>
        )}
      </section>
      <section className="panel workflow-panel">
        <h2>
          <T>Report files</T>
        </h2>
        {!patient && (
          <details className="compact-details">
            <summary>
              <T>Upload report</T>
            </summary>
            <ReportUpload patientId={patientId} />
          </details>
        )}
        {data.reports.map((r) => (
          <div className="workflow-card report-row" key={r.id}>
            <div>
              <strong>{r.title}</strong>
              <p className="muted">
                {dateTimeLabel(r.createdAt)} · {Math.ceil(r.size / 1024)} KB
              </p>
            </div>
            <a className="button secondary" href={`/api/reports/${r.id}`}>
              <T>Download</T>
            </a>
          </div>
        ))}
        {!data.reports.length && (
          <p className="muted">
            <T>No records yet</T>
          </p>
        )}
      </section>
      {(patient || role === "admin") && (
        <section className="panel workflow-panel">
          <h2>
            <T>Invoices</T>
          </h2>
          {data.invoices.map((i) => (
            <article className="workflow-card" key={i.id}>
              <h3>SAH-{String(i.number).padStart(6, "0")}</h3>
              {i.items.map((item, index) => (
                <p key={index}>
                  {item.description}: {money(item.amount)}
                </p>
              ))}
              <p>
                <T>Paid</T>: {money(i.paidPaise / 100)} · <T>Outstanding</T>:{" "}
                {money((i.totalPaise - i.paidPaise) / 100)}
              </p>
            </article>
          ))}
          {!data.invoices.length && (
            <p className="muted">
              <T>No records yet</T>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
