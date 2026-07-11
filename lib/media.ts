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

    const start = parseTimeToSeconds(parsed.searchParams.get("t") ?? parsed.searchParams.get("start"));
    const end = parseTimeToSeconds(parsed.searchParams.get("end"));
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

export function isLikelyDirectVideoPath(value: string) {
  if (!/^https?:\/\//.test(value)) return Boolean(value.trim());
  return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(value);
}

function parseEmbedPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const embedIndex = parts.findIndex((part) => part === "embed" || part === "shorts");
  return embedIndex >= 0 ? parts[embedIndex + 1] : "";
}

function parseTimeToSeconds(value: string | null) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const hours = /(\d+)h/.exec(value)?.[1];
  const minutes = /(\d+)m/.exec(value)?.[1];
  const seconds = /(\d+)s/.exec(value)?.[1];
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}
