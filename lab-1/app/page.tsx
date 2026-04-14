"use server";

import { HexBinPlot } from "@/components/hexbinplot";
import { ScatterPlot } from "@/components/scatterplot";
import { LoadData } from "@/lib/load-data";

export default async function Home() {
  const data = await LoadData();

  return (
    <div className="min-h-screen w-full flex flex-col items-center">
      <div className="w-full justify-center flex items-center py-3">
        <h1>Datavisualization</h1>
      </div>
      <div className="flex justify-center h-full w-full px-8">
        <ScatterPlot data={data ?? []} />
        <HexBinPlot data={data ?? []} />
      </div>
    </div>
  );
}
