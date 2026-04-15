"use client";

const TOTAL_MS = 281_000;

function msToMMSS(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface Cluster {
  label: string;
  color: string;
  pct: number; // fraction of total duration, must sum to 1
}

const clusters: Cluster[] = [
  { label: "Cluster A", color: "bg-blue-400", pct: 0.33 },
  { label: "Cluster B", color: "bg-red-400", pct: 0.38 },
  { label: "Cluster C", color: "bg-green-600", pct: 0.29 },
];

const MAJOR_EVERY_MS = 30_000;
const MINOR_EVERY_MS = 10_000;

const ticks = Array.from({ length: Math.floor(TOTAL_MS / MINOR_EVERY_MS) + 1 }, (_, i) => i * MINOR_EVERY_MS);

const colorMap: Record<string, string> = {
  "bg-blue-400": "bg-blue-400",
  "bg-red-400": "bg-red-400",
  "bg-green-600": "bg-green-600",
};

export default function ClusterTimeline() {
  return (
    <div className="w-full space-y-1 font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-sans">Timeline</span>
      </div>

      {/* Ruler */}
      <div className="relative h-7">
        {ticks.map((t) => {
          const pct = (t / TOTAL_MS) * 100;
          const isMajor = t % MAJOR_EVERY_MS === 0;
          return (
            <div key={t} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${pct}%` }}>
              {isMajor && (
                <span className="absolute text-[10px] text-muted-foreground leading-none" style={{ bottom: "13px", transform: "translateX(-50%)" }}>
                  {msToMMSS(t)}
                </span>
              )}
              <div className={`w-px ${isMajor ? "h-3 bg-border" : "h-1.5 bg-border/50"}`} />
            </div>
          );
        })}
      </div>

      {/* Segments */}
      <div className="flex h-9 rounded-md overflow-hidden border border-border/40">
        {clusters.map((c, i) => {
          const startMs = clusters.slice(0, i).reduce((acc, s) => acc + s.pct * TOTAL_MS, 0);
          const endMs = startMs + c.pct * TOTAL_MS;

          return (
            <div
              key={c.label}
              className={`relative flex items-center justify-center overflow-hidden transition-[filter] hover:brightness-110 ${colorMap[c.color]}`}
              style={{ width: `${c.pct * 100}%` }}
              title={`${c.label} — ${msToMMSS(startMs)} → ${msToMMSS(endMs)}`}>
              {i > 0 && <div className="absolute left-0 top-0 h-full w-px bg-black/20" />}
              <span className="text-[10px] font-medium text-white/90 drop-shadow-sm tracking-wide truncate px-1">
                {c.label}&nbsp;&nbsp;{msToMMSS(startMs)}-{msToMMSS(endMs)}
              </span>
            </div>
          );
        })}
      </div>

      {/* End-cap timestamps */}
      <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
        <span>0:00</span>
        <span>{msToMMSS(TOTAL_MS)}</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2 font-sans">
        {clusters.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${colorMap[c.color]}`} />
            <span className="text-xs text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
