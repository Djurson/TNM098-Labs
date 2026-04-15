import { Label } from "@/components/ui/label";
import { GetClusterColor } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type Transition = {
  from: number;
  to: number;
  timestamp: number;
  fixationIndex: number;
  stayDuration: number;
};

function fmtmSToS(ms: number) {
  const ts = ms / 1000;
  const m = Math.floor(ts / 60);
  const sec = Math.round(ts % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type ClusterTimeLineProps = {
  transitions: Transition[];
  numberOfClusters: number;
  maxTime: number;
  onHoverCluster?: (clusterId: number | null) => void;
};

export function ClusterTimeLine({ transitions, numberOfClusters, maxTime, onHoverCluster }: ClusterTimeLineProps) {
  const maxSeconds = maxTime / 1000;
  const tickInterval = 20;
  const numTicks = Math.floor(maxSeconds / tickInterval) + 1;
  const ticks = Array.from({ length: numTicks }, (_, i) => i * tickInterval);

  const blocks = [];
  if (transitions && transitions.length > 0) {
    blocks.push({
      cluster: transitions[0].from,
      start: 0,
      end: transitions[0].timestamp,
    });

    for (let i = 0; i < transitions.length; i++) {
      blocks.push({
        cluster: transitions[i].to,
        start: transitions[i].timestamp,
        end: i < transitions.length - 1 ? transitions[i + 1].timestamp : maxTime,
      });
    }
  }

  return (
    <div className="flex flex-col w-full gap-3 pb-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Cluster Dominance</Label>
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="relative w-full h-4 overflow-hidden border rounded-md bg-muted/50 border-border/50">
          {blocks.map((block, i) => {
            const leftPercent = (block.start / maxTime) * 100;
            const widthPercent = ((block.end - block.start) / maxTime) * 100;

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    // Trigger the D3 function on hover!
                    onMouseEnter={() => onHoverCluster?.(block.cluster)}
                    onMouseLeave={() => onHoverCluster?.(null)}
                    className="absolute top-0 h-full transition-opacity border-r cursor-pointer border-background/20 last:border-r-0 hover:opacity-80"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: GetClusterColor(block.cluster),
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">
                    Cluster {block.cluster} ({fmtmSToS(block.start)} &ndash; {fmtmSToS(block.end)})
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* The Perfectly Aligned Ruler */}
      <div className="relative w-full h-6">
        {ticks.map((t) => {
          const leftPercent = ((t * 1000) / maxTime) * 100;

          return (
            <div
              key={t}
              className="absolute flex flex-col items-center gap-1.5"
              style={{
                left: `${leftPercent}%`,
                transform: "translateX(-50%)",
              }}>
              <div className="w-0.5 h-2 bg-primary/20 rounded" />
              <span className="font-mono text-[10px] text-muted-foreground leading-none">{fmtmSToS(t * 1000)}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-5 mt-2">
        {Array.from({ length: numberOfClusters }).map((_, i) => (
          <div className="flex items-center gap-5" key={`separator-cluster-id-${i}`}>
            {i > 0 && <Separator orientation="vertical" />}
            <div className="flex items-center justify-start gap-1.5 cursor-pointer hover:opacity-70 transition-opacity" key={`cluster-id-${i}`} onMouseEnter={() => onHoverCluster?.(i)} onMouseLeave={() => onHoverCluster?.(null)}>
              <div className="rounded-md size-4" style={{ backgroundColor: GetClusterColor(i) }} />
              <p className="text-xs text-muted-foreground">Cluster - {i}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
