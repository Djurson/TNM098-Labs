"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

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
  selectedDate: string | null;
  selectedTopicId: number | null;
  colors: Record<number, string>;
}

export default function D3Timeline({ data, onDateClick, selectedDate, selectedTopicId, colors }: D3TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<TooltipRef>(null);
  const size = useResizeObserver(containerRef);

  useEffect(() => {
    if (!data.length || !svgRef.current || size.width === 0) return;

    const topicKeys = ["Topic_1", "Topic_2", "Topic_3"];
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

    const stackGenerator = d3.stack<TimelineData>().keys(topicKeys).order(d3.stackOrderNone).offset(d3.stackOffsetNone);

    const layers = stackGenerator(data);

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
      .attr("rx", 2)
      .style("opacity", (d) => (selectedDate && d.Date !== selectedDate ? 0.2 : 0.5));

    const layerGroups = root
      .selectAll(".layer")
      .data(layers)
      .enter()
      .append("g")
      .attr("class", "layer")
      // Color each layer based on the topic ID (e.g., Topic_1 -> 1)
      .attr("fill", (d) => {
        const id = parseInt(d.key.split("_")[1]);
        return colors[id as keyof typeof colors];
      });

    const bars = layerGroups
      .selectAll("rect")
      .data((d) => d) // Join the individual segments for each date
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.data.Date)!)
      .attr("y", (d) => y(d[1]))
      .attr("height", (d) => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .attr("rx", 1)
      .style("cursor", "pointer")
      .style("transition", "opacity 0.2s")
      .style("opacity", (d, i, nodes) => {
        // 1. Check if a different date is selected
        const isOtherDate = selectedDate && d.data.Date !== selectedDate;

        // 2. Cast parentNode to Element to satisfy TypeScript
        const parentNode = nodes[i].parentNode as Element;
        if (!parentNode) return 1;

        // 3. Safely access the topic key from the parent group
        const parentDatum = d3.select(parentNode).datum() as { key: string };
        const topicId = parseInt(parentDatum.key.split("_")[1]);

        const isOtherTopic = selectedTopicId && topicId !== selectedTopicId;

        // Return dimmed opacity if either filter is active and doesn't match
        return isOtherDate || isOtherTopic ? 0.3 : 1;
      })
      .on("click", (event, d) => onDateClick(d.data.Date));
    // 2. Initialize the crosshair utility
    const crosshair = createCrosshair(svg, size, margin);

    // 3. Attach interactions, crosshairs, and tooltips automatically
    applyChartInteractions(bars, crosshair, tooltipRef.current, {
      getCrosshairPos: (d) => ({
        x: x(d.data.Date)! + x.bandwidth() / 2 + margin.left,
        y: y(d.data.Filtered_Reports) + margin.top,
      }),
      // Format the data exactly as your TooltipData type dictates
      getTooltipData: (d): TooltipData => ({
        title: `Date: ${d.data.Date}`,
        details: [
          { label: "Threat Reports", value: d.data.Filtered_Reports },
          { label: "Total Reports", value: d.data.Total_Reports },
        ],
      }),
      onHoverIn: (element) => {
        d3.select(element).style("opacity", 1).style("filter", "brightness(1.2)");
      },
      onHoverOut: (element, d) => {
        // Return to dimmed state (0.3) if another date is selected, else full opacity
        const isOtherDate = selectedDate && d.data.Date !== selectedDate;
        d3.select(element)
          .style("opacity", isOtherDate ? 0.3 : 1)
          .style("filter", "none");
      },
    });
  }, [data, onDateClick, size, selectedDate, selectedTopicId, colors]);

  return (
    <div ref={containerRef} className="w-full h-87.5 relative">
      <svg ref={svgRef} width="100%" height="100%" />
      <ChartTooltip ref={tooltipRef} />
    </div>
  );
}
