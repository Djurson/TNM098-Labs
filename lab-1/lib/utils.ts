import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const GRAPH_MARGIN_TOP = 20;
export const GRAPH_MARGIN_RIGHT = 40;
export const GRAPH_MARGIN_BOTTOM = 50;
export const GRAPH_MARGIN_LEFT = 35;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
