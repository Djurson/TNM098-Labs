export type EyeTrackDataPoint = {
  timeStamp: number;
  fixationIndex: number;
  gazeDuration: number;
  gazePointIndex: number;
  cluster: number;
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

export type FullData = {
  points: EyeTrackDataPoint[];
  clusters: ClusterInfo[];
  maxTime: number;
  frequency: TimeLineBin[];
};

export type TimeLineBin = {
  time_bin: number;
  "-1": number;
  "0": number;
  "1": number;
  "2": number;
  "3": number;
  "4": number;
  "5": number;
  "6": number;
  "7": number;
  "8": number;
  "9": number;
  "10": number;
  "11": number;
  "12": number;
  "13": number;
};

export type ClusterInfo = {
  label: number;
  center: Vector2;
};

export type Transition = {
  from: number;
  to: number;
  timestamp: number;
  fixationIndex: number;
  stayDuration: number;
};
