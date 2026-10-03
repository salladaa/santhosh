import { requirePage } from "@/lib/auth";
import { listPatients } from "@/lib/db";
import { appointments, doctors } from "@/lib/care";
import { PageHeading } from "@/components/ui";
import { AppointmentWorkspace } from "@/components/appointments";
export default async function AppointmentsPage() {
  await requirePage("staff");
  return (
    <>
      <PageHeading
        eyebrow="OPD / అవుట్‌పేషెంట్"
        title="Appointments"
        description="Confirm patient requests, book visits and track arrival and completion. All times are IST."
      />
      <AppointmentWorkspace
        records={appointments()}
        patients={listPatients().map((p) => ({ id: p.id, name: p.name }))}
        doctors={doctors()}
      />
    </>
  );
}
