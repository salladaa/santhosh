import { requireApi } from "@/lib/auth";
import { setStaffActive, object } from "@/lib/care";
import { apiError, body, json } from "@/lib/http";
import { InputError } from "@/lib/validation";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApi(true),
      data = object(await body(request));
    if (typeof data.active !== "boolean")
      throw new InputError("Choose active or inactive.");
    setStaffActive((await params).id, data.active, user);
    return json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
