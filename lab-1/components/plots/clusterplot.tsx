"use client";

import { ClusterInfo, EyeTrackDataPoint } from "@/lib/types";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GetClusterColor, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { createOpacityScale, initializeBasePlot, applyChartInteractions } from "@/lib/plots/chart-utils";
import { curveBasisClosed, group, line, polygonHull, select } from "d3";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { ChartTooltip, TooltipRef } from "../chart-tooltip";
import { ClusterTimeLine, Transition } from "./clustertimeline";

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

function extractTransitions(data: EyeTrackDataPoint[]): Transition[] {
  if (!data || data.length === 0) return [];
  const result = [];

  let lastConfirmedCluster: number | null = null;
  let potentialClusterStart: EyeTrackDataPoint | null = null;

  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    if (p.cluster === -1) continue;

    // Initialize the first cluster we encounter
    if (lastConfirmedCluster === null) {
      lastConfirmedCluster = p.cluster;
      potentialClusterStart = p;
      continue;
    }

    // If we see a different cluster
    if (p.cluster !== lastConfirmedCluster) {
      // If this is the start of a NEW potential cluster, mark it
      if (potentialClusterStart === null || potentialClusterStart.cluster !== p.cluster) {
        potentialClusterStart = p;
      }

      // Check if we have stayed in this potential cluster for at least 1s
      const duration = p.timeStamp - potentialClusterStart.timeStamp;
      if (duration >= 1000) {
        result.push({
          from: lastConfirmedCluster,
          to: p.cluster,
          timestamp: potentialClusterStart.timeStamp,
          fixationIndex: potentialClusterStart.fixationIndex,
          stayDuration: duration,
        });
        // This potential cluster is now the "confirmed" anchor
        lastConfirmedCluster = p.cluster;
        potentialClusterStart = p;
      }
    } else {
      // We are back in (or still in) the confirmed cluster, reset potential
      potentialClusterStart = p;
    }
  }
  return result;
}

export function ClusterPlot({ data, clusters, maxTime }: { data: EyeTrackDataPoint[]; clusters: ClusterInfo[]; maxTime: number }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<TooltipRef | null>(null);
  const [transitions, setTransitions] = useState<Transition[]>([]);

  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;
  const graphSize = useResizeObserver(graphSvgRef);

  const opacityScale = useMemo(() => createOpacityScale(data), [data]);

  useEffect(() => {
    setTransitions(extractTransitions(data));
  }, [data]);

  const handleClusterHover = useCallback(
    (clusterId: number | null) => {
      const svg = select(graphSvgRef.current);
      if (!svg.node()) return;

      if (clusterId === null) {
        svg
          .selectAll<SVGCircleElement, EyeTrackDataPoint>("circle.gaze-point")
          .transition()
          .duration(200)
          .attr("fill-opacity", (d) => (d.cluster !== -1 ? opacityScale(d.gazeDuration) : "0.05"))
          .attr("stroke-opacity", 0.5);

        svg.selectAll("path.cluster-blob").transition().duration(200).style("opacity", 0.1);
      } else {
        svg
          .selectAll<SVGCircleElement, EyeTrackDataPoint>("circle.gaze-point")
          .transition()
          .duration(200)
          .attr("fill-opacity", (d) => (d.cluster === clusterId ? opacityScale(d.gazeDuration) : 0.02))
          .attr("stroke-opacity", (d) => (d.cluster === clusterId ? opacityScale(d.gazeDuration) : 0.05));

        svg
          .selectAll("path.cluster-blob")
          .transition()
          .duration(200)
          .style("opacity", function () {
            return select(this).attr("data-cluster-id") === String(clusterId) ? 0.3 : 0.02;
          });
      }
    },
    [opacityScale],
  );

  useEffect(() => {
    const basePlot = initializeBasePlot({ svgElement: graphSvgRef.current, data, width: graphSize.width, height: graphSize.height, xAxisLabel: GRAPH_X_LEGEND_TEXT, yAxisLabel: GRAPH_Y_LEGEND_TEXT, clipId });
    if (!basePlot) return;

    const { root, scales, crosshair } = basePlot;

    const validPoints = data.filter((d) => d.cluster > -1);
    const clustersGrouped = group(validPoints, (d) => d.cluster);
    const blobGenerator = line().curve(curveBasisClosed);
    const blobLayer = root.append("g").attr("clip-path", `url(#${clipId})`);

    clustersGrouped.forEach((pointsInCluster, clusterId) => {
      if (pointsInCluster.length < 3) return;
      const coords = pointsInCluster.map((d) => [scales.x(d.position.x), scales.y(d.position.y)] as [number, number]);

      const hull = polygonHull(coords);
      if (!hull) return;

      blobLayer
        .append("path")
        .datum(hull)
        .attr("class", "cluster-blob")
        .attr("data-cluster-id", clusterId)
        .attr("d", blobGenerator)
        .attr("fill", GetClusterColor(clusterId))
        .attr("stroke", GetClusterColor(clusterId))
        .attr("stroke-width", 50)
        .attr("stroke-linejoin", "round")
        .style("opacity", 0.1);
    });

    root
      .append("g")
      .attr("clip-path", `url(#${clipId})`)
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("class", "gaze-point")
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
          onHoverIn: (element) => select(element).transition().duration(100).attr("fill-opacity", 1).attr("stroke-opacity", 1).attr("stroke-width", 2),
          onHoverOut: (element, d) =>
            select(element)
              .transition()
              .duration(250)
              .attr("fill-opacity", d.cluster !== -1 ? opacityScale(d.gazeDuration) : "0.05")
              .attr("stroke-opacity", 0.5)
              .attr("stroke-width", 0.5),
        }),
      );
  }, [data, graphSize.width, graphSize.height, clipId, opacityScale]);

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex flex-col gap-1 px-12 py-3 mx-8 mt-6 border shadow-sm rounded-xl border-border/60 bg-muted/40 backdrop-blur-sm">
        <ClusterTimeLine transitions={transitions} numberOfClusters={clusters.length} maxTime={maxTime} onHoverCluster={handleClusterHover} />
      </div>
      <svg ref={graphSvgRef} className="flex-1 w-full h-full" />
      <ChartTooltip ref={tooltipRef} />
    </div>
  );
}
