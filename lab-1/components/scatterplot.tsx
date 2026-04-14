"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useId, useRef, useState } from "react";
import { GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_LEFT, GRAPH_MARGIN_RIGHT, GRAPH_MARGIN_TOP, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { clearSvg, createPositionScales, createSvgRoot, createOpacityScale, drawAxes } from "@/lib/plots/chart-utils";
import { max } from "d3";

import { Label } from "@/components/ui/label";
import { RangeSlider } from "./ui/customslider";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";

export function ScatterPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;

  const maxV = max(data, (d) => d.TimeStamp / 1000) ?? 0;

  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const [value, setValue] = useState<[number, number]>([0.0, maxV]);

  useEffect(() => {
    if (!graphSvgRef.current) return;

    const graphObserver = new ResizeObserver(([entry]) => {
      setGraphSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    graphObserver.observe(graphSvgRef.current);

    return () => graphObserver.disconnect();
  }, []);

  useEffect(() => {
    const graphSvg = graphSvgRef.current;
    if (!graphSvg) return;

    const { width, height } = graphSize;

    if (!data || data.length === 0 || !width || !height) {
      clearSvg(graphSvg);
      return;
    }

    const filteredData = data.filter((d) => {
      const time = d.TimeStamp;
      return time >= value[0] * 1000 && time <= value[1] * 1000;
    });

    const scales = createPositionScales(data, { width, height });
    if (!scales) {
      clearSvg(graphSvg);
      return;
    }

    const opacityScale = createOpacityScale(filteredData);

    const root = createSvgRoot(graphSvg, width, height);
    root.selectAll("*").remove();

    drawAxes(root, scales, { width, height }, { top: GRAPH_MARGIN_TOP, bottom: GRAPH_MARGIN_BOTTOM, left: GRAPH_MARGIN_LEFT, right: GRAPH_MARGIN_RIGHT }, GRAPH_X_LEGEND_TEXT, GRAPH_Y_LEGEND_TEXT);

    root
      .append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", GRAPH_MARGIN_LEFT)
      .attr("y", GRAPH_MARGIN_TOP)
      .attr("width", width - GRAPH_MARGIN_LEFT - GRAPH_MARGIN_RIGHT)
      .attr("height", height - GRAPH_MARGIN_TOP - GRAPH_MARGIN_BOTTOM);

    root
      .append("g")
      .attr("clip-path", `url(#${clipId})`)
      .selectAll("circle")
      .data(filteredData)
      .join("circle")
      .attr("cx", (d) => scales.x(d.position.x))
      .attr("cy", (d) => scales.y(d.position.y))
      .attr("r", SCATTER_POINTS_RADIUS)
      .attr("fill", "#ea580c")
      .attr("fill-opacity", (d) => opacityScale(d.GazeDuration))
      .attr("stroke", "#c2410c")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 0.5);
  }, [data, graphSize.width, graphSize.height, clipId, value[0], value[1]]);

  return (
    <div className="h-full flex gap-2 flex-1 flex-col">
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <Label htmlFor="time-slider">Time (s)</Label>
          <span className="text-sm text-muted-foreground">{value.join(", ")}</span>
        </div>
        <RangeSlider id="time-slider" value={value} onChange={setValue} min={0} max={maxV} step={0.25} />
      </div>
      <svg ref={graphSvgRef} className="w-full h-full flex-1" />
    </div>
  );
}
