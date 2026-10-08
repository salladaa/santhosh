import { requireApi } from "@/lib/auth";
import { apiError, body, json } from "@/lib/http";
import { object } from "@/lib/care";
import { savePatient } from "@/lib/db";
import { InputError, validatePatient } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const user = await requireApi(false, true);
    if (!["admin", "reception"].includes(user.role))
      throw new InputError("Reception access required.", 403);
    const data = object(await body(request));
    const input = validatePatient(
      {
        ...data,
        medicines: [],
        reports: [],
        billAmount: 0,
        billStatus: "Pending",
        treatment: "",
        nextCheckup: "",
        appointmentStatus: "Scheduled",
      },
      true,
    );
    const patient = savePatient(input, user.name);
    return json({ id: patient.id }, 201);
  } catch (error) {
    return apiError(error);
  }
}
