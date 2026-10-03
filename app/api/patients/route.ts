import { requireApi, requireStaffApi } from "@/lib/auth";
import { listPatients, savePatient } from "@/lib/db";
import { body, json, apiError } from "@/lib/http";
import { validatePatient } from "@/lib/validation";
export async function GET() {
  try {
    await requireStaffApi();
    return json({ patients: listPatients() });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApi(true);
    const input = validatePatient(await body(request), true);
    return json({ patient: savePatient(input, user.name) }, 201);
  } catch (error) {
    return apiError(error);
  }
}
