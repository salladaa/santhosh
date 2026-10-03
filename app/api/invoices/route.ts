import { requireApi } from "@/lib/auth";
import { invoices, createInvoice } from "@/lib/care";
import { apiError, body, json } from "@/lib/http";
export async function GET() {
  try {
    const user = await requireApi();
    if (user.role !== "admin" && user.role !== "patient")
      return json({ error: "Billing access required." }, 403);
    return json({
      invoices: invoices(user.role === "patient" ? user.patientId! : undefined),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApi(true);
    return json({ id: createInvoice(await body(request), user) }, 201);
  } catch (e) {
    return apiError(e);
  }
}
