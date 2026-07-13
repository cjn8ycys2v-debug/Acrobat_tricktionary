import { NextResponse } from "next/server";
import { parseTimecodeToSeconds } from "@/lib/media";
import { getAdminAccessState } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MediaAsset } from "@/lib/types";

const maxBytes = 300 * 1024 * 1024;
type MediaInput = Pick<MediaAsset, "storagePath" | "referenceUrl" | "referenceStartSec" | "referenceEndSec" | "rightsNote" | "duration" | "credit" | "consentChecked">;

export async function POST(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const formData = await request.formData();
  const slug = formData.get("slug");
  const consent = formData.get("consentChecked") === "true";
  const file = formData.get("file");

  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "video file is required" }, { status: 400 });
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "video file only" }, { status: 400 });
  }
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "file is larger than 300MB" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "consent check is required" }, { status: 400 });
  }

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", uploaded: false, message: "Supabase未設定のためアップロードはスキップしました。" }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const { data: trick, error: trickError } = await supabase.from("tricks").select("id").eq("slug", slug).single();
  if (trickError || !trick) {
    return NextResponse.json({ error: trickError?.message ?? "trick not found" }, { status: 404 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const storagePath = `${slug}/${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("trick-media").upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: mediaError } = await supabase.from("media_assets").insert({
    trick_id: trick.id,
    type: "video",
    storage_path: storagePath,
    consent_checked: true
  });
  if (mediaError) return NextResponse.json({ error: mediaError.message }, { status: 500 });

  return NextResponse.json({ uploaded: true, storagePath });
}

export async function PUT(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const body = await request.json();
  if (!body.slug || typeof body.slug !== "string") {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const mediaAssets = Array.isArray(body.mediaAssets) ? normalizeMediaAssets(body.mediaAssets) : normalizeMediaPaths(body.mediaPaths).map(mediaAssetFromPath);

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", saved: false, media: mediaAssets.length, message: "Supabase未設定のため動画パス保存はスキップしました。" }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const { data: trick, error: trickError } = await supabase.from("tricks").select("id").eq("slug", body.slug).single();
  if (trickError || !trick) {
    return NextResponse.json({ error: trickError?.message ?? "trick not found" }, { status: 404 });
  }

  const remove = await supabase.from("media_assets").delete().eq("trick_id", trick.id);
  if (remove.error) return NextResponse.json({ error: remove.error.message }, { status: 500 });

  if (mediaAssets.length) {
    const { error } = await supabase.from("media_assets").insert(
      mediaAssets.map((asset) => ({
        trick_id: trick.id,
        type: "video",
        storage_path: asset.storagePath,
        reference_url: asset.referenceUrl || null,
        reference_start_sec: asset.referenceStartSec ?? null,
        reference_end_sec: asset.referenceEndSec ?? null,
        rights_note: asset.rightsNote || null,
        duration: asset.duration ?? null,
        credit: asset.credit || null,
        consent_checked: asset.consentChecked
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, media: mediaAssets.length });
}

function normalizeMediaPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())));
}

function mediaAssetFromPath(storagePath: string): MediaInput {
  return {
    storagePath,
    consentChecked: true
  };
}

function normalizeMediaAssets(value: unknown[]): MediaInput[] {
  return value
    .map((item): MediaInput | null => {
      if (!item || typeof item !== "object") return null;
      const input = item as Record<string, unknown>;
      const storagePath = typeof input.storagePath === "string" ? input.storagePath.trim() : "";
      const referenceUrl = typeof input.referenceUrl === "string" ? input.referenceUrl.trim() : "";
      if (!storagePath && !referenceUrl) return null;
      const referenceStartSec = normalizeOptionalSecond(input.referenceStartSec);
      const referenceEndSec = normalizeOptionalSecond(input.referenceEndSec);
      return {
        storagePath,
        referenceUrl: referenceUrl || undefined,
        referenceStartSec,
        referenceEndSec,
        rightsNote: typeof input.rightsNote === "string" ? input.rightsNote.trim() : undefined,
        duration: normalizeOptionalSecond(input.duration),
        credit: typeof input.credit === "string" ? input.credit.trim() : undefined,
        consentChecked: Boolean(input.consentChecked)
      };
    })
    .filter((asset): asset is MediaInput => Boolean(asset))
    .map((asset) => {
      if (asset.referenceStartSec !== undefined && asset.referenceEndSec !== undefined && asset.referenceEndSec < asset.referenceStartSec) {
        return { ...asset, referenceEndSec: asset.referenceStartSec };
      }
      return asset;
    });
}

function normalizeOptionalSecond(value: unknown) {
  return parseTimecodeToSeconds(typeof value === "string" || typeof value === "number" ? value : undefined);
}
