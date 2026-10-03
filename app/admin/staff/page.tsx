import { requirePage } from "@/lib/auth";
import { staff } from "@/lib/care";
import { PageHeading } from "@/components/ui";
import { StaffWorkspace } from "@/components/staff-workspace";
export default async function StaffPage() {
  await requirePage("admin");
  return (
    <>
      <PageHeading
        eyebrow="ACCESS MANAGEMENT"
        title="Staff"
        description="Named accounts for doctors and nurses. Only administrators can create or disable accounts."
      />
      <StaffWorkspace staff={staff()} />
    </>
  );
}
