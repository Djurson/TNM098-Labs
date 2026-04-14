"use client";

import { EyeTrackDataPoint } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { select } from "d3";

export function ScatterPlot({ data }: { data: EyeTrackDataPoint[] }) {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const graphContextSvgRef = useRef<SVGSVGElement | null>(null);

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

  return (
    <div className="h-full flex gap-2 flex-1">
      <svg ref={graphSvgRef} className="w-full h-full flex-15" />
      <svg ref={graphContextSvgRef} className="flex-1 h-full" />
    </div>
  );
}
