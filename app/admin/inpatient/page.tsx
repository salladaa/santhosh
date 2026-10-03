import { requirePage } from "@/lib/auth";
import { listPatients } from "@/lib/db";
import { doctors } from "@/lib/care";
import { beds, admissions } from "@/lib/inpatient";
import { PageHeading } from "@/components/ui";
import { InpatientWorkspace } from "@/components/inpatient-workspace";
export default async function InpatientPage() {
  const user = await requirePage("staff");
  return (
    <>
      <PageHeading
        eyebrow="IPD / ఇన్‌పేషెంట్"
        title="Inpatient care"
        description="Beds, admissions, nursing observations and discharge history. All times are IST."
      />
      <InpatientWorkspace
        records={admissions()}
        beds={beds()}
        patients={listPatients().map((p) => ({ id: p.id, name: p.name }))}
        doctors={doctors()}
        role={user.role}
      />
    </>
  );
}
