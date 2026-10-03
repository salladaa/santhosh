import { requirePage } from "@/lib/auth";
import { listPatients } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { AddPatient, PageHeading } from "@/components/ui";
import { PatientTable } from "@/components/patient-table";
export default async function PatientsPage() {
  const user = await requirePage("staff");
  return (
    <>
      <PageHeading
        eyebrow="PATIENT MANAGEMENT"
        title="People at the heart of care."
        description="Find a patient, review their care, and keep every detail up to date."
        action={user.role === "admin" ? <AddPatient /> : undefined}
      />
      <PatientTable patients={listPatients()} today={todayISO()} />
    </>
  );
}
