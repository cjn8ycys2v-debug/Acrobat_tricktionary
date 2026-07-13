import type { MediaAsset } from "@/lib/types";

export function videoSrc(storagePath: string) {
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return storagePath;
  return `${supabaseUrl}/storage/v1/object/public/trick-media/${storagePath}`;
}

export function youtubeEmbedSrc(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const id = host === "youtu.be" ? parsed.pathname.slice(1).split("/")[0] : parsed.searchParams.get("v") ?? parseEmbedPath(parsed.pathname);
    if (!id || (host !== "youtu.be" && !host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com"))) return "";

    const start = parseTimecodeToSeconds(parsed.searchParams.get("t") ?? parsed.searchParams.get("start")) ?? 0;
    const end = parseTimecodeToSeconds(parsed.searchParams.get("end")) ?? 0;
    const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
    if (start) params.set("start", String(start));
    if (end) params.set("end", String(end));
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
  } catch {
    return "";
  }
}

export function timedReferenceUrl(asset: Pick<MediaAsset, "referenceUrl" | "referenceStartSec" | "referenceEndSec">) {
  if (!asset.referenceUrl) return "";
  try {
    const url = new URL(asset.referenceUrl);
    if (asset.referenceStartSec !== undefined) {
      if (url.hostname.replace(/^www\./, "") === "youtu.be") {
        url.searchParams.set("t", `${asset.referenceStartSec}s`);
      } else {
        url.searchParams.set("start", String(asset.referenceStartSec));
      }
    }
    if (asset.referenceEndSec !== undefined) url.searchParams.set("end", String(asset.referenceEndSec));
    return url.toString();
  } catch {
    return "";
  }
}

export function formatReferenceRange(asset: Pick<MediaAsset, "referenceStartSec" | "referenceEndSec">) {
  if (asset.referenceStartSec === undefined && asset.referenceEndSec === undefined) return "";
  const start = asset.referenceStartSec ?? 0;
  return asset.referenceEndSec === undefined ? `${formatSeconds(start)}〜` : `${formatSeconds(start)}〜${formatSeconds(asset.referenceEndSec)}`;
}

export function formatSeconds(totalSeconds: number) {
  const total = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function parseTimecodeToSeconds(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;

  const raw = value.trim();
  if (!raw) return undefined;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return parseTimecodeToSeconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
    } catch {
      return undefined;
    }
  }

  if (/^\d+(?:\.\d+)?$/.test(raw)) return Math.max(0, Math.round(Number(raw)));

  if (/^\d{1,2}(?::\d{1,2}){1,2}$/.test(raw)) {
    const parts = raw.split(":").map(Number);
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  let total = 0;
  let matched = false;
  const unitPattern = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|時間|m|min|mins|minute|minutes|分|s|sec|secs|second|seconds|秒)/gi;
  for (const match of raw.matchAll(unitPattern)) {
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === "h" || unit.startsWith("hr") || unit.startsWith("hour") || unit === "時間") total += amount * 3600;
    else if (unit === "m" || unit.startsWith("min") || unit.startsWith("minute") || unit === "分") total += amount * 60;
    else total += amount;
  }

  return matched ? Math.max(0, Math.round(total)) : undefined;
}

export function isLikelyDirectVideoPath(value: string) {
  if (!/^https?:\/\//.test(value)) return Boolean(value.trim());
  return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(value);
}

function parseEmbedPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const embedIndex = parts.findIndex((part) => part === "embed" || part === "shorts");
  return embedIndex >= 0 ? parts[embedIndex + 1] : "";
}
