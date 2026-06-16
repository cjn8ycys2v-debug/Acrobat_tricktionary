import { NextResponse } from "next/server";
import { getAdminAccessState } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const maxBytes = 300 * 1024 * 1024;

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

  const mediaPaths = normalizeMediaPaths(body.mediaPaths);

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", saved: false, message: "Supabase未設定のため動画パス保存はスキップしました。" }, { status: 202 });
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

  if (mediaPaths.length) {
    const { error } = await supabase.from("media_assets").insert(
      mediaPaths.map((storagePath) => ({
        trick_id: trick.id,
        type: "video",
        storage_path: storagePath,
        consent_checked: true
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, media: mediaPaths.length });
}

function normalizeMediaPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())));
}
