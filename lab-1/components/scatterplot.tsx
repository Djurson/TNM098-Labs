"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { select } from "d3";

export function ScatterPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(svgRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const GRAPH_WIDTH = size.width;
    const GRAPH_HEIGHT = size.height;

    if (!data || data.length === 0 || !GRAPH_WIDTH || !GRAPH_HEIGHT) {
      select(svg).selectAll("*").remove();
      return;
    }
  }, [data, size.width, size.height]);
  return <svg ref={svgRef} className="w-full h-full" />;
}
