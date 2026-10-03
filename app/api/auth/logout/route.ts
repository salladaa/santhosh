import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cookieName, tokenHash } from "@/lib/auth";
import { body, json, apiError } from "@/lib/http";
export async function POST(request: Request) {
  try {
    await body(request);
    const jar = await cookies();
    const token = jar.get(cookieName)?.value;
    if (token)
      db()
        .prepare("DELETE FROM sessions WHERE token_hash=?")
        .run(tokenHash(token));
    jar.delete(cookieName);
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
