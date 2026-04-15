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
      if (entries[0]) setDimensions({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // SLOWER ANIMATION: Reduced increment to 500ms per 60ms tick
  useEffect(() => {
    let interval: any;
    if (isPlaying && currentTime < maxTime) {
      interval = setInterval(() => setCurrentTime((prev) => Math.min(prev + 500, maxTime)), 60);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, maxTime]);

  // Updated for 15s (15000ms) logic
  const getDominantCluster = (time: number) => {
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
    if (!svgRef.current || dimensions.width === 0 || allPoints.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const xS = d3
      .scaleLinear()
      .domain([0, 1600])
      .range([50, dimensions.width - 50]);
    const yS = d3
      .scaleLinear()
      .domain([0, 1000])
      .range([dimensions.height - 50, 50]);

    // Draw all points with "Attention Highlighting"
    svg
      .selectAll("circle")
      .data(allPoints)
      .join("circle")
      .attr("cx", (d) => xS(d.position.x))
      .attr("cy", (d) => yS(d.position.y))
      .attr("r", 4.5)
      .attr("fill", (d) => GetClusterColor(d.ClusterLabel))
      // Highlight: High opacity for distractions (outliers), low for dominant ROI
      .attr("fill-opacity", (d) => (d.ClusterLabel === dominantCluster ? 0.1 : 0.9))
      .attr("stroke", (d) => (d.ClusterLabel === dominantCluster ? "none" : "#fff"))
      .attr("stroke-width", 0.5);
  }, [allPoints, currentTime, dimensions, dominantCluster]);

  return (
    <div className="flex flex-col h-dvh w-full bg-[#0f172a] text-slate-200 overflow-hidden p-6 gap-6">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Temporal ROI Dominance</h1>
          <p className="flex items-center gap-2 text-sm text-slate-400">
            Active Attention:
            <span className="font-bold" style={{ color: GetClusterColor(dominantCluster ?? -1) }}>
              {dominantCluster !== null ? `Region ${dominantCluster}` : "Scanning..."}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsPlaying(!isPlaying)} className="px-8 py-2 font-bold text-white transition-all bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-500 shadow-indigo-500/20">
            {isPlaying ? "Pause" : "Start Analysis"}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(allPoints[0]?.TimeStamp || 0);
            }}
            className="px-6 py-2 font-bold border rounded-lg bg-slate-800 hover:bg-slate-700 border-slate-700">
            Restart
          </button>
        </div>
      </header>

      <div ref={containerRef} className="relative flex-1 overflow-hidden border bg-slate-900/50 border-slate-800 rounded-3xl">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      <div className="flex flex-col h-32 gap-3 p-5 mb-2 border shrink-0 bg-slate-900/80 border-slate-800 rounded-3xl">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 font-black">
          <span>15s Time-Bin Sequence</span>
          <span className="text-indigo-400">Current Phase: {Math.round(currentTime / 1000)}s</span>
        </div>
        <div className="flex-1 flex items-center gap-0.75 overflow-hidden">
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
                  opacity: bin.time_bin <= currentTime ? 1 : 0.15,
                }}
                className={`h-full flex-1 rounded-sm transition-all duration-700 ${bin.time_bin <= currentTime ? "scale-y-100" : "scale-y-40"}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
