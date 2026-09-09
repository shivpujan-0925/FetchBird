import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${formattedMins}:${formattedSecs}`;
  }

  return `${mins}:${formattedSecs}`;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `~${size.toFixed(1)} ${units[unitIndex]}`;
}
