import { BedFlowClient } from "@/components/modules/BedFlowClient";
import { loadWards } from "@/lib/wards-server";

export const dynamic = "force-dynamic";

export default async function BedFlowPage() {
  const { wards, source } = await loadWards();
  return <BedFlowClient initialWards={wards} source={source} />;
}
