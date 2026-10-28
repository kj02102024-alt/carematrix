import { LabLoopClient } from "@/components/modules/LabLoopClient";
import { loadLabs } from "@/lib/labs-server";

export const dynamic = "force-dynamic";

export default async function LabLoopPage() {
  const { labs, source } = await loadLabs();
  return <LabLoopClient initialLabs={labs} source={source} />;
}
