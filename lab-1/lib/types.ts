export type EyeTrackDataPoint = {
  TimeStamp: number;
  FixationIndex: number;
  GazeDuration: number;
  GazePointIndex: number;
  position: Vector3;
};

type Vector3 = {
  x: number;
  y: number;
};
