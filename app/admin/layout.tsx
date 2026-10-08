import { requirePage } from "@/lib/auth";
import { demoEnabled } from "@/lib/db";
import { Shell } from "@/components/shell";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePage("workforce");
  return (
    <Shell demo={demoEnabled()} role={user.role} name={user.name}>
      {children}
    </Shell>
  );
}
