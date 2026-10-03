import { requireApi } from "@/lib/auth";
import { admissions, admit } from "@/lib/inpatient";
import { apiError, body, json } from "@/lib/http";
export async function GET() {
  try {
    const user = await requireApi();
    return json({
      admissions: admissions(
        user.role === "patient" ? user.patientId! : undefined,
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApi(true);
    return json({ id: admit(await body(request), user) }, 201);
  } catch (e) {
    return apiError(e);
  }
}
