"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

// Import your provided utilities (adjust paths to match your project structure)
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { ChartTooltip, TooltipRef } from "./chart-tooltip";
import { TooltipData } from "@/lib/types";
import { applyChartInteractions, createCrosshair } from "@/lib/chart-utils";

interface TimelineData {
  Date: string;
  Total_Reports: number;
  Filtered_Reports: number;
}

interface D3TimelineProps {
  data: TimelineData[];
  onDateClick: (date: string) => void;
}

export default function D3Timeline({ data, onDateClick }: D3TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<TooltipRef>(null);

  // 1. Use your custom resize observer to make the chart perfectly responsive[cite: 13]
  const size = useResizeObserver(containerRef);

  useEffect(() => {
    if (!data.length || !svgRef.current || size.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous renders

    const margin = { top: 20, right: 30, bottom: 60, left: 40 };
    const innerWidth = size.width - margin.left - margin.right;
    const innerHeight = size.height - margin.top - margin.bottom;

    // X Scale (Categorical bands for dates)
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.Date))
      .range([0, innerWidth])
      .padding(0.2);

    // Y Scale (Linear for report counts)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.Total_Reports) || 0])
      .nice()
      .range([innerHeight, 0]);

    const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // X Axis
    root
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % 5 === 0)))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Y Axis
    root.append("g").call(d3.axisLeft(y).ticks(5, "d"));

    // Draw Background Bars (Total Reports) for context
    root
      .selectAll(".bar-total")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar-total")
      .attr("x", (d) => x(d.Date)!)
      .attr("y", (d) => y(d.Total_Reports))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerHeight - y(d.Total_Reports))
      .attr("fill", "#e2e8f0") // Light gray
      .attr("rx", 2);

    // Draw Foreground Bars (Threat Reports)
    const bars = root
      .selectAll(".bar-filtered")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar-filtered")
      .attr("x", (d) => x(d.Date)!)
      .attr("y", (d) => y(d.Filtered_Reports))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerHeight - y(d.Filtered_Reports))
      .attr("fill", "#ef4444")
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => onDateClick(d.Date));

    // 2. Initialize the crosshair utility[cite: 9]
    const crosshair = createCrosshair(svg, size, margin);

    // 3. Attach interactions, crosshairs, and tooltips automatically[cite: 9, 14]
    applyChartInteractions(bars, crosshair, tooltipRef.current, {
      getCrosshairPos: (d) => ({
        x: x(d.Date)! + x.bandwidth() / 2 + margin.left,
        y: y(d.Filtered_Reports) + margin.top,
      }),
      // Format the data exactly as your TooltipData type dictates[cite: 11]
      getTooltipData: (d): TooltipData => ({
        title: `Date: ${d.Date}`,
        details: [
          { label: "Threat Reports", value: d.Filtered_Reports },
          { label: "Total Reports", value: d.Total_Reports },
        ],
      }),
      onHoverIn: (element) => d3.select(element).attr("fill", "#b91c1c"),
      onHoverOut: (element) => d3.select(element).attr("fill", "#ef4444"),
    });
  }, [data, onDateClick, size]);

  return (
    <div ref={containerRef} className="w-full h-87.5 relative">
      <svg ref={svgRef} width="100%" height="100%" />
      {/* Attach the tooltip component[cite: 14] */}
      <ChartTooltip ref={tooltipRef} />
    </div>
  );
}
