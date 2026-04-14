import { extent, format, interpolateOrRd, max, scaleLinear, scaleSequential, select, sum, axisBottom, axisLeft, type ScaleLinear, type ScaleSequential, type Selection } from "d3";
import type { HexbinBin } from "d3-hexbin";
import { EyeTrackDataPoint } from "@/lib/types";
import { GRAPH_MARGIN_BOTTOM, GRAPH_MARGIN_LEFT, GRAPH_MARGIN_RIGHT, GRAPH_MARGIN_TOP } from "../utils";

export type ChartSize = {
  width: number;
  height: number;
};

export type ChartMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PositionScales = {
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
};

export function clearSvg(svgElement: SVGSVGElement) {
  select(svgElement).selectAll("*").remove();
}

export function createSvgRoot(svgElement: SVGSVGElement, width: number, height: number) {
  return select(svgElement).attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
}

export function createPositionScales(data: EyeTrackDataPoint[], size: ChartSize, margins: ChartMargins = { top: GRAPH_MARGIN_TOP, bottom: GRAPH_MARGIN_BOTTOM, left: GRAPH_MARGIN_LEFT, right: GRAPH_MARGIN_RIGHT }): PositionScales | undefined {
  const xExtent = extent(data, (d) => d.position.x);
  const yExtent = extent(data, (d) => d.position.y);

  if (xExtent[0] === undefined || xExtent[1] === undefined || yExtent[0] === undefined || yExtent[1] === undefined) {
    return undefined;
  }

  const x = scaleLinear()
    .domain([xExtent[0], xExtent[1] + 100])
    .nice()
    .rangeRound([margins.left, size.width - margins.right]);

  const y = scaleLinear()
    .domain(yExtent)
    .nice()
    .rangeRound([size.height - margins.bottom, margins.top]);

  return { x, y };
}

export function createDensityColorScale(bins: HexbinBin<EyeTrackDataPoint>[]): {
  scale: ScaleSequential<string, never>;
  domain: [number, number];
} {
  const maxDuration = max(bins, (bin) => sum(bin, (d) => d.GazeDuration)) || 1;
  const domain: [number, number] = [0, maxDuration];
  const scale = scaleSequential(interpolateOrRd).domain(domain);

  return { scale, domain };
}

export function calculateContextSvgWidth(colorDomain: [number, number], legend_text: string) {
  const measureTextWidth = (text: string, font = "600 12px sans-serif") => {
    if (typeof document === "undefined") {
      return text.length * 8;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return text.length * 8;
    }

    context.font = font;
    return Math.ceil(context.measureText(text).width);
  };

  const legendWidth = 28;
  const tickLabelFormat = format("d");
  const tickLabels = scaleLinear()
    .domain(colorDomain)
    .ticks(5)
    .map((tick) => tickLabelFormat(tick));
  const maxTickWidth = Math.max(...tickLabels.map((label) => measureTextWidth(label)), 0);
  const labelWidth = measureTextWidth(legend_text);

  const horizontalPadding = 8;
  const axisBlockWidth = legendWidth + 6 + maxTickWidth;
  const contentWidth = Math.max(axisBlockWidth, labelWidth);

  return horizontalPadding * 2 + contentWidth;
}

/**
 * Creates an opacity scale based on GazeDuration.
 * Maps the minimum duration to minOpacity and the max duration to maxOpacity.
 */
export function createOpacityScale(data: EyeTrackDataPoint[], minOpacity: number = 0.15, maxOpacity: number = 0.85): ScaleLinear<number, number> {
  const maxDuration = max(data, (d) => d.GazeDuration) || 1;
  return scaleLinear().domain([0, maxDuration]).range([minOpacity, maxOpacity]);
}

/**
 * Reusable function to draw standard X and Y axes.
 */
export function drawAxes(root: Selection<SVGSVGElement, unknown, null, undefined>, scales: PositionScales, size: ChartSize, margins: ChartMargins, xLabel: string, yLabel: string) {
  const { x, y } = scales;
  const { width, height } = size;

  // X Axis
  root
    .append("g")
    .attr("transform", `translate(0,${height - margins.bottom})`)
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
        .attr("x", width - margins.right)
        .attr("y", -4)
        .attr("fill", "currentColor")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .text(xLabel),
    );

  // Y Axis
  root
    .append("g")
    .attr("transform", `translate(${margins.left},0)`)
    .call(axisLeft(y).ticks(6, "d").tickSize(0).tickPadding(8))
    .call((g) => g.select(".domain").attr("stroke", "#111827").attr("stroke-width", 1.2))
    .call((g) => g.append("text").attr("x", 4).attr("y", margins.top).attr("dy", ".71em").attr("fill", "currentColor").attr("font-weight", "bold").attr("text-anchor", "start").text(yLabel));
}
