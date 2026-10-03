import { T } from "./language";
import type { Patient } from "@/lib/types";
export function PatientRecord({ patient: p }: { patient: Patient }) {
  return (
    <section className="panel record-panel patient-summary">
      <h2>
        <T>Personal information</T>
      </h2>
      <div className="allergy-note">
        <strong>
          <T>Allergies</T>:{" "}
        </strong>
        {p.allergies || "Not recorded / నమోదు కాలేదు"}
      </div>
      <dl>
        <div>
          <dt>
            <T>Full name</T>
          </dt>
          <dd>{p.name}</dd>
        </div>
        <div>
          <dt>Patient ID</dt>
          <dd>{p.id}</dd>
        </div>
        <div>
          <dt>
            <T>Age</T>
          </dt>
          <dd>{p.age}</dd>
        </div>
        <div>
          <dt>
            <T>Email address</T>
          </dt>
          <dd>{p.email}</dd>
        </div>
        <div>
          <dt>
            <T>Phone number</T>
          </dt>
          <dd>{p.phone}</dd>
        </div>
        {p.dateOfBirth && (
          <div>
            <dt>
              <T>Date of birth</T>
            </dt>
            <dd>{p.dateOfBirth}</dd>
          </div>
        )}
        {p.emergencyContact && (
          <div>
            <dt>
              <T>Emergency contact</T>
            </dt>
            <dd>{p.emergencyContact}</dd>
          </div>
        )}
        {p.address && (
          <div>
            <dt>
              <T>Address</T>
            </dt>
            <dd>{p.address}</dd>
          </div>
        )}
      </dl>
      {(p.treatment ||
        p.medicines.length ||
        p.reports.length ||
        p.nextCheckup) && (
        <details className="compact-details">
          <summary>Previous record summary / పాత రికార్డు వివరాలు</summary>
          <p className="muted">
            Historical fields from the earlier portal. Current visits, files and
            appointments are listed below.
          </p>
          <p>{p.treatment}</p>
          <p>Medicines: {p.medicines.join(", ") || "—"}</p>
          <p>Report names: {p.reports.join(", ") || "—"}</p>
          <p>Previous checkup date: {p.nextCheckup || "—"}</p>
        </details>
      )}
    </section>
  );
}
