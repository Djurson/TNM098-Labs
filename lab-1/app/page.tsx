"use server";

import { HexBinPlot } from "@/components/hexbinplot";
import { ScatterPlot } from "@/components/scatterplot";
import { Card, CardContent } from "@/components/ui/card";
import { LoadData } from "@/lib/load-data";

export default async function Home() {
  const data = await LoadData();

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="w-full justify-center flex items-center py-3">
        <h1 className="text-2xl">Datavisualization of eye tracking data</h1>
      </div>
      <div className="flex justify-center flex-1 w-full px-8 gap-6">
        <ScatterPlot data={data ?? []} />
        <HexBinPlot data={data ?? []} />
      </div>
    </div>
  );
}
