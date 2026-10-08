import { requireApi, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { audit, object, passwordField } from "@/lib/care";
import { apiError, body, json } from "@/lib/http";
import { InputError } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const user = await requireApi(false, true),
      data = object(await body(request)),
      current = passwordField(data, "currentPassword"),
      password = passwordField(data, "newPassword");
    if (password.length < 12 || password === current)
      throw new InputError(
        "Choose a different password of at least 12 characters.",
      );
    const key = `password:${user.userId}`,
      now = Date.now();
    db().prepare("DELETE FROM login_attempts WHERE reset_at<=?").run(now);
    if (
      Number(
        db().prepare("SELECT attempts FROM login_attempts WHERE key=?").get(key)
          ?.attempts || 0,
      ) >= 5
    )
      throw new InputError("Too many attempts. Try again in 15 minutes.", 429);
    db()
      .prepare(
        "INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1",
      )
      .run(key, now + 900000);
    const stored = db()
      .prepare("SELECT password_hash FROM users WHERE id=?")
      .get(user.userId);
    if (!stored || !verifyPassword(current, String(stored.password_hash)))
      throw new InputError("Current password is incorrect.", 400);
    db().exec("BEGIN IMMEDIATE");
    try {
      db()
        .prepare("UPDATE users SET password_hash=? WHERE id=?")
        .run(hashPassword(password), user.userId);
      db().prepare("DELETE FROM sessions WHERE user_id=?").run(user.userId);
      db().prepare("DELETE FROM login_attempts WHERE key=?").run(key);
      audit(user, "Changed password", "account", user.userId);
      db().exec("COMMIT");
    } catch (e) {
      db().exec("ROLLBACK");
      throw e;
    }
    await createSession(user.userId);
    return json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
