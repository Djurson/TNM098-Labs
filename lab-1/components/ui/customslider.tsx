"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export type RangeSliderProps = {
  id?: string;
  /** Minimum value of the slider */
  min?: number;
  /** Maximum value of the slider */
  max?: number;
  /** Step increment */
  step?: number;
  /** Controlled value [low, high] */
  value?: [number, number];
  /** Uncontrolled default value [low, high] */
  defaultValue?: [number, number];
  /** Called on every change while dragging */
  onChange?: (value: [number, number]) => void;
  /** Called only when the user releases the mouse */
  onChangeEnd?: (value: [number, number]) => void;
  /** Disables all interaction */
  disabled?: boolean;
  /** Extra class names for the root element */
  className?: string;
};

export function RangeSlider({ min = 0, max = 100, step = 1, value: controlledValue, defaultValue = [25, 75], onChange, onChangeEnd, disabled = false, className, id }: RangeSliderProps) {
  const isControlled = controlledValue !== undefined;

  const [internalValue, setInternalValue] = useState<[number, number]>(controlledValue ?? defaultValue);

  const [lo, hi] = isControlled ? controlledValue! : internalValue;
  const isSameRange = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

  // Sync controlled value into internal state when it changes externally
  useEffect(() => {
    if (isControlled && controlledValue) {
      setInternalValue((prev) => (isSameRange(prev, controlledValue) ? prev : controlledValue));
    }
  }, [isControlled, controlledValue]);

  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: "left" | "right" | "pan";
    startPct?: number;
    startLo?: number;
    startHi?: number;
    gap?: number;
    hi?: number;
    lo?: number;
  } | null>(null);

  const [dragging, setDragging] = useState<"left" | "right" | "pan" | null>(null);

  const snap = useCallback((v: number) => Math.round(v / step) * step, [step]);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const getRawVal = useCallback(
    (clientX: number) => {
      const rect = trackRef.current!.getBoundingClientRect();
      const p = clamp((clientX - rect.left) / rect.width, 0, 1);
      return snap(p * (max - min) + min);
    },
    [max, min, snap],
  );

  const update = useCallback(
    (next: [number, number]) => {
      const current = isControlled ? (controlledValue ?? internalValueRef.current) : internalValueRef.current;
      if (isSameRange(current, next)) return;

      if (!isControlled) setInternalValue(next);
      onChange?.(next);
    },
    [isControlled, onChange, controlledValue],
  );

  const startDrag = useCallback(
    (type: "left" | "right" | "pan", e: React.MouseEvent, extra: Record<string, number> = {}) => {
      if (disabled) return;
      e.stopPropagation();
      e.preventDefault();

      dragRef.current = { type, ...extra };
      setDragging(type);

      const onMove = (e: MouseEvent) => {
        const d = dragRef.current!;
        const v = getRawVal(e.clientX);

        if (d.type === "left") {
          const next: [number, number] = [clamp(v, min, d.hi! - step), d.hi!];
          update(next);
        } else if (d.type === "right") {
          const next: [number, number] = [d.lo!, clamp(v, d.lo! + step, max)];
          update(next);
        } else if (d.type === "pan") {
          const rect = trackRef.current!.getBoundingClientRect();
          const p = clamp((e.clientX - rect.left) / rect.width, 0, 1);
          const dv = snap((p - d.startPct!) * (max - min));
          const newLo = clamp(d.startLo! + dv, min, max - d.gap!);
          const newHi = clamp(newLo + d.gap!, min, max);
          update([newLo, newHi]);
        }
      };

      const onUp = (e: MouseEvent) => {
        const d = dragRef.current!;
        const v = getRawVal(e.clientX);

        let finalValue: [number, number];
        if (d.type === "left") {
          finalValue = [clamp(v, min, d.hi! - step), d.hi!];
        } else if (d.type === "right") {
          finalValue = [d.lo!, clamp(v, d.lo! + step, max)];
        } else {
          // For pan, just report the last updated value
          finalValue = isControlled ? controlledValue! : internalValueRef.current;
        }

        onChangeEnd?.(finalValue);
        dragRef.current = null;
        setDragging(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [disabled, getRawVal, min, max, step, snap, update, onChangeEnd, isControlled, controlledValue],
  );

  // Keep a ref to internal value so the mouseup closure can read latest value
  const internalValueRef = useRef<[number, number]>(internalValue);
  useEffect(() => {
    internalValueRef.current = internalValue;
  }, [internalValue]);

  const loPct = pct(lo);
  const hiPct = pct(hi);

  return (
    <div className={cn("relative w-full select-none py-4", className)} aria-disabled={disabled} id={id}>
      {/* Track */}
      <div ref={trackRef} className="relative h-5 flex items-center">
        {/* Background */}
        <div className={cn("absolute inset-x-0 h-1 rounded-full bg-secondary", disabled && "opacity-50")} />

        {/* Filled range — drag to pan */}
        <div
          className={cn("absolute h-1 rounded-full bg-primary transition-none", disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing")}
          style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
          onMouseDown={(e) => {
            const rect = trackRef.current!.getBoundingClientRect();
            const startPct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            startDrag("pan", e, {
              startPct,
              startLo: lo,
              startHi: hi,
              gap: hi - lo,
            });
          }}
        />

        {/* Left thumb */}
        <Thumb pct={loPct} active={dragging === "left"} disabled={disabled} label={`Low value: ${lo}`} onMouseDown={(e) => startDrag("left", e, { hi })} />

        {/* Right thumb */}
        <Thumb pct={hiPct} active={dragging === "right"} disabled={disabled} label={`High value: ${hi}`} onMouseDown={(e) => startDrag("right", e, { lo })} />
      </div>
    </div>
  );
}

interface ThumbProps {
  pct: number;
  active: boolean;
  disabled: boolean;
  label: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

function Thumb({ pct, active, disabled, label, onMouseDown }: ThumbProps) {
  return (
    <div
      role="slider"
      aria-label={label}
      className={cn(
        "absolute z-10 w-4 h-4 -translate-x-1/2 rounded-full border-2 border-primary bg-background transition-shadow",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing",
        active && "ring-2 ring-ring ring-offset-background ring-offset-2",
      )}
      style={{ left: `${pct}%` }}
      onMouseDown={disabled ? undefined : onMouseDown}
    />
  );
}
