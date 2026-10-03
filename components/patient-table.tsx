"use client";
import Link from "next/link";
import { useState } from "react";
import type { Patient } from "@/lib/types";
import { Person, Empty } from "./ui";
import { T } from "./language";
import { Icon } from "./icon";
export function PatientTable({
  patients,
}: {
  patients: Patient[];
  today?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = patients.filter((p) =>
    `${p.name} ${p.email} ${p.phone} ${p.id}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <section className="panel">
      <div className="table-toolbar">
        <div className="search-field">
          <Icon name="search" />
          <input
            aria-label="Search patients"
            placeholder="Name, phone, email or patient ID / రోగిని వెతకండి"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="result-count" aria-live="polite">
        {filtered.length} <T>Patients</T>
      </div>
      {filtered.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <T>Patient</T>
                </th>
                <th>
                  <T>Phone number</T>
                </th>
                <th>
                  <T>Age</T>
                </th>
                <th>
                  <T>View record</T>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/patients/${p.id}`}>
                      <Person name={p.name} detail={p.email} />
                    </Link>
                  </td>
                  <td>{p.phone}</td>
                  <td>{p.age}</td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/admin/patients/${p.id}`}
                    >
                      <T>View record</T> →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No matching records"
          text="Try a different name, phone, email or patient ID."
        />
      )}
    </section>
  );
}
