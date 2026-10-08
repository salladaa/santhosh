import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import type { Session } from "./types";
import { InputError } from "./validation";
export const cookieName = "portal_session";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function session(): Promise<Session | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || token.length !== 64) return null;
  const row = db()
    .prepare(
      "SELECT u.id AS userId, u.role, u.patient_id AS patientId, u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
    )
    .get(tokenHash(token), Date.now());
  return row ? ({ ...row } as unknown as Session) : null;
}
export async function requirePage(
  role: Session["role"] | "staff" | "workforce",
) {
  const user = await session();
  if (!user) redirect("/login");
  if (
    role === "workforce"
      ? user.role === "patient"
      : role === "staff"
        ? !["admin", "doctor", "nurse"].includes(user.role)
        : user.role !== role
  )
    redirect(
      user.role === "patient"
        ? "/patient"
        : ["reception", "lab", "pharmacy"].includes(user.role)
          ? "/admin/workflow"
          : "/admin",
    );
  return user;
}
export async function requireApi(admin = false, departmentAccess = false) {
  const user = await session();
  if (!user) throw new InputError("Please sign in again.", 401);
  if (!departmentAccess && ["reception", "lab", "pharmacy"].includes(user.role))
    throw new InputError("Use your department workspace.", 403);
  if (admin && user.role !== "admin")
    throw new InputError("Administrator access required.", 403);
  return user;
}
export async function createSession(userId: string) {
  const jar = await cookies();
  const previous = jar.get(cookieName)?.value;
  if (previous)
    db()
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .run(tokenHash(previous));
  const token = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES (?, ?, ?)")
    .run(tokenHash(token), userId, Date.now() + 8 * 60 * 60 * 1000);
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function requireStaffApi() {
  const user = await requireApi();
  if (user.role === "patient")
    throw new InputError("Staff access required.", 403);
  return user;
}
export async function patientAccess(id: string) {
  const user = await requireApi();
  if (user.role === "patient" && user.patientId !== id)
    throw new InputError("Access denied.", 403);
  return user;
}

export async function requireClinicalApi() {
  const user = await requireStaffApi();
  if (user.role !== "admin" && user.role !== "doctor")
    throw new InputError("Doctor or administrator access required.", 403);
  return user;
}
