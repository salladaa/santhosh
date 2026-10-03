import { patientAccess } from "@/lib/auth";
import { careData } from "@/lib/care";
import { apiError, json } from "@/lib/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params,
      user = await patientAccess(id);
    return json(careData(id, user));
  } catch (e) {
    return apiError(e);
  }
}
