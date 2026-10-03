"use client";
import { useState } from "react";
import type { Appointment } from "@/lib/types";
import { dateTimeLabel } from "@/lib/format";
import { Badge, Empty } from "./ui";
import { WorkflowForm, Field, value } from "./workflow-form";
import { T } from "./language";
export type Choice = { id: string; name: string };
export function AppointmentWorkspace({
  records,
  patients,
  doctors,
  patient = false,
}: {
  records: Appointment[];
  patients: Choice[];
  doctors: Choice[];
  patient?: boolean;
}) {
  const [filter, setFilter] = useState("All");
  return (
    <div className="workflow-stack">
      <details className="panel workflow-panel" open={records.length === 0}>
        <summary>
          <T>{patient ? "Request appointment" : "Book appointment"}</T>
        </summary>
        {doctors.length ? (
          <WorkflowForm
            url="/api/appointments"
            label={patient ? "Request appointment" : "Book appointment"}
            payload={(d) => ({
              patientId: value(d, "patientId"),
              doctorId: value(d, "doctorId"),
              localTime: value(d, "localTime"),
              duration: Number(value(d, "duration")),
              reason: value(d, "reason"),
            })}
          >
            <div className="form-grid">
              {!patient && (
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
              )}
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
              <Field
                label="Date and time (IST)"
                name="localTime"
                type="datetime-local"
              />
              <label>
                <T>Duration (minutes)</T>
                <select name="duration">
                  <option>15</option>
                  <option>30</option>
                  <option>45</option>
                  <option>60</option>
                </select>
              </label>
              <Field label="Reason" name="reason" />
            </div>
            {patient && (
              <p className="muted">
                Requests are confirmed by the hospital. / ఆసుపత్రి నిర్ధారించిన
                తర్వాత మాత్రమే అపాయింట్‌మెంట్ ఖరారు అవుతుంది.
              </p>
            )}
          </WorkflowForm>
        ) : (
          <p className="muted">
            No active doctors yet. The administrator must add a doctor account
            first.
          </p>
        )}
      </details>
      <section className="panel workflow-panel">
        <div className="panel-heading">
          <h2>
            <T>Appointment history</T>
          </h2>
          <select
            aria-label="Filter appointments"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: "auto" }}
          >
            {[
              "All",
              "Requested",
              "Scheduled",
              "Checked in",
              "Completed",
              "Cancelled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {records
          .filter((r) => filter === "All" || r.status === filter)
          .map((r) => (
            <article className="workflow-card" key={r.id}>
              <div className="record-title">
                <h3>
                  {r.patientName} · {r.doctorName}
                </h3>
                <Badge value={r.status} />
              </div>
              <p>
                <strong>{dateTimeLabel(r.startsAt)} IST</strong> · {r.duration}{" "}
                min
              </p>
              <p className="muted">{r.reason}</p>
              {!["Completed", "Cancelled"].includes(r.status) &&
                (!patient || ["Requested", "Scheduled"].includes(r.status)) && (
                  <details className="compact-details">
                    <summary>
                      <T>{patient ? "Cancel" : "Save"}</T>
                    </summary>
                    <WorkflowForm
                      url={`/api/appointments/${r.id}`}
                      method="PUT"
                      payload={(d) => ({
                        version: r.version,
                        status: value(d, "status"),
                        localTime: value(d, "localTime"),
                        duration: Number(value(d, "duration")),
                      })}
                    >
                      <div className="form-grid">
                        <label>
                          Status
                          <select name="status">
                            {(patient
                              ? ["Cancelled"]
                              : r.status === "Requested"
                                ? ["Scheduled", "Cancelled"]
                                : r.status === "Scheduled"
                                  ? ["Scheduled", "Checked in", "Cancelled"]
                                  : ["Completed", "Cancelled"]
                            ).map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                        {!patient &&
                          ["Requested", "Scheduled"].includes(r.status) && (
                            <>
                              <Field
                                label="Date and time (IST)"
                                name="localTime"
                                type="datetime-local"
                                required={false}
                              />
                              <label>
                                <T>Duration (minutes)</T>
                                <select
                                  name="duration"
                                  defaultValue={r.duration}
                                >
                                  {[15, 30, 45, 60].map((n) => (
                                    <option key={n}>{n}</option>
                                  ))}
                                </select>
                              </label>
                            </>
                          )}
                      </div>
                    </WorkflowForm>
                  </details>
                )}
            </article>
          ))}
        {!records.length && (
          <Empty
            title="No records yet"
            text="Book a visit or request an appointment to get started."
          />
        )}
      </section>
    </div>
  );
}
