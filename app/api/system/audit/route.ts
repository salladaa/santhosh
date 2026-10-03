import { requireApi } from "@/lib/auth";
import { auditEvents } from "@/lib/system";
import { apiError, json } from "@/lib/http";
export async function GET() {
  try {
    await requireApi(true);
    return json({ events: auditEvents() });
  } catch (e) {
    return apiError(e);
  }
}
