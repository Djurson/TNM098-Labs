"use client";

import { ClusterInfo, EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useId, useRef, useMemo } from "react";
import { GetClusterColor, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { createOpacityScale, initializeBasePlot, applyChartInteractions, PositionScales } from "@/lib/plots/chart-utils";
import { curveBasisClosed, group, line, polygonHull, select, Selection } from "d3";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { ChartTooltip, TooltipRef } from "../chart-tooltip";
// import ClusterTimeline from "./timeline";

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

// function TimeLine() {
//   return (
//     <div className="flex flex-col gap-1 px-12 py-3 mx-8 mt-6 border shadow-sm rounded-xl border-border/60 bg-muted/40 backdrop-blur-sm shrink-0">
//       <ClusterTimeline />
//     </div>
//   );
// }

/**
 * Updated TransitionLog with a defined height and scrollable area
 */
function TransitionLog({ transitions }: { transitions: any[] }) {
  return (
    <div className="flex flex-col gap-3 p-4 border-l w-72 h-120 bg-muted/10 backdrop-blur-sm shrink-0">
      <h3 className="text-xs font-black tracking-widest uppercase text-muted-foreground">Transition Log</h3>
      <div className="flex-1 pr-2 overflow-y-auto custom-scrollbar">
        {transitions.length === 0 ? (
          <p className="text-xs italic text-muted-foreground/50">No transitions ≥ 1s detected.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transitions.map((t, idx) => (
              <div key={idx} className="p-2 transition-colors border rounded-lg bg-background/50 border-border/40 hover:border-primary/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-primary/70">{(t.timestamp / 1000).toFixed(2)}s</span>
                  <span className="text-[10px] font-bold text-muted-foreground/40">Idx {t.fixationIndex}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span style={{ color: GetClusterColor(t.from) }}>ROI {t.from}</span>
                  <span className="opacity-30">→</span>
                  <span style={{ color: GetClusterColor(t.to) }}>ROI {t.to}</span>
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground/60">Stay: {(t.stayDuration / 1000).toFixed(1)}s</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TestClusterPlot2({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<TooltipRef | null>(null);
  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;
  const graphSize = useResizeObserver(graphSvgRef);

  /**
   * Filtered Transitions:
   * 1. Skips noise (-1)
   * 2. Only records a switch if the user stays in the NEW cluster for at least 1000ms.
   */
  const transitions = useMemo(() => {
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
  }, [data]);

  useEffect(() => {
    const basePlot = initializeBasePlot({ svgElement: graphSvgRef.current, data, width: graphSize.width, height: graphSize.height, xAxisLabel: GRAPH_X_LEGEND_TEXT, yAxisLabel: GRAPH_Y_LEGEND_TEXT, clipId });
    if (!basePlot) return;
    const { root, scales, crosshair } = basePlot;
    const opacityScale = createOpacityScale(data);

    const validPoints = data.filter((d) => d.cluster > -1);
    const clusters = group(validPoints, (d) => d.cluster);
    const blobGenerator = line().curve(curveBasisClosed);
    const blobLayer = root.append("g").attr("clip-path", `url(#${clipId})`);

    clusters.forEach((pointsInCluster, clusterId) => {
      if (pointsInCluster.length < 3) return;
      const coords = pointsInCluster.map((d) => [scales.x(d.position.x), scales.y(d.position.y)] as [number, number]);

      const hull = polygonHull(coords);
      if (!hull) return;

      blobLayer.append("path").datum(hull).attr("d", blobGenerator).attr("fill", GetClusterColor(clusterId)).attr("stroke", GetClusterColor(clusterId)).attr("stroke-width", 50).attr("stroke-linejoin", "round").style("opacity", 0.1);
    });

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
    <div className="flex flex-col flex-1 h-full min-h-0">
      {/* <TimeLine /> */}
      <div className="flex flex-1 min-h-0 px-8 py-4">
        {/* Plot Area with constrained height */}
        <div className="relative flex-1 overflow-hidden border h-150 bg-background/20 rounded-xl border-border/40">
          <svg ref={graphSvgRef} className="w-full h-full" />
          <ChartTooltip ref={tooltipRef} />
        </div>

        {/* Scrollable Transition Log */}
        <TransitionLog transitions={transitions} />
      </div>
    </div>
  );
}
