"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_LEFT, GRAPH_MARGIN_RIGHT, GRAPH_MARGIN_TOP, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { clearSvg, createPositionScales, createSvgRoot, createOpacityScale, drawAxes } from "@/lib/plots/chart-utils";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";

export function ClustersPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;

  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const [value, setValue] = useState<[number, number]>([0.0, 281]);
  const deferredValue = useDeferredValue(value);

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

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.filter((d) => {
      const time = d.TimeStamp;
      return time >= deferredValue[0] * 1000 && time <= deferredValue[1] * 1000;
    });
  }, [data, deferredValue]);

  useEffect(() => {
    const graphSvg = graphSvgRef.current;
    const { width, height } = graphSize;

    if (!graphSvg || !width || !height || filteredData.length === 0) {
      if (graphSvg) clearSvg(graphSvg);
      return;
    }

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
  }, [data, filteredData, graphSize.width, graphSize.height, clipId]);

  return (
    <div className="h-full flex flex-1 flex-col pb-4">
      <svg ref={graphSvgRef} className="w-full h-full flex-1" />
      <div className="flex flex-col w-full px-8 gap-3">
        <div className="flex flex-col w-full">
          <div className="w-full flex justify-between">
            <p className="text-sm flex-1 text-muted-foreground font-medium">{value[0]}</p>
            <p className="flex-1 font-semibold text-sm text-center">Time (s)</p>
            <p className="text-sm flex-1 text-right text-muted-foreground font-medium">{value[1]}</p>
          </div>
        </div>
        <div className="h-12 flex rounded-md">
          <div className="flex-1 bg-blue-300 rounded-md" />
          <div className="flex-1 bg-red-300 rounded-md" />
          <div className="flex-1 bg-green-300 rounded-md" />
        </div>
      </div>
    </div>
  );
}
