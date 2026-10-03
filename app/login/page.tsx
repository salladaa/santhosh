import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { demoEnabled } from "@/lib/db";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage() {
  const user = await session();
  if (user) redirect(user.role === "patient" ? "/patient" : "/admin");
  return <LoginForm demo={demoEnabled()} />;
}
