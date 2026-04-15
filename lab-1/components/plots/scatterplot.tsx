"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { GetClusterColor, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { createOpacityScale, initializeBasePlot, applyChartInteractions } from "@/lib/plots/chart-utils";
import { select } from "d3";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { Label } from "@/components/ui/label";
import { RangeSlider } from "../ui/customslider";
import { ChartTooltip, TooltipRef } from "../chart-tooltip";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";

export function ScatterPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<TooltipRef | null>(null);

  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;

  const graphSize = useResizeObserver(graphSvgRef);

  const [value, setValue] = useState<[number, number]>([0.0, 281]);
  const deferredValue = useDeferredValue(value);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.filter((d) => {
      const time = d.TimeStamp;
      return time >= deferredValue[0] * 1000 && time <= deferredValue[1] * 1000;
    });
  }, [data, deferredValue]);

  useEffect(() => {
    const basePlot = initializeBasePlot({ svgElement: graphSvgRef.current, data, width: graphSize.width, height: graphSize.height, xAxisLabel: GRAPH_X_LEGEND_TEXT, yAxisLabel: GRAPH_Y_LEGEND_TEXT, clipId });

    if (!basePlot || filteredData.length === 0) return;

    const { root, scales, crosshair } = basePlot;
    const opacityScale = createOpacityScale(filteredData);

    root
      .append("g")
      .attr("clip-path", `url(#${clipId})`)
      .selectAll("circle")
      .data(filteredData)
      .join("circle")
      .attr("cx", (d) => scales.x(d.position.x))
      .attr("cy", (d) => scales.y(d.position.y))
      .attr("r", SCATTER_POINTS_RADIUS)
      .attr("fill", GetClusterColor(0))
      .attr("fill-opacity", (d) => opacityScale(d.GazeDuration))
      .attr("stroke", GetClusterColor(0))
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 0.5)
      .call((selection) =>
        applyChartInteractions(selection, crosshair, tooltipRef.current, {
          getCrosshairPos: (d) => ({ x: scales.x(d.position.x), y: scales.y(d.position.y) }),
          getTooltipData: (d) => formatToolTipData(d),
          onHoverIn: (element, d) => select(element).transition().duration(100).attr("fill-opacity", 1).attr("stroke-opacity", 1).attr("stroke-width", 2),
          onHoverOut: (element, d) => select(element).transition().duration(250).attr("fill-opacity", opacityScale(d.GazeDuration)).attr("stroke-opacity", 0.5).attr("stroke-width", 0.5),
        }),
      );
  }, [data, filteredData, graphSize.width, graphSize.height, clipId]);

  return (
    <div className="flex flex-col flex-1 h-full pb-4">
      <svg ref={graphSvgRef} className="flex-1 w-full h-full" />
      <ChartTooltip ref={tooltipRef} />
      <div className="flex flex-col w-full gap-3 px-8">
        <div className="flex flex-col w-full">
          <div className="flex justify-between w-full">
            <p className="flex-1 text-sm font-medium text-muted-foreground">{value[0]}</p>
            <div className="flex justify-center flex-1">
              <Label htmlFor="time-slider" className="text-sm font-semibold">
                Time (s)
              </Label>
            </div>
            <p className="flex-1 text-sm font-medium text-right text-muted-foreground">{value[1]}</p>
          </div>
        </div>
        <RangeSlider id="time-slider" value={value} onChange={setValue} min={0} max={281} step={0.25} />
      </div>
    </div>
  );
}

function formatToolTipData(d: EyeTrackDataPoint) {
  return {
    title: `Fixation ${d.FixationIndex}`,
    details: [
      { label: "X", value: `${d.position.x} px` },
      { label: "Y", value: `${d.position.y} px` },
      { label: "Duration", value: `${d.GazeDuration} ms` },
    ],
  };
}
