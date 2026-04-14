"use server";

import { PlotSelect } from "@/components/plotselect";
import { LoadData } from "@/lib/load-data";

export default async function Home() {
  const data = await LoadData();

  return (
    <div className="h-full w-full flex flex-col items-center max-h-screen overflow-hidden">
      <div className="w-full justify-center flex items-center py-3">
        <h1 className="text-3xl font-extrabold">Datavisualization Of Eye Tracking Data</h1>
      </div>
      <div className="flex justify-center flex-1 w-full px-8 gap-6">
        <PlotSelect data={data ?? []} />
      </div>
    </div>
  );
}
