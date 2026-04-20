"use client";

import { ClusterInfo, EyeTrackDataPoint, Transition } from "@/lib/types";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GetClusterColor, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import { createOpacityScale, initializeBasePlot, applyChartInteractions } from "@/lib/plots/chart-utils";
import { curveBasisClosed, group, line, polygonHull, select } from "d3";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { ChartTooltip, TooltipRef } from "../chart-tooltip";
import { ClusterTimeLine } from "./clustertimeline";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";
const MIN_FOCUS_DURATION_MS = 500;

/**
 * Collapses raw gaze points into confirmed cluster "stays" (runs of the same
 * cluster that last at least MIN_FOCUS_DURATION_MS).
 */
export function extractTransitions(data: EyeTrackDataPoint[]): Transition[] {
  if (data.length === 0) return [];

  const result: Transition[] = [];

  let runCluster = data[0].cluster;
  let runStart = data[0];
  let runDuration = data[0].gazeDuration;

  const commitRun = (nextCluster: number) => (runDuration >= MIN_FOCUS_DURATION_MS ? result.push({ from: runCluster, to: nextCluster, timestamp: runStart.timeStamp, fixationIndex: runStart.fixationIndex, stayDuration: runDuration }) : undefined);

  for (let i = 1; i < data.length; i++) {
    const point = data[i];
    if (point.cluster === runCluster) {
      runDuration += point.gazeDuration;
    } else {
      commitRun(point.cluster);
      runCluster = point.cluster;
      runStart = point;
      runDuration = point.gazeDuration;
    }
  }
  commitRun(-1);

  return result;
}

/**
 * Fills every uncovered time span between confirmed stays with an explicit
 * cluster-(-1) block. This ensures getActiveClusterAtTime always returns -1
 * for noise/saccade periods instead of null, so the plot correctly dims all
 * real clusters rather than resetting to full opacity.
 */
export function fillTransitionGaps(transitions: Transition[], maxTime: number): Transition[] {
  if (transitions.length === 0) return [{ from: -1, to: -1, timestamp: 0, fixationIndex: -1, stayDuration: maxTime }];

  const MIN_GAP_MS = 1;
  const noiseBlock = (start: number, end: number, nextCluster = -1): Transition => ({
    from: -1,
    to: nextCluster,
    timestamp: start,
    fixationIndex: -1,
    stayDuration: end - start,
  });

  const filled: Transition[] = [];

  // Gap before the first confirmed stay
  if (transitions[0].timestamp > MIN_GAP_MS) filled.push(noiseBlock(0, transitions[0].timestamp, transitions[0].from));

  for (let i = 0; i < transitions.length; i++) {
    filled.push(transitions[i]);

    const blockEnd = transitions[i].timestamp + transitions[i].stayDuration;
    const nextStart = transitions[i + 1]?.timestamp ?? maxTime;
    const gap = nextStart - blockEnd;

    if (gap > MIN_GAP_MS) filled.push(noiseBlock(blockEnd, nextStart, transitions[i + 1]?.from ?? -1));
  }

  return filled;
}

/** Returns the active cluster (possibly -1 for noise) at a given timestamp. */
function getActiveClusterAtTime(time: number, transitions: Transition[]): number | null {
  for (const t of transitions) {
    if (time >= t.timestamp && time <= t.timestamp + t.stayDuration) return t.from;
  }
  return null;
}

function formatTooltipData(d: EyeTrackDataPoint) {
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

export function ClusterPlot({ data, clusters, maxTime }: { data: EyeTrackDataPoint[]; clusters: ClusterInfo[]; maxTime: number }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<TooltipRef | null>(null);
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number | undefined>(undefined);

  const activeClusterRef = useRef<number | null>(null);

  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;
  const graphSize = useResizeObserver(graphSvgRef);
  const opacityScale = useMemo(() => createOpacityScale(data), [data]);

  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2);

  useEffect(() => setTransitions(fillTransitionGaps(extractTransitions(data), maxTime)), [data, maxTime]);

  /**
   * Focuses the scatter plot on a specific cluster by dimming everything else.
   * Pass null to reset all points to their default opacity.
   */
  const applyClusterFocus = useCallback(
    (clusterId: number | null) => {
      const svg = select(graphSvgRef.current);
      if (!svg.node()) return;

      const points = svg.selectAll<SVGCircleElement, EyeTrackDataPoint>("circle.gaze-point");
      const blobs = svg.selectAll("path.cluster-blob");

      if (clusterId === null) {
        points
          .transition()
          .duration(200)
          .attr("fill-opacity", (d) => (d.cluster !== -1 ? opacityScale(d.gazeDuration) : "0.05"))
          .attr("stroke-opacity", 0.5);
        blobs.transition().duration(200).style("opacity", 0.1);
      } else {
        points
          .transition()
          .duration(200)
          .attr("fill-opacity", (d) => (d.cluster === clusterId ? opacityScale(d.gazeDuration) : 0.02))
          .attr("stroke-opacity", (d) => (d.cluster === clusterId ? opacityScale(d.gazeDuration) : 0.05));
        blobs
          .transition()
          .duration(200)
          .style("opacity", function () {
            return select(this).attr("data-cluster-id") === String(clusterId) ? 0.3 : 0.02;
          });
      }
    },
    [opacityScale],
  );

  // Called by the timeline's hover events. When the mouse leaves (null), we
  // restore to whatever the playback is currently highlighting.
  const handleTimelineHover = useCallback((clusterId: number | null) => applyClusterFocus(clusterId ?? activeClusterRef.current), [applyClusterFocus]);

  const animate = useCallback(
    (time: DOMHighResTimeStamp) => {
      if (previousTimeRef.current !== undefined) {
        const delta = time - previousTimeRef.current;
        setCurrentTime((prev) => {
          const next = prev + delta * playbackSpeed;
          if (next >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return next;
        });
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [maxTime, playbackSpeed],
  );

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      previousTimeRef.current = undefined;
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  // Sync cluster highlight to playhead position
  useEffect(() => {
    if (!isPlaying && currentTime === 0) return;
    const active = getActiveClusterAtTime(currentTime, transitions);
    if (active !== activeClusterRef.current) {
      activeClusterRef.current = active;
      applyClusterFocus(active);
    }
  }, [currentTime, transitions, isPlaying, applyClusterFocus]);

  useEffect(() => {
    const basePlot = initializeBasePlot({
      svgElement: graphSvgRef.current,
      data,
      width: graphSize.width,
      height: graphSize.height,
      xAxisLabel: GRAPH_X_LEGEND_TEXT,
      yAxisLabel: GRAPH_Y_LEGEND_TEXT,
      clipId,
    });
    if (!basePlot) return;
    const { root, scales, crosshair } = basePlot;

    // Cluster hulls
    const blobLine = line().curve(curveBasisClosed);
    const blobLayer = root.append("g").attr("clip-path", `url(#${clipId})`);
    const validPoints = data.filter((d) => d.cluster > -1);

    group(validPoints, (d) => d.cluster).forEach((pts, clusterId) => {
      if (pts.length < 3) return;
      const hull = polygonHull(pts.map((d) => [scales.x(d.position.x), scales.y(d.position.y)] as [number, number]));
      if (!hull) return;

      blobLayer
        .append("path")
        .datum(hull)
        .attr("class", "cluster-blob")
        .attr("data-cluster-id", clusterId)
        .attr("d", blobLine)
        .attr("fill", GetClusterColor(clusterId))
        .attr("stroke", GetClusterColor(clusterId))
        .attr("stroke-width", 50)
        .attr("stroke-linejoin", "round")
        .style("opacity", 0.1);
    });

    // Point scatter
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
          getTooltipData: (d) => formatTooltipData(d),
          onHoverIn: (el) => select(el).transition().duration(100).attr("fill-opacity", 1).attr("stroke-opacity", 1).attr("stroke-width", 2),
          onHoverOut: (el, d) => {
            const active = activeClusterRef.current;
            const dimmed = active !== null && active !== d.cluster;
            select(el)
              .transition()
              .duration(250)
              .attr("fill-opacity", d.cluster === -1 ? "0.05" : dimmed ? 0.02 : opacityScale(d.gazeDuration))
              .attr("stroke-opacity", dimmed ? 0.05 : 0.5)
              .attr("stroke-width", 0.5);
          },
        }),
      );
  }, [data, graphSize.width, graphSize.height, clipId, opacityScale]);

  const handlePlay = () => {
    if (currentTime === maxTime) setCurrentTime(0);
    setIsPlaying((p) => !p);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    activeClusterRef.current = null;
    applyClusterFocus(null);
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex flex-col gap-1 px-12 py-3 mx-8 mt-6 border shadow-sm rounded-xl border-border/60 bg-muted/40 backdrop-blur-sm">
        <ClusterTimeLine
          transitions={transitions}
          numberOfClusters={clusters.length}
          maxTime={maxTime}
          currentTime={currentTime}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onHoverCluster={handleTimelineHover}
          onClickPlay={handlePlay}
          onClickRestart={handleRestart}
          onSpeedChange={setPlaybackSpeed}
        />
      </div>
      <svg ref={graphSvgRef} className="flex-1 w-full h-full" />
      <ChartTooltip ref={tooltipRef} />
    </div>
  );
}
