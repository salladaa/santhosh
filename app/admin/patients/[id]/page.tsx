import Link from "next/link";
import { careData, doctors } from "@/lib/care";
import { CareWorkspace } from "@/components/care-workspace";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { findPatient } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { PatientRecord } from "@/components/patient-record";
import { DeletePatient } from "@/components/delete-patient";
export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requirePage("staff");
  const patient = findPatient((await params).id);
  if (!patient) notFound();
  const saved = (await searchParams).saved;
  return (
    <>
      <Link className="back-link" href="/admin/patients">
        ← Back to patients
      </Link>
      <PageHeading
        eyebrow="PATIENT RECORD"
        title={patient.name}
        description="Care details, appointments, and billing in one place."
        action={
          user.role === "admin" ? (
            <Link
              className="button primary"
              href={`/admin/patients/${patient.id}/edit`}
            >
              Edit patient
            </Link>
          ) : undefined
        }
      />
      {saved === "1" && (
        <div className="success-box" role="status">
          Patient record saved successfully.
        </div>
      )}
      <PatientRecord patient={patient} />
      <CareWorkspace
        patientId={patient.id}
        patientName={patient.name}
        data={careData(patient.id, user)}
        doctors={doctors()}
        role={user.role}
      />
      {user.role === "admin" && (
        <DeletePatient
          id={patient.id}
          name={patient.name}
          version={patient.version}
        />
      )}
    </>
  );
}
