"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useId, useRef, useState } from "react";
import { axisRight, scaleLinear, select, sum } from "d3";
import { hexbin, HexbinBin } from "d3-hexbin";
import { GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_LEFT, GRAPH_MARGIN_RIGHT, GRAPH_MARGIN_TOP, HEX_RADIUS } from "@/lib/utils";
import { applyChartInteractions, calculateContextSvgWidth, clearSvg, createDensityColorScale, createPositionScales, createSvgRoot, initializeBasePlot } from "@/lib/plots/chart-utils";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { ChartTooltip, TooltipRef } from "../chart-tooltip";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";
const GRAPH_CONTEXT_LEGEND_TEXT = "Total Duration (ms)";

export function HexBinPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const graphContextSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<TooltipRef | null>(null);

  const baseId = useId().replace(/:/g, "");
  const gradientId = `color-gradient-${baseId}`;
  const clipId = `hexbin-clip-${baseId}`;

  const graphSize = useResizeObserver(graphSvgRef);
  const [contextSvgWidth, setContextSvgWidth] = useState(160);

  useEffect(() => {
    const graphSvg = graphSvgRef.current;
    const graphContextSvg = graphContextSvgRef.current;

    if (!graphSvg || !graphContextSvg) {
      return;
    }

    const graphWidth = graphSize.width;
    const graphHeight = graphSize.height;
    const graphContextWidth = contextSvgWidth;
    const graphContextHeight = graphHeight;

    if (!data || data.length === 0 || !graphWidth || !graphHeight || !graphContextHeight) {
      clearSvg(graphSvg);
      clearSvg(graphContextSvg);
      return;
    }

    const scales = createPositionScales(data, { width: graphWidth, height: graphHeight });
    if (!scales) return;
    const { x, y } = scales;

    const hexbinGenerator = hexbin<EyeTrackDataPoint>()
      .x((d) => x(d.position.x))
      .y((d) => y(d.position.y))
      .radius(HEX_RADIUS);

    const bins = hexbinGenerator(data);

    const { scale: colorScale, domain: colorDomain } = createDensityColorScale(bins);
    const nextContextWidth = calculateContextSvgWidth(colorDomain, GRAPH_CONTEXT_LEGEND_TEXT);
    if (nextContextWidth !== contextSvgWidth) {
      setContextSvgWidth(nextContextWidth);
    }

    drawHexbinGraph({
      svgElement: graphSvg,
      data,
      width: graphWidth,
      height: graphHeight,
      color: colorScale,
      clipId,
      tooltip: tooltipRef.current,
    });

    drawGraphContext(graphContextSvg, graphContextWidth, graphContextHeight, colorScale, colorDomain, gradientId);
  }, [data, graphSize.width, graphSize.height, gradientId, clipId]);

  return (
    <div className="flex flex-col flex-1 h-full gap-2">
      <div className="flex flex-1 w-full h-full gap-2">
        <svg ref={graphSvgRef} className="w-full h-full flex-14" />
        <svg ref={graphContextSvgRef} className="h-full" style={{ width: `${contextSvgWidth}px` }} />
        <ChartTooltip ref={tooltipRef} />
      </div>
      <div className="flex flex-col invisible w-full gap-2 px-8" aria-hidden="true">
        <div className="flex items-center gap-2">
          <span className="text-sm">Time (s)</span>
          <span className="text-sm">0, 0</span>
        </div>
        <div className="relative w-full py-4 select-none">
          <div className="relative h-5" />
        </div>
      </div>
    </div>
  );
}

function drawHexbinGraph({
  svgElement,
  data,
  width,
  height,
  color,
  clipId,
  tooltip,
}: {
  svgElement: SVGSVGElement;
  data: EyeTrackDataPoint[];
  width: number;
  height: number;
  color: (value: number) => string;
  clipId: string;
  tooltip: TooltipRef | null;
}) {
  const basePlot = initializeBasePlot({
    svgElement,
    data,
    width,
    height,
    xAxisLabel: GRAPH_X_LEGEND_TEXT,
    yAxisLabel: GRAPH_Y_LEGEND_TEXT,
    clipId,
  });

  if (!basePlot) return;

  const { root, scales, crosshair } = basePlot;

  const generator = hexbin<EyeTrackDataPoint>()
    .x((d) => scales.x(d.position.x))
    .y((d) => scales.y(d.position.y))
    .radius(HEX_RADIUS)
    .extent([
      [GRAPH_MARGIN_LEFT + HEX_RADIUS, GRAPH_MARGIN_TOP + HEX_RADIUS],
      [width - GRAPH_MARGIN_RIGHT - HEX_RADIUS, height - GRAPH_MARGIN_BOTTOM - HEX_RADIUS],
    ]);

  const bins = generator(data);

  root
    .append("g")
    .attr("clip-path", `url(#${clipId})`)
    .attr("stroke", "#111827")
    .attr("stroke-width", 0.5)
    .selectAll("path")
    .data(bins)
    .join("path")
    .attr("transform", (bin) => `translate(${bin.x},${bin.y})`)
    .attr("d", generator.hexagon())
    .attr("fill", (bin) => color(sum(bin, (d) => d.gazeDuration)))
    .call((selection) =>
      applyChartInteractions(selection, crosshair, tooltip, {
        getCrosshairPos: (bin) => ({ x: bin.x, y: bin.y }),
        getTooltipData: (bin) => formatToolTipData(bin),
        onHoverIn: (element) => select(element).transition().duration(100).attr("stroke-width", 2).attr("stroke", "#000"),
        onHoverOut: (element) => select(element).transition().duration(250).attr("stroke-width", 0.5).attr("stroke", "#111827"),
      }),
    );
}

function drawGraphContext(svgElement: SVGSVGElement, width: number, height: number, color: (value: number) => string, colorDomain: [number, number], gradientId: string) {
  const root = createSvgRoot(svgElement, width, height);

  root.selectAll("*").remove();

  const legendWidth = 28;
  const legendHeight = Math.max(1, height - GRAPH_MARGIN_TOP - GRAPH_MARGIN_BOTTOM);
  const legendX = 0;
  const legendY = GRAPH_MARGIN_TOP;

  const defs = root.append("defs");
  const linearGradient = defs.append("linearGradient").attr("id", gradientId).attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");

  linearGradient
    .selectAll("stop")
    .data(
      Array.from({ length: 10 }, (_, i) => {
        const fraction = i / 9;
        return {
          offset: `${fraction * 100}%`,
          color: color(colorDomain[0] + (colorDomain[1] - colorDomain[0]) * fraction),
        };
      }),
    )
    .join("stop")
    .attr("offset", (d) => d.offset)
    .attr("stop-color", (d) => d.color);

  root.append("rect").attr("x", legendX).attr("y", legendY).attr("width", legendWidth).attr("height", legendHeight).attr("stroke", "#111827").attr("stroke-width", 0.8).style("fill", `url(#${gradientId})`);

  const legendScale = scaleLinear()
    .domain(colorDomain)
    .range([legendY + legendHeight, legendY]);

  root
    .append("g")
    .attr("transform", `translate(${legendX + legendWidth}, 0)`)
    .call(axisRight(legendScale).ticks(5, "d"))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .append("text")
        .attr("x", -legendWidth)
        .attr("y", legendY - 10)
        .attr("fill", "currentColor")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text(GRAPH_CONTEXT_LEGEND_TEXT),
    );
}

function formatToolTipData(bin: HexbinBin<EyeTrackDataPoint>) {
  return {
    title: "Hexagon Bin",
    details: [
      { label: "Points inside", value: bin.length },
      { label: "Total Duration", value: `${sum(bin, (d) => d.gazeDuration)} ms` },
    ],
  };
}
