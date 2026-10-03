import { requireClinicalApi } from "@/lib/auth";
import { discharge } from "@/lib/inpatient";
import { apiError, body, json } from "@/lib/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireClinicalApi();
    discharge((await params).id, await body(request), user);
    return json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
