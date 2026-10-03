import { requirePage } from "@/lib/auth";
import { PageHeading } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
export default async function NewPatientPage() {
  await requirePage("admin");
  return (
    <>
      <PageHeading
        eyebrow="PATIENTS / NEW PATIENT"
        title="A new patient. A new connection."
        description="Create a patient record and give them access to their own care information."
      />
      <PatientForm />
    </>
  );
}
