"use server";

import { HexBinPlot } from "@/components/hexbinplot";
import { LoadData } from "@/lib/load-data";

export default async function Home() {
  const data = await LoadData();

  return (
    <div className="min-h-screen w-full flex flex-col items-center">
      <div className="flex justify-center h-full w-full">
        <div className="flex flex-1" />
        <HexBinPlot data={data ?? []} />
      </div>
    </div>
  );
}
