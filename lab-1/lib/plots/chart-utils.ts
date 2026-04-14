import { extent, format, interpolateOrRd, max, scaleLinear, scaleSequential, select, sum, type ScaleLinear, type ScaleSequential } from "d3";
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
    .domain(xExtent)
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
