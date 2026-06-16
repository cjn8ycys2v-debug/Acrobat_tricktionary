import { NextResponse } from "next/server";
import { getAdminAccessState } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedFields = [
  "slug",
  "name",
  "aliases",
  "summary",
  "description",
  "difficulty",
  "riskLevel",
  "family",
  "axis",
  "takeoff",
  "landing",
  "ropeContext",
  "tags",
  "level",
  "levelCategory",
  "status",
  "showSource"
] as const;

const columnMap: Record<(typeof allowedFields)[number], string> = {
  slug: "slug",
  name: "name",
  aliases: "aliases",
  summary: "summary",
  description: "description",
  difficulty: "difficulty",
  riskLevel: "risk_level",
  family: "family",
  axis: "axis",
  takeoff: "takeoff",
  landing: "landing",
  ropeContext: "rope_context",
  tags: "tags",
  level: "level",
  levelCategory: "level_category",
  status: "status",
  showSource: "show_source"
};

export async function PATCH(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const body = await request.json();
  if ((!body.id || typeof body.id !== "string") && (!body.slug || typeof body.slug !== "string")) {
    return NextResponse.json({ error: "id or slug is required" }, { status: 400 });
  }

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", saved: false, message: "Supabase未設定のためDB保存はスキップしました。" }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) update[columnMap[field]] = body[field];
  }

  const query = supabase.from("tricks").update(update);
  const { error } = body.id ? await query.eq("id", body.id) : await query.eq("slug", body.slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ saved: true });
}

export async function POST(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const body = await request.json();
  if (!body.slug || !body.name || typeof body.slug !== "string" || typeof body.name !== "string") {
    return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
  }

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", created: false, message: "Supabase未設定のためDB作成はスキップしました。" }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const insert: Record<string, unknown> = {
    slug: body.slug,
    name: body.name,
    aliases: body.aliases ?? [],
    summary: body.summary ?? "新規下書き",
    description: body.description ?? "管理画面から説明を追加してください。",
    difficulty: body.difficulty ?? 1,
    risk_level: body.riskLevel ?? 1,
    family: body.family ?? "未分類",
    axis: body.axis ?? "未分類",
    takeoff: body.takeoff ?? "未設定",
    landing: body.landing ?? "未設定",
    rope_context: body.ropeContext ?? "未設定",
    tags: body.tags ?? [],
    level: body.level ?? null,
    level_category: body.levelCategory ?? "未分類",
    status: "draft",
    show_source: false
  };
  if (typeof body.id === "string") insert.id = body.id;

  const { error } = await supabase.from("tricks").insert(insert);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: true });
}

export async function DELETE(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", deleted: false, message: "Supabase未設定のためDB削除はスキップしました。" }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const { error } = await supabase.from("tricks").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
