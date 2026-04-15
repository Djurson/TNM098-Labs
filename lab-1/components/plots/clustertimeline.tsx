import { Label } from "@/components/ui/label";
import { GetClusterColor } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "../ui/button";

export type Transition = {
  from: number;
  to: number;
  timestamp: number;
  fixationIndex: number;
  stayDuration: number;
};

function formatMilliSecToSec(ms: number) {
  const ts = ms / 1000;
  const m = Math.floor(ts / 60);
  const sec = Math.round(ts % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type ClusterTimeLineProps = {
  transitions: Transition[];
  numberOfClusters: number;
  maxTime: number;
  isPlaying: boolean;
  currentTime: number;
  onHoverCluster?: (clusterId: number | null) => void;
  onClickPlay: () => void;
  onClickRestart: () => void;
};

export function ClusterTimeLine({ transitions, numberOfClusters, maxTime, isPlaying, currentTime, onHoverCluster, onClickPlay, onClickRestart }: ClusterTimeLineProps) {
  const maxSeconds = maxTime / 1000;
  const tickInterval = 20;
  const numTicks = Math.floor(maxSeconds / tickInterval) + 1;
  const ticks = Array.from({ length: numTicks }, (_, i) => i * tickInterval);

  const blocks = [];
  if (transitions && transitions.length > 0) {
    blocks.push({ cluster: transitions[0].from, start: 0, end: transitions[0].timestamp });

    for (let i = 0; i < transitions.length; i++) {
      blocks.push({ cluster: transitions[i].to, start: transitions[i].timestamp, end: i < transitions.length - 1 ? transitions[i + 1].timestamp : maxTime });
    }
  }

  return (
    <div className="flex flex-col w-full gap-3 pb-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Cluster Dominance</Label>
        <div className="flex items-center gap-3">
          <Button onClick={onClickPlay} variant={isPlaying ? "outline" : "default"} className="w-32">
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button onClick={onClickRestart} variant="secondary">
            Clear
          </Button>
          <div className="px-3 py-1 font-mono text-sm border rounded bg-muted/50">
            {formatMilliSecToSec(currentTime)} &ndash; {formatMilliSecToSec(maxTime)}
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={100}>
        {/* Removed overflow-hidden so the scaled blocks can pop out */}
        <div className="relative flex items-center w-full h-4 border rounded-md bg-muted/50 border-border/50">
          {blocks.map((block, i) => {
            const leftPercent = (block.start / maxTime) * 100;
            const widthPercent = ((block.end - block.start) / maxTime) * 100;
            const isLastBlock = i === blocks.length - 1;
            const isActive = currentTime >= block.start && (currentTime < block.end || (isLastBlock && currentTime === maxTime && currentTime > 0));

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    onMouseEnter={() => !isPlaying && onHoverCluster?.(block.cluster)}
                    onMouseLeave={() => !isPlaying && onHoverCluster?.(null)}
                    className={`absolute top-0 h-full transition-all duration-200 ease-out cursor-pointer border-background/20 
                      ${i === 0 ? "rounded-l-md" : ""} 
                      ${isLastBlock ? "rounded-r-md" : "border-r"} 
                      ${isActive ? "scale-y-150 z-10 opacity-100 shadow-sm" : "hover:opacity-80 z-0 opacity-60"}
                    `}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: GetClusterColor(block.cluster),
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">
                    Cluster {block.cluster} ({formatMilliSecToSec(block.start)} &ndash; {formatMilliSecToSec(block.end)})
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <div className="relative w-full h-6">
        {ticks.map((t) => {
          const leftPercent = ((t * 1000) / maxTime) * 100;

          return (
            <div key={t} className="absolute flex flex-col items-center gap-1.5" style={{ left: `${leftPercent}%`, transform: "translateX(-50%)" }}>
              <div className="w-0.5 h-2 bg-primary/20 rounded" />
              <span className="font-mono text-[10px] text-muted-foreground leading-none">{formatMilliSecToSec(t * 1000)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-5 mt-2">
        {Array.from({ length: numberOfClusters }).map((_, i) => (
          <div className="flex items-center gap-5" key={`separator-cluster-id-${i}`}>
            {i > 0 && <Separator orientation="vertical" />}
            <div
              className="flex items-center justify-start gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
              key={`cluster-id-${i}`}
              onMouseEnter={() => !isPlaying && onHoverCluster?.(i)}
              onMouseLeave={() => !isPlaying && onHoverCluster?.(null)}>
              <div className="rounded-md size-4" style={{ backgroundColor: GetClusterColor(i) }} />
              <p className="text-xs text-muted-foreground">Cluster - {i}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
