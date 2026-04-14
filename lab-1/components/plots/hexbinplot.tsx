"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useId, useRef, useState } from "react";
import { axisBottom, axisLeft, axisRight, format, scaleLinear, sum } from "d3";
import { hexbin } from "d3-hexbin";
import { GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_LEFT, GRAPH_MARGIN_RIGHT, GRAPH_MARGIN_TOP, HEX_RADIUS } from "@/lib/utils";
import { calculateContextSvgWidth, clearSvg, createDensityColorScale, createPositionScales, createSvgRoot, drawAxes } from "@/lib/plots/chart-utils";

const GRAPH_X_LEGEND_TEXT = "Gaze X (px)";
const GRAPH_Y_LEGEND_TEXT = "Gaze Y (px)";
const GRAPH_CONTEXT_LEGEND_TEXT = "Total Duration (ms)";

export function HexBinPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const graphContextSvgRef = useRef<SVGSVGElement | null>(null);
  const baseId = useId().replace(/:/g, "");
  const gradientId = `color-gradient-${baseId}`;
  const clipId = `hexbin-clip-${baseId}`;

  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const [contextSvgWidth, setContextSvgWidth] = useState(160);

  useEffect(() => {
    if (!graphSvgRef.current) {
      return;
    }

    const graphObserver = new ResizeObserver(([entry]) => {
      setGraphSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    graphObserver.observe(graphSvgRef.current);

    return () => {
      graphObserver.disconnect();
    };
  }, []);

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
    });

    drawGraphContext({
      svgElement: graphContextSvg,
      width: graphContextWidth,
      height: graphContextHeight,
      color: colorScale,
      colorDomain,
      gradientId,
    });
  }, [data, graphSize.width, graphSize.height, gradientId, clipId, contextSvgWidth]);

  return (
    <div className="h-full flex gap-2 flex-1 flex-col">
      <div className="w-full h-full flex-1 flex gap-2">
        <svg ref={graphSvgRef} className="w-full h-full flex-14" />
        <svg ref={graphContextSvgRef} className="h-full" style={{ width: `${contextSvgWidth}px` }} />
      </div>
      <div className="flex flex-col gap-2 w-full px-8 invisible" aria-hidden="true">
        <div className="flex items-center gap-2">
          <span className="text-sm">Time (s)</span>
          <span className="text-sm">0, 0</span>
        </div>
        <div className="relative w-full select-none py-4">
          <div className="relative h-5" />
        </div>
      </div>
    </div>
  );
}

function drawHexbinGraph({ svgElement, data, width, height, color, clipId }: { svgElement: SVGSVGElement; data: EyeTrackDataPoint[]; width: number; height: number; color: (value: number) => string; clipId: string }) {
  const scales = createPositionScales(data, { width, height });

  if (!scales) {
    clearSvg(svgElement);
    return;
  }

  const { x, y } = scales;

  const generator = hexbin<EyeTrackDataPoint>()
    .x((d) => x(d.position.x))
    .y((d) => y(d.position.y))
    .radius(HEX_RADIUS)
    .extent([
      [GRAPH_MARGIN_LEFT + HEX_RADIUS, GRAPH_MARGIN_TOP + HEX_RADIUS],
      [width - GRAPH_MARGIN_RIGHT - HEX_RADIUS, height - GRAPH_MARGIN_BOTTOM - HEX_RADIUS],
    ]);

  const bins = generator(data);
  const root = createSvgRoot(svgElement, width, height);

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
    .attr("stroke", "#111827")
    .attr("stroke-width", 0.5)
    .selectAll("path")
    .data(bins)
    .join("path")
    .attr("transform", (bin) => `translate(${bin.x},${bin.y})`)
    .attr("d", generator.hexagon())
    .attr("fill", (bin) => color(sum(bin, (d) => d.GazeDuration)));
}

function drawGraphContext({ svgElement, width, height, color, colorDomain, gradientId }: { svgElement: SVGSVGElement; width: number; height: number; color: (value: number) => string; colorDomain: [number, number]; gradientId: string }) {
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
