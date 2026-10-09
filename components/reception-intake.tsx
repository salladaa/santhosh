"use client";
import { useEffect, useRef, useState } from "react";
import type { ReceptionPatient } from "@/lib/workflow-types";
import { dateTimeLabel } from "@/lib/format";
import { WorkflowForm } from "./workflow-form";
import { T } from "./language";

const indiaDate = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
function lastSeen(value: string | null, checkedAt: string) {
  if (!value) return "No recorded visits";
  const day = indiaDate(value),
    today = indiaDate(checkedAt);
  const yesterday = indiaDate(
    new Date(Date.parse(checkedAt) - 86400000).toISOString(),
  );
  return `${day === today ? "Today · " : day === yesterday ? "Yesterday · " : ""}${dateTimeLabel(value)} IST`;
}
export function ReceptionIntake({
  patients,
  checkedAt,
  refresh,
}: {
  patients: ReceptionPatient[];
  checkedAt: string;
  refresh: () => void;
}) {
  const [search, setSearch] = useState(""),
    [selectedId, setSelectedId] = useState("");
  const [complaint, setComplaint] = useState(""),
    [notes, setNotes] = useState("");
  const [notice, setNotice] = useState(""),
    [limit, setLimit] = useState(20);
  const [sending, setSending] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (notice && !sending) searchInput.current?.focus();
  }, [notice, sending]);
  const selected = patients.find((p) => p.id === selectedId);
  const needle = search.trim().toLowerCase(),
    digits = needle.replace(/\D/g, "");
  const matches = patients.filter(
    (p) =>
      `${p.name} ${p.phone} ${p.id}`.toLowerCase().includes(needle) ||
      (digits.length >= 3 &&
        !/[a-z]/i.test(needle) &&
        p.phone.replace(/\D/g, "").includes(digits)),
  );
  function choose(patient: ReceptionPatient) {
    if (sending || patient.id === selectedId) return;
    if (
      (complaint.trim() || notes.trim()) &&
      !window.confirm(
        "Switch patients and discard these unsent reception notes?",
      )
    )
      return;
    setSelectedId(patient.id);
    setComplaint("");
    setNotes("");
    setNotice("");
  }
  return (
    <section className="panel workflow-panel">
      <h2>
        <T>Send to doctor</T>
      </h2>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <label htmlFor="reception-patient-search">
        Find an existing or returning patient / రోగిని వెతకండి
      </label>
      <input
        id="reception-patient-search"
        ref={searchInput}
        type="search"
        disabled={sending}
        placeholder="Name, phone number or patient ID"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setLimit(20);
        }}
      />
      <p className="muted">
        {matches.length} matching patients · most recent visits first. Verify
        name, age and phone before selecting; family members can share a phone
        number.
      </p>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Registered and recent patients"
      >
        <table>
          <thead>
            <tr>
              <th>
                <T>Patient</T>
              </th>
              <th>
                <T>Age</T>
              </th>
              <th>
                <T>Phone number</T>
              </th>
              <th>Last recorded visit</th>
              <th>Visits</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {matches.slice(0, limit).map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <br />
                  <small>{p.id}</small>
                </td>
                <td>{p.age}</td>
                <td>{p.phone}</td>
                <td>{lastSeen(p.lastVisitAt, checkedAt)}</td>
                <td>{p.visitCount}</td>
                <td>
                  <button
                    type="button"
                    disabled={sending}
                    className="button secondary"
                    aria-label={`Select ${p.name}, patient ${p.id}`}
                    aria-pressed={selectedId === p.id}
                    onClick={() => choose(p)}
                  >
                    {selectedId === p.id ? "Selected" : "Select"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!matches.length && (
        <p>
          No matching patient. Check the spelling or phone number, or use
          Register patient above.
        </p>
      )}
      {matches.length > limit && (
        <button
          type="button"
          className="button secondary"
          onClick={() => setLimit(limit + 20)}
        >
          Show 20 more patients
        </button>
      )}
      {selected ? (
        <WorkflowForm
          key={selected.id}
          url="/api/workflow"
          label="Send to doctor"
          onBusyChange={setSending}
          payload={() => ({
            action: "intake",
            patientId: selected.id,
            complaint,
            notes,
          })}
          onSuccess={() => {
            setNotice(
              `${selected.name} was sent to the doctor queue. Ready for the next patient.`,
            );
            setSelectedId("");
            setComplaint("");
            setNotes("");
            setSearch("");
            setLimit(20);
            refresh();
          }}
        >
          <h3>{selected.name}</h3>
          <div className="form-grid">
            <label>
              Age
              <input value={selected.age} readOnly />
            </label>
            <label>
              Phone number
              <input value={selected.phone} readOnly />
            </label>
          </div>
          <p className="muted">
            Patient ID: {selected.id} · {selected.visitCount} recorded visits ·
            Last visit: {lastSeen(selected.lastVisitAt, checkedAt)}
          </p>
          {selected.lastVisitAt && (
            <details className="workflow-card">
              <summary>Previous reception details</summary>
              <p>
                <strong>Previous problem:</strong>{" "}
                {selected.lastProblem || "Not recorded"}
              </p>
              <p>
                <strong>Previous reception notes:</strong>{" "}
                {selected.lastReceptionNotes || "Not recorded"}
              </p>
              <p className="muted">
                Historical information only. Enter today’s problem and notes
                below.
              </p>
            </details>
          )}
          <label>
            Problem / reason for visit
            <textarea
              name="complaint"
              required
              maxLength={2000}
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
            />
          </label>
          <label>
            Reception notes
            <textarea
              name="notes"
              maxLength={5000}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <p className="muted">
            Either doctor can pick up this patient. After a successful send,
            this form clears for the next patient.
          </p>
        </WorkflowForm>
      ) : (
        <p>
          Select a patient above to enter today’s problem and reception notes.
        </p>
      )}
    </section>
  );
}
