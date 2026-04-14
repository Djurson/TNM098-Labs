import "server-only";

import { tsvParse } from "d3";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EyeTrackDataPoint } from "./types";
import { tryCatch } from "./trycatch";

export async function LoadData(): Promise<EyeTrackDataPoint[] | undefined> {
  const filePath = path.join(process.cwd(), "public", "data", "EyeTrack-raw.tsv");
  const { data: rawTsv, error: readError } = await tryCatch(readFile(filePath, "utf8"));

  if (readError || !rawTsv) {
    console.error("Failed to load EyeTrack data:", readError);
    return undefined;
  }

  const normalizedTsv = rawTsv.replace(/^\uFEFF/, "");

  const { data, error: parseError } = await tryCatch(
    Promise.resolve(
      tsvParse(
        normalizedTsv,
        (row): EyeTrackDataPoint => ({
          TimeStamp: Number(row["RecordingTimestamp"]),
          FixationIndex: Number(row["FixationIndex"]),
          GazeDuration: Number(row["GazeEventDuration(mS)"]),
          GazePointIndex: Number(row["GazePointIndex"]),
          position: {
            x: Number(row["GazePointX(px)"]),
            y: Number(row["GazePointY(px)"]),
          },
        }),
      ),
    ),
  );

  if (parseError || !data) {
    console.error("Failed to parse EyeTrack data:", parseError);
    return undefined;
  }

  return data;
}
