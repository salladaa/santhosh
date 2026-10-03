import { requireApi } from "@/lib/auth";
import { updateAppointment } from "@/lib/care";
import { apiError, body, json } from "@/lib/http";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApi();
    updateAppointment((await params).id, await body(request), user);
    return json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
