import { InputError } from "./validation";
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next may normalize the internal URL to localhost. The browser's Host header
  // preserves the actual destination; explicit origin config takes precedence.
  const expected =
    process.env.PORTAL_ORIGIN ||
    `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (origin !== expected)
    throw new InputError("Request origin was not accepted.", 403);
}
export async function body(request: Request) {
  checkOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new InputError("Use a JSON request.", 415);
  const bytes = await readBytes(request, 32000);
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new InputError("Invalid JSON.");
  }
}
export async function readBytes(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max)
    throw new InputError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new InputError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export function apiError(error: unknown) {
  if (error instanceof InputError)
    return json({ error: error.message }, error.status);
  console.error(
    "Portal request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return json({ error: "Something went wrong. Please try again." }, 500);
}
