"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { GetClusterColor, GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_LEFT, GRAPH_MARGIN_RIGHT, GRAPH_MARGIN_TOP, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { clearSvg, createPositionScales, createSvgRoot, createOpacityScale, drawAxes, createClipPath } from "@/lib/plots/chart-utils";
import ClusterTimeline from "./timeline";
import { useResizeObserver } from "@/hooks/use-resize-observer";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";

export function ClustersPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);

  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;

  const graphSize = useResizeObserver(graphSvgRef);

  useEffect(() => {
    const graphSvg = graphSvgRef.current;
    const { width, height } = graphSize;

    if (!graphSvg || !width || !height) {
      if (graphSvg) clearSvg(graphSvg);
      return;
    }

    const scales = createPositionScales(data, { width, height });
    if (!scales) {
      clearSvg(graphSvg);
      return;
    }

    const opacityScale = createOpacityScale(data);
    const root = createSvgRoot(graphSvg, width, height);

    root.selectAll("*").remove();

    drawAxes(root, scales, { width, height }, { top: GRAPH_MARGIN_TOP, bottom: GRAPH_MARGIN_BOTTOM, left: GRAPH_MARGIN_LEFT, right: GRAPH_MARGIN_RIGHT }, GRAPH_X_LEGEND_TEXT, GRAPH_Y_LEGEND_TEXT);
    createClipPath(root, clipId, { width, height }, { top: GRAPH_MARGIN_TOP, bottom: GRAPH_MARGIN_BOTTOM, left: GRAPH_MARGIN_LEFT, right: GRAPH_MARGIN_RIGHT });

    root
      .append("g")
      .attr("clip-path", `url(#${clipId})`)
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => scales.x(d.position.x))
      .attr("cy", (d) => scales.y(d.position.y))
      .attr("r", SCATTER_POINTS_RADIUS)
      .attr("fill", (d) => GetClusterColor(d.ClusterLabel))
      .attr("fill-opacity", (d) => opacityScale(d.GazeDuration))
      .attr("stroke", (d) => GetClusterColor(d.ClusterLabel))
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 0.5);
  }, [data, graphSize.width, graphSize.height, clipId]);

  return (
    <div className="flex flex-col flex-1 h-full pb-4">
      <svg ref={graphSvgRef} className="flex-1 w-full h-full" />
      <div className="flex flex-col w-full gap-3 px-8">
        <ClusterTimeline />
      </div>
    </div>
  );
}
