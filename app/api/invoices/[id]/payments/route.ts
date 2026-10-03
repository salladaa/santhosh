import { requireApi } from "@/lib/auth";
import { recordPayment } from "@/lib/care";
import { apiError, body, json } from "@/lib/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApi(true);
    recordPayment((await params).id, await body(request), user);
    return json({ ok: true }, 201);
  } catch (e) {
    return apiError(e);
  }
}
