import { requireApi } from "@/lib/auth";
import { appointments, createAppointment, doctors } from "@/lib/care";
import { apiError, body, json } from "@/lib/http";
export async function GET() {
  try {
    const user = await requireApi();
    return json({
      appointments: appointments(
        user.role === "patient" ? user.patientId! : undefined,
      ),
      doctors: doctors(),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApi();
    return json({ id: createAppointment(await body(request), user) }, 201);
  } catch (e) {
    return apiError(e);
  }
}
