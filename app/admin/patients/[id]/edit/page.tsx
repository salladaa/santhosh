import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { findPatient } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePage("admin");
  const patient = findPatient((await params).id);
  if (!patient) notFound();
  return (
    <>
      <PageHeading
        eyebrow="PATIENTS / EDIT RECORD"
        title={`Edit ${patient.name}`}
        description="Update this patient’s information. Changes are saved to the shared hospital workspace."
      />
      <PatientForm patient={patient} />
    </>
  );
}
