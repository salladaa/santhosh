import { requireApi } from "@/lib/auth";
import { systemStatus } from "@/lib/system";
import { apiError, json } from "@/lib/http";
export async function GET() {
  try {
    await requireApi(true);
    return json(systemStatus());
  } catch (e) {
    return apiError(e);
  }
}
