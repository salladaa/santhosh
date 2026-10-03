"use client";
import Link from "next/link";
import { useState } from "react";
import type { Patient } from "@/lib/types";
import { request } from "@/lib/client";
import { T } from "./language";
export function PatientForm({ patient }: { patient?: Patient }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="patient-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const d = new FormData(e.currentTarget),
          v = (key: string) => String(d.get(key) || "");
        try {
          const result = await request<{ patient: Patient }>(
            patient ? `/api/patients/${patient.id}` : "/api/patients",
            patient ? "PUT" : "POST",
            {
              name: v("name"),
              age: Number(v("age")),
              phone: v("phone"),
              email: v("email"),
              password: v("password") || undefined,
              dateOfBirth: v("dateOfBirth"),
              address: v("address"),
              emergencyContact: v("emergencyContact"),
              allergies: v("allergies"),
              medicines: patient?.medicines || [],
              reports: patient?.reports || [],
              treatment: patient?.treatment || "",
              nextCheckup: patient?.nextCheckup || "",
              appointmentStatus: patient?.appointmentStatus || "Scheduled",
              billAmount: patient?.billAmount || 0,
              billStatus: patient?.billStatus || "Pending",
              version: patient?.version,
            },
          );
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Discard cached patient records after the API mutation.
          window.location.assign(
            `/admin/patients/${result.patient.id}?saved=1`,
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save.");
          setBusy(false);
        }
      }}
    >
      <section className="panel form-section">
        <h2>
          <T>Patient information</T>
        </h2>
        <p className="muted" style={{ margin: "8px 0 24px" }}>
          Register the patient here. Add appointments, doctor visits,
          prescriptions and report files from their record.
        </p>
        <div className="form-grid">
          <label>
            <T>Full name</T> *
            <input
              name="name"
              required
              maxLength={100}
              autoComplete="name"
              defaultValue={patient?.name}
            />
          </label>
          <label>
            <T>Age</T> *
            <input
              name="age"
              required
              type="number"
              min={0}
              max={120}
              step={1}
              defaultValue={patient?.age}
            />
          </label>
          <label>
            <T>Date of birth</T>
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={patient?.dateOfBirth}
            />
          </label>
          <label>
            <T>Phone number</T> *
            <input
              name="phone"
              type="tel"
              required
              maxLength={30}
              autoComplete="tel"
              placeholder="+91 98765 43210"
              defaultValue={patient?.phone}
            />
          </label>
          <label>
            <T>Email address</T> *
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              defaultValue={patient?.email}
            />
          </label>
          <label>
            <T>Emergency contact</T>
            <input
              name="emergencyContact"
              maxLength={200}
              defaultValue={patient?.emergencyContact}
              placeholder="Name, relationship and phone"
            />
          </label>
          <label className="span-two">
            <T>Address</T>
            <textarea
              name="address"
              maxLength={1000}
              rows={2}
              defaultValue={patient?.address}
            />
          </label>
          <label className="span-two">
            <T>Allergies</T>
            <textarea
              name="allergies"
              maxLength={1000}
              rows={2}
              defaultValue={patient?.allergies}
              placeholder="Record confirmed allergies and reactions. Blank means not recorded."
            />
          </label>
          <label className="span-two">
            <T>
              {patient ? "Reset patient password" : "Patient account password"}
            </T>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required={!patient}
              minLength={12}
              maxLength={128}
              placeholder={
                patient
                  ? "Leave blank to keep current password"
                  : "At least 12 characters"
              }
            />
            <small>
              Share access privately after verifying the patient or authorised
              guardian. Never share staff credentials.
            </small>
          </label>
        </div>
      </section>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <Link
          href={patient ? `/admin/patients/${patient.id}` : "/admin/patients"}
          className="button secondary"
        >
          <T>Cancel</T>
        </Link>
        <button className="button primary" disabled={busy}>
          <T>{busy ? "Saving…" : "Save"}</T>
        </button>
      </div>
    </form>
  );
}
