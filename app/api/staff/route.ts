import { requireApi } from "@/lib/auth";
import { staff, saveStaff } from "@/lib/care";
import { apiError, body, json } from "@/lib/http";
export async function GET() {
  try {
    await requireApi(true);
    return json({ staff: staff() });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApi(true);
    return json({ id: saveStaff(await body(request), user) }, 201);
  } catch (e) {
    return apiError(e);
  }
}
