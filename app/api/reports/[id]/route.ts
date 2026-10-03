import { requireApi } from "@/lib/auth";
import { readReport } from "@/lib/care";
import { apiError } from "@/lib/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApi(),
      { id } = await params,
      { content, mime } = readReport(id, user);
    const ext =
      mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(content.length),
        "Content-Disposition": `attachment; filename="report-${id}.${ext}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
