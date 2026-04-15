import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullData } from "@/lib/types";
import { CirclePile, Hexagon, ScatterChart } from "lucide-react";
import { ScatterPlot } from "./plots/scatterplot";
import { HexBinPlot } from "./plots/hexbinplot";
import { Test } from "./plots/test";
import { ClusterPlot } from "./plots/clusterplot";
import { TestClusterPlot2 } from "./plots/test2";

export function PlotSelect({ data }: { data: FullData }) {
  return (
    <Tabs defaultValue="scatterplot" className="flex items-center justify-center w-full">
      <TabsList variant="default" className="flex gap-4 px-1">
        <TabsTrigger value="scatterplot" className="flex gap-2 px-3 text-base">
          <ScatterChart className="size-4 aspect-square" />
          Scatterplot
        </TabsTrigger>
        <TabsTrigger value="heatmap" className="flex gap-2 px-3 text-base">
          <Hexagon className="size-4 aspect-square" />
          Heatmap
        </TabsTrigger>
        <TabsTrigger value="clusters" className="flex gap-2 px-3 text-base">
          <CirclePile className="size-4 aspect-square" />
          Dominant Clusters Over Time
        </TabsTrigger>
        {/* <TabsTrigger value="test" className="flex gap-2 px-3 text-base">
          <CirclePile className="size-4 aspect-square" />
          Test
        </TabsTrigger> */}
        <TabsTrigger value="test2" className="flex gap-2 px-3 text-base">
          <CirclePile className="size-4 aspect-square" />
          Test 2
        </TabsTrigger>
      </TabsList>
      <TabsContent value="scatterplot" className="w-full">
        <ScatterPlot data={data.points} maxTime={data.maxTime} />
      </TabsContent>
      <TabsContent value="heatmap" className="flex items-center w-full">
        <HexBinPlot data={data.points} />
      </TabsContent>
      <TabsContent value="clusters" className="flex items-center w-full">
        <ClusterPlot data={data.points} clusters={data.clusters} maxTime={data.maxTime} />
      </TabsContent>
      <TabsContent value="test" className="flex items-center w-full">
        <Test />
      </TabsContent>
      <TabsContent value="test2" className="flex items-center w-full">
        <TestClusterPlot2 data={data.points} />
      </TabsContent>
    </Tabs>
  );
}
