"use client";

import { TooltipData } from "@/lib/types";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export interface TooltipRef {
  show: (data: TooltipData, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

export const ChartTooltip = forwardRef<TooltipRef, {}>((_, ref) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TooltipData | null>(null);

  useImperativeHandle(ref, () => ({
    show: (d, x, y) => {
      setData(d);
      if (divRef.current) {
        divRef.current.style.opacity = "1";
        divRef.current.style.transform = `translate(${x + 15}px, ${y + 15}px)`;
      }
    },
    move: (x, y) => {
      if (divRef.current) {
        divRef.current.style.transform = `translate(${x + 15}px, ${y + 15}px)`;
      }
    },
    hide: () => {
      if (divRef.current) {
        divRef.current.style.opacity = "0";
      }
    },
  }));

  return (
    <div
      ref={divRef}
      className="fixed z-50 p-3 text-sm transition-opacity duration-150 border rounded-lg shadow-lg opacity-0 pointer-events-none bg-white/95 backdrop-blur-sm border-slate-200 text-slate-800"
      style={{ left: 0, top: 0, willChange: "transform" }}>
      {data && (
        <>
          {data.title && <div className="pb-1 mb-1 text-xs font-bold border-b">{data.title}</div>}
          {data.details.map((item, index) => (
            <div key={index} className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
});

ChartTooltip.displayName = "ChartTooltip";
