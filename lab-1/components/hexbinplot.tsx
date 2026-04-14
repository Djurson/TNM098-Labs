"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useId, useRef, useState } from "react";
import { scaleLinear, extent, select, scaleSequential, interpolateOrRd, max, axisBottom, axisLeft, axisRight } from "d3";
import { hexbin } from "d3-hexbin";
import { GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_LEFT, GRAPH_MARGIN_RIGHT, GRAPH_MARGIN_TOP } from "@/lib/utils";

const HEX_RADIUS = 15;

export function HexBinPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const graphContextSvgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = `color-gradient-${useId().replace(/:/g, "")}`;

  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const [graphContextSize, setGraphContextSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!graphSvgRef.current || !graphContextSvgRef.current) {
      return;
    }

    const graphObserver = new ResizeObserver(([entry]) => {
      setGraphSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    const graphContextObserver = new ResizeObserver(([entry]) => {
      setGraphContextSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    graphObserver.observe(graphSvgRef.current);
    graphContextObserver.observe(graphContextSvgRef.current);

    return () => {
      graphObserver.disconnect();
      graphContextObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const graphSvg = graphSvgRef.current;
    const graphContextSvg = graphContextSvgRef.current;

    if (!graphSvg || !graphContextSvg) {
      return;
    }

    const GRAPH_WIDTH = graphSize.width;
    const GRAPH_HEIGHT = graphSize.height;
    const GRAPH_CONTEXT_WIDTH = graphContextSize.width;
    const GRAPH_CONTEXT_HEIGHT = graphContextSize.height;

    if (!data || data.length === 0 || !GRAPH_WIDTH || !GRAPH_HEIGHT || !GRAPH_CONTEXT_WIDTH || !GRAPH_CONTEXT_HEIGHT) {
      select(graphSvg).selectAll("*").remove();
      select(graphContextSvg).selectAll("*").remove();
      return;
    }

    const xExtent = extent(data, (d) => d.position.x);
    const yExtent = extent(data, (d) => d.position.y);
    if (xExtent[0] === undefined || xExtent[1] === undefined || yExtent[0] === undefined || yExtent[1] === undefined) {
      return;
    }

    const generator = hexbin<EyeTrackDataPoint>()
      .x((d) => d.position.x)
      .y((d) => d.position.y)
      .radius(HEX_RADIUS);
    const bins = generator(data);
    const maxBinSize = max(bins, (d) => d.length) ?? 1;
    const colorDomain: [number, number] = [0, Math.max(maxBinSize / 2, 1)];
    const color = scaleSequential(interpolateOrRd).domain(colorDomain);

    drawHexbinGraph({
      svgElement: graphSvg,
      data,
      width: GRAPH_WIDTH,
      height: GRAPH_HEIGHT,
      color,
    });

    drawGraphContext({
      svgElement: graphContextSvg,
      width: GRAPH_CONTEXT_WIDTH,
      height: GRAPH_CONTEXT_HEIGHT,
      color,
      colorDomain,
      gradientId,
    });
  }, [data, graphSize.width, graphSize.height, graphContextSize.width, graphContextSize.height, gradientId]);

  return (
    <div className="h-full w-full flex gap-2">
      <svg ref={graphSvgRef} className="w-full h-full flex-15" />
      <svg ref={graphContextSvgRef} className="flex-1 h-full" />
    </div>
  );
}

function drawHexbinGraph({ svgElement, data, width, height, color }: { svgElement: SVGSVGElement; data: EyeTrackDataPoint[]; width: number; height: number; color: (value: number) => string }) {
  const xExtent = extent(data, (d) => d.position.x);
  const yExtent = extent(data, (d) => d.position.y);

  if (xExtent[0] === undefined || xExtent[1] === undefined || yExtent[0] === undefined || yExtent[1] === undefined) {
    return;
  }

  const x = scaleLinear()
    .domain(xExtent)
    .nice()
    .rangeRound([GRAPH_MARGIN_LEFT, width - GRAPH_MARGIN_RIGHT]);

  const y = scaleLinear()
    .domain(yExtent)
    .nice()
    .rangeRound([height - GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_TOP]);

  const generator = hexbin<EyeTrackDataPoint>()
    .x((d) => x(d.position.x))
    .y((d) => y(d.position.y))
    .radius(HEX_RADIUS)
    .extent([
      [GRAPH_MARGIN_LEFT + HEX_RADIUS, GRAPH_MARGIN_TOP + HEX_RADIUS],
      [width - GRAPH_MARGIN_RIGHT - HEX_RADIUS, height - GRAPH_MARGIN_BOTTOM - HEX_RADIUS],
    ]);

  const bins = generator(data);
  const root = select(svgElement).attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");

  root.selectAll("*").remove();

  root
    .append("g")
    .attr("transform", `translate(0,${height - GRAPH_MARGIN_BOTTOM})`)
    .call(
      axisBottom(x)
        .ticks(Math.max(2, Math.floor(width / 120)), "d")
        .tickSize(0)
        .tickPadding(8),
    )
    .call((g) => g.select(".domain").attr("stroke", "#111827").attr("stroke-width", 1.2))
    .call((g) =>
      g
        .append("text")
        .attr("x", width - GRAPH_MARGIN_RIGHT)
        .attr("y", -4)
        .attr("fill", "currentColor")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .text("Gaze X (px)"),
    );

  root
    .append("g")
    .attr("transform", `translate(${GRAPH_MARGIN_LEFT},0)`)
    .call(axisLeft(y).ticks(6, "d").tickSize(0).tickPadding(8))
    .call((g) => g.select(".domain").attr("stroke", "#111827").attr("stroke-width", 1.2))
    .call((g) =>
      g.append("text").attr("x", 4).attr("y", GRAPH_MARGIN_TOP).attr("dy", ".71em").attr("fill", "currentColor").attr("font-weight", "bold").attr("text-anchor", "start").text("Gaze Y (px)"),
    );

  const clipId = "hexbin-plot-area-clip";
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
    .attr("fill", (bin) => color(bin.length));
}

function drawGraphContext({
  svgElement,
  width,
  height,
  color,
  colorDomain,
  gradientId,
}: {
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  color: (value: number) => string;
  colorDomain: [number, number];
  gradientId: string;
}) {
  const root = select(svgElement).attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");

  root.selectAll("*").remove();

  const legendWidth = Math.min(42, Math.max(20, width * 0.22));
  const legendHeight = Math.max(1, height - GRAPH_MARGIN_TOP - GRAPH_MARGIN_BOTTOM);
  const legendX = (width - legendWidth) / 2;
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

  root
    .append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("stroke", "#111827")
    .attr("stroke-width", 0.8)
    .style("fill", `url(#${gradientId})`);

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
        .text("Density"),
    );
}
