"use client";
import { useState } from "react";
import { request } from "@/lib/client";
export function DeletePatient({
  id,
  name,
  version,
}: {
  id: string;
  name: string;
  version: number;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await request(`/api/patients/${id}`, "DELETE", { version });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Drop cached patient pages after deletion.
      window.location.assign("/admin/patients");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete.");
      setBusy(false);
    }
  }
  return (
    <section className="delete-section">
      {confirm ? (
        <>
          <div>
            <strong>Delete {name}?</strong>
            <p>
              This permanently removes their record and account. This cannot be
              undone.
            </p>
          </div>
          <div className="inline-actions">
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
              disabled={busy}
            >
              Keep patient
            </button>
            <button className="button danger" onClick={remove} disabled={busy}>
              {busy ? "Deleting…" : "Confirm deletion"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <strong>Remove patient record</strong>
            <p>Delete this patient and their portal access.</p>
          </div>
          <button
            className="button danger-outline"
            onClick={() => setConfirm(true)}
          >
            Delete patient
          </button>
        </>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
