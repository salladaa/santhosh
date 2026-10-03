export function GET() {
  return Response.json(
    { status: "running" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
