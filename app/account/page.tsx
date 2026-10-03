import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { demoEnabled } from "@/lib/db";
import { Shell } from "@/components/shell";
import { PageHeading } from "@/components/ui";
import { AccountForm } from "@/components/account-form";
export default async function AccountPage() {
  const user = await session();
  if (!user) redirect("/login");
  return (
    <Shell
      role={user.role}
      patient={user.role === "patient"}
      name={user.name}
      demo={demoEnabled()}
    >
      <PageHeading
        eyebrow="ACCOUNT / ఖాతా"
        title="Change password"
        description="Protect your account with a unique password."
      />
      <AccountForm />
    </Shell>
  );
}
