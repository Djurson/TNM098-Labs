"use client";

import { ClusterInfo, EyeTrackDataPoint } from "@/lib/types";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GetClusterColor, SCATTER_POINTS_RADIUS } from "@/lib/utils";
import {
  createOpacityScale,
  initializeBasePlot,
  applyChartInteractions,
} from "@/lib/plots/chart-utils";
import { curveBasisClosed, group, line, polygonHull, select } from "d3";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { ChartTooltip, TooltipRef } from "../chart-tooltip";
import { ClusterTimeLine, Transition } from "./clustertimeline";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";
const PLAYBACK_SPEED = 10;

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

function fao(data: EyeTrackDataPoint[]): Transition[] {
  if (!data || data.length === 0) return [];
  const result = [];

  let lastConfirmedCluster: number | null = null;
  let potentialClusterStart: EyeTrackDataPoint | null = null;

  for (let i = 0; i < data.length; i++) {
    const p = data[i];

    if (lastConfirmedCluster === null) {
      lastConfirmedCluster = p.cluster;
      potentialClusterStart = p;
      continue;
    }

    if (p.cluster !== lastConfirmedCluster) {
      if (potentialClusterStart === null || potentialClusterStart.cluster !== p.cluster) {
        potentialClusterStart = p;
      }
      // Checks so the focus on a new cluster is longer or equal to at least 1s.
      const duration = p.timeStamp - potentialClusterStart.timeStamp + p.gazeDuration;
      if (duration >= 500) {
        result.push({
          from: lastConfirmedCluster,
          to: p.cluster,
          timestamp: potentialClusterStart.timeStamp,
          fixationIndex: potentialClusterStart.fixationIndex,
          stayDuration: duration,
        });
        lastConfirmedCluster = p.cluster;
        potentialClusterStart = p;
      }
    } else {
      potentialClusterStart = p;
    }
  }
  return result;
}

function extractTransitions(data: EyeTrackDataPoint[]): Transition[] {
  if (!data || data.length === 0) return [];

  const result: Transition[] = [];

  let lastConfirmedCluster: number = data[0].cluster;
  let startNode: EyeTrackDataPoint = data[0];
  let duration: number = data[0].gazeDuration;

  for (let i = 1; i < data.length; i++) {
    const point = data[i];

    if (point.cluster !== lastConfirmedCluster) {
      if (duration >= 1000) {
        result.push({
          from: lastConfirmedCluster,
          to: point.cluster,
          timestamp: startNode.timeStamp,
          fixationIndex: startNode.fixationIndex,
          stayDuration: duration,
        });
        lastConfirmedCluster = point.cluster;
        startNode = point;
        duration = point.gazeDuration;
      }
    } else {
      duration += point.gazeDuration;
    }
  }
  return result;
}

function foo2(data: EyeTrackDataPoint[]): Transition[] {
  if (!data || data.length === 0) return [];

  const result: Transition[] = [];

  let currentClusterIndex: number = data[0].cluster;
  let tempCluster: number | null = null;

  return result;
}

function getActiveClusterAtTime(time: number, transitions: Transition[], maxTime: number) {
  if (!transitions || transitions.length === 0) return null;
  if (time < transitions[0].timestamp) return transitions[0].from;

  for (let i = 0; i < transitions.length; i++) {
    const start = transitions[i].timestamp;
    const end = i < transitions.length - 1 ? transitions[i + 1].timestamp : maxTime;
    if (time >= start && time < end) {
      return transitions[i].to;
    }
  }
  return null;
}

export function ClusterPlot({
  data,
  clusters,
  maxTime,
}: {
  data: EyeTrackDataPoint[];
  clusters: ClusterInfo[];
  maxTime: number;
}) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<TooltipRef | null>(null);
  const [transitions, setTransitions] = useState<Transition[]>([]);

  const baseId = useId().replace(/:/g, "");
  const clipId = `scatter-clip-${baseId}`;
  const graphSize = useResizeObserver(graphSvgRef);

  const opacityScale = useMemo(() => createOpacityScale(data), [data]);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const activeClusterRef = useRef<number | null>(null);

  console.log(transitions);

  useEffect(() => {
    setTransitions(extractTransitions(data));
  }, [data]);

  const animate = useCallback(
    (time: DOMHighResTimeStamp) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;

        setCurrentTime((prevTime) => {
          const nextTime = prevTime + deltaTime * PLAYBACK_SPEED;
          if (nextTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return nextTime;
        });
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [maxTime],
  );

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      previousTimeRef.current = undefined; // Reset time tracker on pause
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  const handleClusterHover = useCallback(
    (clusterId: number | null) => {
      const svg = select(graphSvgRef.current);
      if (!svg.node()) return;

      const targetCluster = clusterId !== null ? clusterId : activeClusterRef.current;

      if (targetCluster === null) {
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
          .attr("fill-opacity", (d) =>
            d.cluster === targetCluster ? opacityScale(d.gazeDuration) : 0.02,
          )
          .attr("stroke-opacity", (d) =>
            d.cluster === targetCluster ? opacityScale(d.gazeDuration) : 0.05,
          );

        svg
          .selectAll("path.cluster-blob")
          .transition()
          .duration(200)
          .style("opacity", function () {
            return select(this).attr("data-cluster-id") === String(targetCluster) ? 0.3 : 0.02;
          });
      }
    },
    [opacityScale],
  );

  useEffect(() => {
    if (!isPlaying && currentTime === 0) return;

    const activeCluster = getActiveClusterAtTime(currentTime, transitions, maxTime);

    if (activeCluster !== activeClusterRef.current) {
      activeClusterRef.current = activeCluster;
      handleClusterHover(activeCluster);
    }
  }, [currentTime, transitions, maxTime, isPlaying, handleClusterHover]);

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

    const validPoints = data.filter((d) => d.cluster > -1);
    const clustersGrouped = group(validPoints, (d) => d.cluster);
    const blobGenerator = line().curve(curveBasisClosed);
    const blobLayer = root.append("g").attr("clip-path", `url(#${clipId})`);

    clustersGrouped.forEach((pointsInCluster, clusterId) => {
      if (pointsInCluster.length < 3) return;
      const coords = pointsInCluster.map(
        (d) => [scales.x(d.position.x), scales.y(d.position.y)] as [number, number],
      );

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
          onHoverIn: (element) =>
            select(element)
              .transition()
              .duration(100)
              .attr("fill-opacity", 1)
              .attr("stroke-opacity", 1)
              .attr("stroke-width", 2),
          onHoverOut: (element, d) => {
            const active = activeClusterRef.current;
            const isDimmed = active !== null && active !== d.cluster;

            select(element)
              .transition()
              .duration(250)
              .attr(
                "fill-opacity",
                d.cluster === -1 ? "0.05" : isDimmed ? 0.02 : opacityScale(d.gazeDuration),
              )
              .attr("stroke-opacity", isDimmed ? 0.05 : 0.5)
              .attr("stroke-width", 0.5);
          },
        }),
      );
  }, [data, graphSize.width, graphSize.height, clipId, opacityScale]);

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex flex-col gap-1 px-12 py-3 mx-8 mt-6 border shadow-sm rounded-xl border-border/60 bg-muted/40 backdrop-blur-sm">
        <ClusterTimeLine
          transitions={transitions}
          numberOfClusters={clusters.length}
          maxTime={maxTime}
          onHoverCluster={handleClusterHover}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onClickPlay={() => {
            if (currentTime === maxTime) {
              setCurrentTime(0);
            }
            setIsPlaying(!isPlaying);
          }}
          onClickRestart={() => {
            setCurrentTime(0);
            activeClusterRef.current = null;
            handleClusterHover(null);
          }}
        />
      </div>
      <svg ref={graphSvgRef} className="flex-1 w-full h-full" />
      <ChartTooltip ref={tooltipRef} />
    </div>
  );
}
