import { loadLabs } from "@/lib/labs-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await loadLabs();
  return Response.json(payload);
}
