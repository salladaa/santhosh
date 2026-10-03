import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
export default async function Home() {
  const user = await session();
  redirect(user ? (user.role === "patient" ? "/patient" : "/admin") : "/login");
}
