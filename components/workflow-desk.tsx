"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session, Medicine } from "@/lib/types";
import type {
  WorkflowSnapshot,
  Encounter,
  LabOrder,
  PharmacyOrder,
} from "@/lib/workflow-types";
import { WorkflowForm, Field, TextArea, value } from "./workflow-form";
import { dateTimeLabel } from "@/lib/format";
import { T } from "./language";
const blankMedicine = (): Medicine => ({
  name: "",
  dose: "",
  frequency: "",
  duration: "",
  instructions: "",
});
function useWorkflow() {
  const [data, setData] = useState<WorkflowSnapshot | null>(null),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/workflow", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) setData(null);
        throw new Error(
          response.status === 401
            ? "Session ended. Sign in again."
            : "Unable to update this queue.",
        );
      }
      const next = (await response.json()) as WorkflowSnapshot;
      setData((previous) =>
        !previous || next.checkedAt >= previous.checkedAt ? next : previous,
      );
      setError("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Connection interrupted.",
      );
    }
  }, []);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await refresh();
      if (!stopped) timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [refresh]);
  return { data, error, refresh };
}
function Status({
  data,
  error,
}: {
  data: WorkflowSnapshot | null;
  error: string;
}) {
  return (
    <div className={error ? "error-box" : "notice"} role="status">
      {error
        ? `Updates interrupted — displayed records may be outdated. ${error}`
        : data
          ? `Connected · checks every 3 seconds · last update ${dateTimeLabel(data.checkedAt)} IST`
          : "Connecting to hospital queue…"}
    </div>
  );
}
function Action({
  action,
  id,
  version,
  label,
  refresh,
  extra = {},
}: {
  action: string;
  id: string;
  version: number;
  label: string;
  refresh: () => void;
  extra?: Record<string, unknown>;
}) {
  return (
    <WorkflowForm
      url="/api/workflow"
      payload={() => ({ action, id, version, ...extra })}
      label={label}
      onSuccess={refresh}
    >
      <span className="muted">Changes are shared after confirmation.</span>
    </WorkflowForm>
  );
}
function Consultation({
  encounter,
  refresh,
}: {
  encounter: Encounter;
  refresh: () => void;
}) {
  const [medicines, setMedicines] = useState<Medicine[]>([]),
    [tests, setTests] = useState<{ name: string; instructions: string }[]>([]);
  const entered = medicines.filter((m) =>
    Object.values(m).some((v) => v.trim()),
  );
  const labTests = tests.filter((t) => t.name.trim() || t.instructions.trim());
  return (
    <details className="workflow-panel">
      <summary>Record consultation and department orders</summary>
      <WorkflowForm
        url="/api/workflow"
        label="Confirm and send orders"
        onSuccess={refresh}
        beforeSubmit={() =>
          window.confirm(
            entered.length
              ? "Confirm this consultation and send the prescription and lab orders?"
              : "Are you sure you want to continue without adding medicines? Any lab orders will still be sent.\nమందులు జోడించకుండా కొనసాగించాలనుకుంటున్నారా?",
          )
        }
        payload={(d) => ({
          action: "confirm",
          id: encounter.id,
          version: encounter.version,
          complaint: encounter.complaint,
          diagnosis: value(d, "diagnosis"),
          vitals: value(d, "vitals"),
          notes: value(d, "notes"),
          followUp: value(d, "followUp"),
          medicines: entered,
          labTests,
        })}
      >
        <p className="muted">
          Draft entries stay on this tablet until you confirm. Keep this page
          open while editing.
        </p>
        <div className="form-grid">
          <Field name="diagnosis" label="Diagnosis" maxLength={2000} />
          <Field
            name="vitals"
            label="Vitals"
            required={false}
            maxLength={1000}
          />
          <TextArea name="notes" label="Care notes" required={false} />
          <TextArea
            name="followUp"
            label="Follow-up instructions"
            required={false}
          />
        </div>
        <h3>
          <T>Medicines</T> (optional)
        </h3>
        {medicines.map((m, i) => (
          <div key={i} className="medicine-form">
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
                  value={m[key]}
                  maxLength={key === "instructions" ? 500 : 200}
                  required={
                    key !== "instructions" &&
                    Object.values(m).some((v) => !!v.trim())
                  }
                  onChange={(e) =>
                    setMedicines(
                      medicines.map((item, n) =>
                        n === i ? { ...item, [key]: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() => setMedicines(medicines.filter((_, n) => n !== i))}
            >
              Remove medicine
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={medicines.length >= 30}
          onClick={() => setMedicines([...medicines, blankMedicine()])}
        >
          Add medicine
        </button>
        <h3>Lab tests (optional)</h3>
        {tests.map((t, i) => (
          <div className="form-grid workflow-card" key={i}>
            <label>
              Test name
              <input
                value={t.name}
                required={!!t.name.trim() || !!t.instructions.trim()}
                maxLength={200}
                onChange={(e) =>
                  setTests(
                    tests.map((item, n) =>
                      n === i ? { ...item, name: e.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <label>
              Instructions
              <input
                value={t.instructions}
                maxLength={1000}
                onChange={(e) =>
                  setTests(
                    tests.map((item, n) =>
                      n === i
                        ? { ...item, instructions: e.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <button
              className="button secondary"
              type="button"
              onClick={() => setTests(tests.filter((_, n) => n !== i))}
            >
              Remove test
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          type="button"
          disabled={tests.length >= 20}
          onClick={() => setTests([...tests, { name: "", instructions: "" }])}
        >
          Add lab test
        </button>
      </WorkflowForm>
    </details>
  );
}
function Labs({
  orders,
  role,
  refresh,
}: {
  orders: LabOrder[];
  role: Session["role"];
  refresh: () => void;
}) {
  return (
    <section className="panel workflow-panel">
      <h2>
        <T>Laboratory orders</T>
      </h2>
      {!orders.length && <p>No lab orders yet.</p>}
      {orders.map((order) => (
        <article className="workflow-card" key={order.id}>
          <h3>
            {order.patientName} · {order.testName}
          </h3>
          <p className="muted">
            Age {order.age} · Patient {order.patientId} · Visit{" "}
            {order.encounterId}
          </p>
          <p>
            <strong>{order.status}</strong> · {order.instructions}
          </p>
          {order.result && <p className="clinical-note">{order.result}</p>}
          {role === "lab" &&
            ["Ordered", "Collected", "In progress"].includes(order.status) && (
              <WorkflowForm
                url="/api/workflow"
                onSuccess={refresh}
                label={
                  order.status === "Ordered"
                    ? "Mark sample collected"
                    : order.status === "Collected"
                      ? "Start test"
                      : "Submit result to doctor"
                }
                beforeSubmit={() =>
                  order.status !== "In progress" ||
                  window.confirm(
                    "Confirm this result and send it to the doctor?",
                  )
                }
                payload={(d) => ({
                  action: "lab",
                  id: order.id,
                  version: order.version,
                  status:
                    order.status === "Ordered"
                      ? "Collected"
                      : order.status === "Collected"
                        ? "In progress"
                        : "Completed",
                  result: value(d, "result"),
                })}
              >
                {order.status === "In progress" ? (
                  <TextArea
                    name="result"
                    label="Result (include units and reference ranges)"
                  />
                ) : (
                  <p className="muted">
                    Verify the patient and ordered test before continuing.
                  </p>
                )}
              </WorkflowForm>
            )}
          {["admin", "doctor"].includes(role) &&
            order.status === "Completed" && (
              <Action
                action="lab"
                id={order.id}
                version={order.version}
                label="Release result to patient"
                extra={{ status: "Released" }}
                refresh={refresh}
              />
            )}
        </article>
      ))}
    </section>
  );
}
function Pharmacy({
  orders,
  role,
  refresh,
}: {
  orders: PharmacyOrder[];
  role: Session["role"];
  refresh: () => void;
}) {
  return (
    <section className="panel workflow-panel">
      <h2>
        <T>Pharmacy queue</T>
      </h2>
      {!orders.length && <p>No prescriptions awaiting preparation.</p>}
      {orders.map((order) => (
        <article className="workflow-card" key={order.id}>
          <h3>
            {order.patientName} · {order.status}
          </h3>
          <p className="muted">
            Age {order.age} · Patient {order.patientId} · Prescribed by{" "}
            {order.doctorName} · Visit {order.encounterId}
          </p>
          <p className="notice">
            Recorded allergies:{" "}
            {order.allergies || "Not recorded — verify with patient"}
          </p>
          {order.medicines.map((m, i) => (
            <p key={i}>
              <strong>{m.name}</strong> · {m.dose} · {m.frequency} ·{" "}
              {m.duration}
              <br />
              {m.instructions}
            </p>
          ))}
          {order.note && <p>{order.note}</p>}
          {role === "pharmacy" && order.status !== "Dispensed" && (
            <WorkflowForm
              url="/api/workflow"
              onSuccess={refresh}
              label={
                order.status === "Pending"
                  ? "Start preparation"
                  : order.status === "Preparing"
                    ? "Mark ready"
                    : "Confirm dispensed"
              }
              beforeSubmit={() =>
                order.status !== "Ready" ||
                window.confirm(
                  "Confirm the patient identity and that these medicines have been dispensed?",
                )
              }
              payload={(d) => ({
                action: "pharmacy",
                id: order.id,
                version: order.version,
                status:
                  order.status === "Pending"
                    ? "Preparing"
                    : order.status === "Preparing"
                      ? "Ready"
                      : "Dispensed",
                note: value(d, "note"),
              })}
            >
              <Field
                label="Preparation / dispensing note"
                name="note"
                required={false}
                maxLength={1000}
              />
            </WorkflowForm>
          )}
        </article>
      ))}
    </section>
  );
}
export function WorkflowDesk({ user }: { user: Session }) {
  const { data, error, refresh } = useWorkflow();
  const front = ["admin", "reception"].includes(user.role),
    clinical = ["admin", "doctor"].includes(user.role);
  return (
    <div className="workflow-stack">
      <Status data={data} error={error} />
      {data && (
        <>
          {front && (
            <>
              <details className="panel workflow-panel">
                <summary>
                  <T>Register patient</T>
                </summary>
                <WorkflowForm
                  url="/api/workflow/patients"
                  label="Register patient"
                  onSuccess={refresh}
                  payload={(d) => ({
                    name: value(d, "name"),
                    age: Number(value(d, "age")),
                    phone: value(d, "phone"),
                    email: value(d, "email"),
                    password: value(d, "password"),
                    address: value(d, "address"),
                    allergies: value(d, "allergies"),
                    emergencyContact: value(d, "emergencyContact"),
                  })}
                >
                  <div className="form-grid">
                    <Field name="name" label="Full name" maxLength={100} />
                    <label>
                      Age
                      <input
                        type="number"
                        name="age"
                        min={0}
                        max={120}
                        step={1}
                        required
                      />
                    </label>
                    <Field name="phone" label="Phone number" maxLength={30} />
                    <Field
                      name="email"
                      label="Email address"
                      type="email"
                      maxLength={254}
                    />
                    <Field
                      name="password"
                      label="Patient password (12+ characters)"
                      type="password"
                      maxLength={128}
                    />
                    <Field
                      name="address"
                      label="Address"
                      required={false}
                      maxLength={1000}
                    />
                    <Field
                      name="emergencyContact"
                      label="Emergency contact"
                      required={false}
                      maxLength={200}
                    />
                    <Field
                      name="allergies"
                      label="Allergies"
                      required={false}
                      maxLength={1000}
                    />
                  </div>
                  <p className="muted">
                    After registration, select the patient below to send their
                    visit to the doctors.
                  </p>
                </WorkflowForm>
              </details>
              <section className="panel workflow-panel">
                <h2>
                  <T>Send to doctor</T>
                </h2>
                <WorkflowForm
                  url="/api/workflow"
                  label="Send to doctor"
                  onSuccess={refresh}
                  payload={(d) => ({
                    action: "intake",
                    patientId: value(d, "patientId"),
                    complaint: value(d, "complaint"),
                    notes: value(d, "notes"),
                  })}
                >
                  <label>
                    <T>Patient</T>
                    <select name="patientId" required>
                      <option value="">Select registered patient</option>
                      {data.patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.age} · {p.phone} · {p.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextArea
                    name="complaint"
                    label="Problem / reason for visit"
                  />
                  <TextArea
                    name="notes"
                    label="Reception notes"
                    required={false}
                  />
                  <p className="muted">
                    Either doctor can pick up this patient. No doctor assignment
                    is needed here.
                  </p>
                </WorkflowForm>
              </section>
            </>
          )}
          {(front || clinical || user.role === "nurse") && (
            <section className="panel workflow-panel">
              <h2>
                <T>Shared doctor queue</T>
              </h2>
              <p>
                {data.encounters.filter((e) => e.status === "Waiting").length}{" "}
                waiting ·{" "}
                {
                  data.encounters.filter((e) => e.status === "In consultation")
                    .length
                }{" "}
                with a doctor
              </p>
              {!data.encounters.length && <p>No patients in the queue yet.</p>}
              {data.encounters.map((e) => (
                <article className="workflow-card" key={e.id}>
                  <h3>
                    {e.patientName} · {e.status}
                  </h3>
                  <p className="muted">
                    Age {e.age} · Patient {e.patientId} · Arrived{" "}
                    {dateTimeLabel(e.createdAt)} IST
                  </p>
                  <p>
                    <strong>Problem:</strong> {e.complaint}
                  </p>
                  <p>{e.intakeNotes}</p>
                  <p>Recorded allergies: {e.allergies || "Not recorded"}</p>
                  {e.doctorName && (
                    <p>
                      Doctor: <strong>{e.doctorName}</strong>
                    </p>
                  )}
                  {clinical && (
                    <Link href={`/admin/patients/${e.patientId}`}>
                      Open patient history
                    </Link>
                  )}
                  {user.role === "doctor" && e.status === "Waiting" && (
                    <Action
                      action="claim"
                      id={e.id}
                      version={e.version}
                      label="Claim patient"
                      refresh={refresh}
                    />
                  )}
                  {user.role === "doctor" &&
                    e.doctorId === user.userId &&
                    e.status === "In consultation" && (
                      <Consultation encounter={e} refresh={refresh} />
                    )}
                  {e.status === "In consultation" &&
                    (user.role === "admin" || e.doctorId === user.userId) && (
                      <Action
                        action="release"
                        id={e.id}
                        version={e.version}
                        label="Return to shared queue"
                        refresh={refresh}
                      />
                    )}
                </article>
              ))}
            </section>
          )}
          {(clinical || user.role === "lab") && (
            <Labs orders={data.labs} role={user.role} refresh={refresh} />
          )}
          {(clinical || user.role === "pharmacy") && (
            <Pharmacy
              orders={data.pharmacy}
              role={user.role}
              refresh={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}
export function PatientOrders() {
  const { data, error, refresh } = useWorkflow();
  return (
    <div className="workflow-stack">
      <h2>Lab results and medicine preparation</h2>
      <Status data={data} error={error} />
      {data && (
        <>
          <Labs orders={data.labs} role="patient" refresh={refresh} />
          <Pharmacy orders={data.pharmacy} role="patient" refresh={refresh} />
        </>
      )}
    </div>
  );
}
