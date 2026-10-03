import { requireApi, requireStaffApi } from "@/lib/auth";
import { beds, createBed } from "@/lib/inpatient";
import { apiError, body, json } from "@/lib/http";
export async function GET() {
  try {
    await requireStaffApi();
    return json({ beds: beds() });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApi(true);
    return json({ id: createBed(await body(request), user) }, 201);
  } catch (e) {
    return apiError(e);
  }
}
