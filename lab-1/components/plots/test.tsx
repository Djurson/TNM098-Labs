"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { EyeTrackDataPoint, Vector2 } from "@/lib/types";
import { GetClusterColor } from "@/lib/utils";

export function Test() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [allPoints, setAllPoints] = useState<EyeTrackDataPoint[]>([]);
  const [freqData, setFreqData] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetch("/clusters.json")
      .then((res) => res.json())
      .then((json) => {
        const formatted = json.points.map((p: any) => ({
          position: { x: p["GazePointX(px)"], y: p["GazePointY(px)"] },
          ClusterLabel: p.cluster,
          Timestamp: p.RecordingTimestamp,
        }));
        setAllPoints(formatted);
        setFreqData(json.frequency || []);
        setMaxTime(json.maxTime || 0);
        if (formatted.length > 0) setCurrentTime(formatted[0].Timestamp);
      });

    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPlaying && currentTime < maxTime) {
      // Speed: 500ms jump every 60ms for a steady, observable flow
      interval = setInterval(() => setCurrentTime((prev) => Math.min(prev + 500, maxTime)), 60);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, maxTime]);

  const getDominantCluster = (time: number) => {
    // Looks at the 15s bin associated with the current playback time
    const currentBin = freqData.find((b) => time >= b.time_bin && time < b.time_bin + 15000);
    if (!currentBin) return null;

    let maxVal = -1;
    let dominantId = null;
    [0, 1, 2, 3, 4, 5].forEach((id) => {
      if ((currentBin[id] || 0) > maxVal) {
        maxVal = currentBin[id];
        dominantId = id;
      }
    });
    return dominantId;
  };

  const dominantCluster = getDominantCluster(currentTime);

  useEffect(() => {
    if (!svgRef.current || dimensions.width <= 0 || dimensions.height <= 0 || allPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const xS = d3
      .scaleLinear()
      .domain([0, 1600])
      .range([60, dimensions.width - 60]);
    const yS = d3
      .scaleLinear()
      .domain([0, 1000])
      .range([dimensions.height - 60, 60]);

    svg
      .selectAll("circle")
      .data(allPoints)
      .join("circle")
      .attr("cx", (d) => xS(d.position.x))
      .attr("cy", (d) => yS(d.position.y))
      .attr("r", 5)
      .attr("fill", (d) => GetClusterColor(d.cluster))
      .attr("fill-opacity", (d) => (d.cluster === dominantCluster ? 0.9 : 0.1))
      .attr("stroke", (d) => (d.cluster === dominantCluster ? "none" : "#fff"))
      .attr("stroke-width", 0.7);
  }, [allPoints, currentTime, dimensions, dominantCluster]);

  return (
    <div className="flex flex-col h-dvh w-full bg-[#020617] text-slate-200 overflow-hidden p-6 gap-6">
      {/* 1. Timeline at the top (15s bins) */}
      <div className="flex flex-col gap-3 p-5 border shadow-2xl h-28 shrink-0 bg-slate-900/90 border-slate-800 rounded-3xl">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 font-black">
          <span>Temporal Focus Flow (15s Bins)</span>
          <span className="font-mono text-indigo-400">{(currentTime / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
          {freqData.map((bin, i) => {
            let maxVal = -1;
            let binDom = -1;
            [0, 1, 2, 3, 4, 5].forEach((id) => {
              if ((bin[id] || 0) > maxVal) {
                maxVal = bin[id];
                binDom = id;
              }
            });

            return (
              <div
                key={i}
                style={{
                  backgroundColor: GetClusterColor(binDom),
                  opacity: bin.time_bin <= currentTime ? 1 : 0.1,
                }}
                className={`h-full flex-1 rounded-md transition-all duration-700 ${bin.time_bin <= currentTime ? "scale-y-100" : "scale-y-40"}`}
              />
            );
          })}
        </div>
      </div>

      {/* 2. Controls and Header */}
      <header className="flex items-center justify-between px-2 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white">Spatio-Temporal Outlier Analysis</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            <p className="text-sm font-medium text-slate-400">
              Dimming Dominant Area: <span style={{ color: GetClusterColor(dominantCluster ?? -1) }}>{dominantCluster !== null ? `Region ${dominantCluster}` : "Initializing..."}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsPlaying(!isPlaying)} className="px-10 py-2.5 font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/30 active:scale-95">
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(allPoints[0]?.timeStamp || 0);
            }}
            className="px-6 py-2.5 font-bold bg-slate-800 rounded-2xl border border-slate-700 hover:bg-slate-700 transition-all active:scale-95">
            Restart
          </button>
        </div>
      </header>

      {/* 3. Main Plot: flex-1 takes up all remaining space */}
      <div ref={containerRef} className="flex-1 min-h-0 relative border bg-slate-900/30 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-inner">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}
