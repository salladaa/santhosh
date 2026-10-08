import { requirePage } from "@/lib/auth";
import { WorkflowDesk } from "@/components/workflow-desk";
import { PageHeading } from "@/components/ui";
export default async function WorkflowPage() {
  const user = await requirePage("workforce");
  return (
    <>
      <PageHeading
        eyebrow="CONNECTED DEPARTMENTS / అనుసంధాన విభాగాలు"
        title="Live workflow"
        description="One shared doctor queue. Confirmed orders go directly to the lab and pharmacy."
      />
      <WorkflowDesk user={user} />
    </>
  );
}
