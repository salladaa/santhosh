import { requireApi } from "@/lib/auth";
import { findPatient, savePatient, deletePatient } from "@/lib/db";
import { body, json, apiError } from "@/lib/http";
import { InputError, validatePatient } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireApi();
    const { id } = await params;
    if (user.role === "patient" && user.patientId !== id)
      throw new InputError("Access denied.", 403);
    const patient = findPatient(id);
    if (!patient) throw new InputError("Patient not found.", 404);
    return json({ patient });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireApi(true);
    const input = validatePatient(await body(request), false);
    return json({ patient: savePatient(input, user.name, (await params).id) });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await requireApi(true);
    const input = (await body(request)) as { version?: number } | null;
    if (!input || !Number.isInteger(input.version))
      throw new InputError("Reload before deleting.");
    deletePatient((await params).id, input.version!, user.name);
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
