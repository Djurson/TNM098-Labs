import { EyeTrackDataPoint, FullData, TimeLineBin, Vector2 } from "./types";

/**
 * Maps the raw parsed JSON from clusters.json into the strict TypeScript types.
 */
export function mapClusterData(rawData: any): FullData {
  return {
    points: rawData.points.map(
      (row: any, index: number): EyeTrackDataPoint => ({
        timeStamp: Number(row["RecordingTimestamp"]),
        fixationIndex: Number(row["FixationIndex"]),
        gazeDuration: Number(row["GazeEventDuration(mS)"]),
        gazePointIndex: Number(row["GazePointIndex"] || index),
        cluster: Number(row["cluster"]),
        position: {
          x: Number(row["GazePointX(px)"]),
          y: Number(row["GazePointY(px)"]),
        },
      }),
    ),

    centers: rawData.centers.map(
      (coord: [number, number]): Vector2 => ({
        x: coord[0],
        y: coord[1],
      }),
    ),

    maxTime: Number(rawData.maxTime),

    frequency: rawData.frequency as TimeLineBin[],
  };
}
