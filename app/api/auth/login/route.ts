import { db } from "@/lib/db";
import { createSession, tokenHash } from "@/lib/auth";
import { body, json, apiError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { InputError } from "@/lib/validation";
const dummyHash = hashPassword("unused-comparison-password");
export async function POST(request: Request) {
  try {
    const input = (await body(request)) as {
      email?: unknown;
      password?: unknown;
    } | null;
    if (
      !input ||
      typeof input.email !== "string" ||
      typeof input.password !== "string" ||
      input.email.length > 254 ||
      input.password.length > 128
    )
      throw new InputError("Enter your email and password.");
    const email = input.email.trim().toLowerCase();
    const key = tokenHash(email);
    const connection = db();
    connection
      .prepare("DELETE FROM login_attempts WHERE reset_at<=?")
      .run(Date.now());
    const attempt = connection
      .prepare("SELECT attempts FROM login_attempts WHERE key=?")
      .get(key);
    if (attempt && Number(attempt.attempts) >= 8)
      throw new InputError(
        "Too many sign-in attempts. Try again in 15 minutes.",
        429,
      );
    connection
      .prepare(
        "INSERT INTO login_attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1",
      )
      .run(key, Date.now() + 15 * 60 * 1000);
    const user = connection
      .prepare(
        "SELECT id, password_hash, role FROM users WHERE email=? AND active=1",
      )
      .get(email);
    const valid = verifyPassword(
      input.password,
      String(user?.password_hash || dummyHash),
    );
    if (!user || !valid)
      throw new InputError("Email or password is incorrect.", 401);
    connection.prepare("DELETE FROM login_attempts WHERE key=?").run(key);
    await createSession(String(user.id));
    return json({ redirect: user.role === "patient" ? "/patient" : "/admin" });
  } catch (error) {
    return apiError(error);
  }
}
