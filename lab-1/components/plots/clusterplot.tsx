"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useId, useRef } from "react";
import { GetClusterColor, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { createOpacityScale, initializeBasePlot, applyChartInteractions, PositionScales } from "@/lib/plots/chart-utils";
import { curveBasisClosed, group, line, polygonHull, select, Selection } from "d3";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { ChartTooltip, TooltipRef } from "../chart-tooltip";
import ClusterTimeline from "./timeline";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";

function formatToolTipData(d: EyeTrackDataPoint) {
  return {
    title: `Fixation ${d.fixationIndex}`,
    details: [
      { label: "X", value: `${d.position.x} px` },
      { label: "Y", value: `${d.position.y} px` },
      { label: "Duration", value: `${d.gazeDuration} ms` },
      { label: "Cluster", value: d.cluster },
    ],
  };
}

function TimeLine() {
  return (
    <div className="flex flex-col gap-1 px-12 py-3 mx-8 mt-6 border shadow-sm rounded-xl border-border/60 bg-muted/40 backdrop-blur-sm">
      <ClusterTimeline />
    </div>
  );
}

function extractAndDrawClusterHulls(data: EyeTrackDataPoint[], root: Selection<SVGSVGElement, unknown, null, undefined>, clipId: string, scales: PositionScales) {
  const validPoints = data.filter((d) => d.cluster > -1);
  const clusters = group(validPoints, (d) => d.cluster);

  const blobGenerator = line().curve(curveBasisClosed);

  const blobLayer = root.append("g").attr("clip-path", `url(#${clipId})`);

  clusters.forEach((pointsInCluster, clusterId) => {
    if (pointsInCluster.length < 3) return;
    const coords = pointsInCluster.map((d) => [scales.x(d.position.x), scales.y(d.position.y)] as [number, number]);

    const hull = polygonHull(coords);
    if (!hull) return;

    blobLayer.append("path").datum(hull).attr("d", blobGenerator).attr("fill", GetClusterColor(clusterId)).attr("stroke", GetClusterColor(clusterId)).attr("stroke-width", 50).attr("stroke-linejoin", "round").style("opacity", 0.15);
  });
}

export function ClusterPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<TooltipRef | null>(null);

  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;

  const graphSize = useResizeObserver(graphSvgRef);

  useEffect(() => {
    const basePlot = initializeBasePlot({ svgElement: graphSvgRef.current, data, width: graphSize.width, height: graphSize.height, xAxisLabel: GRAPH_X_LEGEND_TEXT, yAxisLabel: GRAPH_Y_LEGEND_TEXT, clipId });

    if (!basePlot) return;

    const { root, scales, crosshair } = basePlot;
    const opacityScale = createOpacityScale(data);

    extractAndDrawClusterHulls(data, root, clipId, scales);

    root
      .append("g")
      .attr("clip-path", `url(#${clipId})`)
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => scales.x(d.position.x))
      .attr("cy", (d) => scales.y(d.position.y))
      .attr("r", SCATTER_POINTS_RADIUS)
      .attr("fill", (d) => GetClusterColor(d.cluster))
      .attr("fill-opacity", (d) => (d.cluster !== -1 ? opacityScale(d.gazeDuration) : "0.05"))
      .attr("stroke", (d) => GetClusterColor(d.cluster))
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 0.5)
      .call((selection) =>
        applyChartInteractions(selection, crosshair, tooltipRef.current, {
          getCrosshairPos: (d) => ({ x: scales.x(d.position.x), y: scales.y(d.position.y) }),
          getTooltipData: (d) => formatToolTipData(d),
          onHoverIn: (element, d) => select(element).transition().duration(100).attr("fill-opacity", 1).attr("stroke-opacity", 1).attr("stroke-width", 2),
          onHoverOut: (element, d) =>
            select(element)
              .transition()
              .duration(250)
              .attr("fill-opacity", d.cluster !== -1 ? opacityScale(d.gazeDuration) : "0.05")
              .attr("stroke-opacity", 0.5)
              .attr("stroke-width", 0.5),
        }),
      );
  }, [data, graphSize.width, graphSize.height, clipId]);

  return (
    <div className="flex flex-col flex-1 h-full">
      <TimeLine />
      <svg ref={graphSvgRef} className="flex-1 w-full h-full" />
      <ChartTooltip ref={tooltipRef} />
    </div>
  );
}
