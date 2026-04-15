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

const MAX_S = 281;
const RULER_TICKS = Array.from({ length: Math.floor(MAX_S / 20) + 1 }, (_, i) => i * 20);

function formatToolTipData(d: EyeTrackDataPoint) {
  return {
    title: `Fixation ${d.fixationIndex}`,
    details: [
      { label: "X", value: `${d.position.x} px` },
      { label: "Y", value: `${d.position.y} px` },
      { label: "Duration", value: `${d.gazeDuration} ms` },
    ],
  };
}

function fmtS(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

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
      const time = d.timeStamp;
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
      .attr("fill-opacity", (d) => opacityScale(d.gazeDuration))
      .attr("stroke", GetClusterColor(0))
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 0.5)
      .call((selection) =>
        applyChartInteractions(selection, crosshair, tooltipRef.current, {
          getCrosshairPos: (d) => ({ x: scales.x(d.position.x), y: scales.y(d.position.y) }),
          getTooltipData: (d) => formatToolTipData(d),
          onHoverIn: (element, d) => select(element).transition().duration(100).attr("fill-opacity", 1).attr("stroke-opacity", 1).attr("stroke-width", 2),
          onHoverOut: (element, d) => select(element).transition().duration(250).attr("fill-opacity", opacityScale(d.gazeDuration)).attr("stroke-opacity", 0.5).attr("stroke-width", 0.5),
        }),
      );
  }, [data, filteredData, graphSize.width, graphSize.height, clipId]);

  return (
    <div className="flex flex-col flex-1 h-full">
      <TimeLine onChange={setValue} value={value} />
      <svg ref={graphSvgRef} className="flex-1 w-full h-full" />
      <ChartTooltip ref={tooltipRef} />
    </div>
  );
}

function TimeLine({ onChange, value }: { onChange: (value: [number, number]) => void; value: [number, number] }) {
  return (
    <div className="flex flex-col gap-1 px-12 py-3 mx-8 mt-6 border shadow-sm rounded-xl border-border/60 bg-muted/40 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <Label htmlFor="time-slider" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Time filter
        </Label>
        <span className="font-mono text-xs tabular-nums text-foreground/70 bg-background/60 border border-border/50 rounded-md px-2 py-0.5">
          {fmtS(value[0])} &ndash; {fmtS(value[1])}
        </span>
      </div>
      <RangeSlider id="time-slider" value={value} onChange={onChange} min={0} max={MAX_S} step={0.25} />
      <div className="relative flex justify-between px-0">
        {RULER_TICKS.map((t, i) => (
          <div key={t} className={`flex flex-col gap-1.5 justify-center ${i === 0 ? "items-start text-start" : "items-start text-end"}`} style={{ width: 0 }}>
            <div className="w-0.5 h-2 bg-primary/20 rounded" />
            <span className="font-mono text-[9px] text-muted-foreground -translate-x-1/2">{fmtS(t)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
