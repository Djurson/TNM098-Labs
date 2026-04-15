export type EyeTrackDataPoint = {
  TimeStamp: number;
  FixationIndex: number;
  GazeDuration: number;
  GazePointIndex: number;
  ClusterLabel: number;
  position: Vector2;
};

export type Vector2 = {
  x: number;
  y: number;
};

export type TooltipData = {
  title: string;
  details: { label: string; value: string | number }[];
};
