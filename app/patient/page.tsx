import { PatientOrders } from "@/components/workflow-desk";
import { careData, doctors } from "@/lib/care";
import { admissions } from "@/lib/inpatient";
import { CareWorkspace } from "@/components/care-workspace";
import { InpatientWorkspace } from "@/components/inpatient-workspace";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { findPatient, demoEnabled } from "@/lib/db";
import { Shell } from "@/components/shell";
import { PageHeading } from "@/components/ui";
import { PatientRecord } from "@/components/patient-record";
export default async function PatientPage() {
  const user = await requirePage("patient");
  const patient = user.patientId ? findPatient(user.patientId) : null;
  if (!patient) notFound();
  return (
    <Shell patient role="patient" name={patient.name} demo={demoEnabled()}>
      <PageHeading
        eyebrow="YOUR PERSONAL HEALTH SPACE"
        title={`Welcome, ${patient.name.split(" ")[0]}.`}
        description="Your care information, all in one place. Stay connected to your next step."
      />
      <PatientRecord patient={patient} />
      <CareWorkspace
        patientId={patient.id}
        patientName={patient.name}
        data={careData(patient.id, user)}
        doctors={doctors()}
        role="patient"
      />
      <InpatientWorkspace
        records={admissions(patient.id)}
        beds={[]}
        patients={[]}
        doctors={[]}
        role="patient"
      />
      <PatientOrders />
      <div className="patient-help">
        <strong>Your care team is here to help.</strong>
        <p>
          To update your details, ask about a report, or change an appointment,
          contact your hospital directly.
        </p>
      </div>
    </Shell>
  );
}
