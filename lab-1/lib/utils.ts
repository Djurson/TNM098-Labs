import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const GRAPH_MARGIN_TOP = 20;
export const GRAPH_MARGIN_RIGHT = 40;
export const GRAPH_MARGIN_BOTTOM = 50;
export const GRAPH_MARGIN_LEFT = 35;

export const HEX_RADIUS = 30;
export const SCATTER_POINTS_RADIUS = 15;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CLUSTER_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#f97316",
  "#4f46e5",
  "#14b8a6",
  "#d946ef",
  "#facc15",
  "#10b981",
  "#0ea5e9",
  "#f43f5e",
  "#8b5cf6",
  "#84cc16",
  "#3b82f6",
  "#ef4444",
  "#059669",
  "#b45309",
  "#c026d3",
  "#0369a1",
  "#be123c",
];

export const GetClusterColor = (clusterLabel: number) => {
  return CLUSTER_COLORS[clusterLabel];
};
