"use server";

import { PlotSelect } from "@/components/plotselect";
import { FullData } from "@/lib/types";
import fullData from "@/public/data.json";

export default async function Home() {
  const fulldata = fullData as FullData;

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="flex items-center justify-center w-full py-3">
        <h1 className="text-3xl font-extrabold">Datavisualization Of Eye Tracking Data</h1>
      </div>
      <div className="flex justify-center flex-1 w-full gap-6 px-8">
        <PlotSelect data={fulldata ?? {}} />
      </div>
    </div>
  );
}
