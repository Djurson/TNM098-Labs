import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const GRAPH_MARGIN_TOP = 40;
export const GRAPH_MARGIN_RIGHT = 100;
export const GRAPH_MARGIN_BOTTOM = 80;
export const GRAPH_MARGIN_LEFT = 60;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
