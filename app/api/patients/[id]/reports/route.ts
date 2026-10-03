import { requireStaffApi } from "@/lib/auth";
import { addReport } from "@/lib/care";
import { apiError, json, checkOrigin, readBytes } from "@/lib/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireStaffApi();
    checkOrigin(request);
    const bytes = await readBytes(request, 10 * 1024 * 1024);
    return json(
      {
        id: addReport(
          (await params).id,
          new URL(request.url).searchParams.get("title") || "",
          request.headers.get("content-type") || "",
          bytes,
          user,
        ),
      },
      201,
    );
  } catch (e) {
    return apiError(e);
  }
}
