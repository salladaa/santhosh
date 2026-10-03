import { requireStaffApi } from "@/lib/auth";
import { addNursingNote } from "@/lib/inpatient";
import { apiError, body, json } from "@/lib/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireStaffApi();
    return json(
      { id: addNursingNote((await params).id, await body(request), user) },
      201,
    );
  } catch (e) {
    return apiError(e);
  }
}
