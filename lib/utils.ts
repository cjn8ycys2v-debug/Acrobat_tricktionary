import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function ratingDots(value: number, max = 5) {
  return Array.from({ length: max }, (_, index) => index < value);
}

export function relationLabel(type: string) {
  switch (type) {
    case "prerequisite":
      return "前提";
    case "progression":
      return "派生";
    case "variation":
      return "変化";
    case "combo":
      return "連携";
    default:
      return type;
  }
}
