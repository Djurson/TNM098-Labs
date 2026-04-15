import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EyeTrackDataPoint } from "@/lib/types";
import { CirclePile, Hexagon, ScatterChart } from "lucide-react";
import { ScatterPlot } from "./plots/scatterplot";
import { HexBinPlot } from "./plots/hexbinplot";
import { ClustersPlot } from "./plots/clustersplot";
import { Test } from "./plots/test";

export function PlotSelect({ data }: { data: EyeTrackDataPoint[] }) {
  return (
    <Tabs defaultValue="scatterplot" className="w-full justify-center flex items-center">
      <TabsList variant="default" className="flex gap-4 px-1">
        <TabsTrigger value="scatterplot" className="text-base flex gap-2 px-3">
          <ScatterChart className="size-4 aspect-square" />
          Scatterplot
        </TabsTrigger>
        <TabsTrigger value="heatmap" className="text-base flex gap-2 px-3">
          <Hexagon className="size-4 aspect-square" />
          Heatmap
        </TabsTrigger>
        <TabsTrigger value="clusters" className="text-base flex gap-2 px-3">
          <CirclePile className="size-4 aspect-square" />
          Dominant Clusters Over Time
        </TabsTrigger>
        <TabsTrigger value="test" className="text-base flex gap-2 px-3">
          <CirclePile className="size-4 aspect-square" />
          Test
        </TabsTrigger>
      </TabsList>
      <TabsContent value="scatterplot" className="w-full">
        <ScatterPlot data={data} />
      </TabsContent>
      <TabsContent value="heatmap" className="w-full flex items-center">
        <HexBinPlot data={data} />
      </TabsContent>
      <TabsContent value="clusters" className="w-full flex items-center">
        <ClustersPlot data={data} />
      </TabsContent>
      <TabsContent value="test" className="w-full flex items-center">
        <Test />
      </TabsContent>
    </Tabs>
  );
}
