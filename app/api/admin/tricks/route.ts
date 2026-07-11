import { NextResponse } from "next/server";
import { getAdminAccessState } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedFields = [
  "slug",
  "name",
  "aliases",
  "summary",
  "description",
  "originNote",
  "practiceSteps",
  "commonMistakes",
  "safetyNotes",
  "coachComment",
  "knowledgeStatus",
  "knowledgeReviewedBy",
  "knowledgeSourceUrls",
  "showKnowledgeSources",
  "difficulty",
  "riskLevel",
  "discipline",
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
  originNote: "origin_note",
  practiceSteps: "practice_steps",
  commonMistakes: "common_mistakes",
  safetyNotes: "safety_notes",
  coachComment: "coach_comment",
  knowledgeStatus: "knowledge_status",
  knowledgeReviewedBy: "knowledge_reviewed_by",
  knowledgeSourceUrls: "knowledge_source_urls",
  showKnowledgeSources: "show_knowledge_sources",
  difficulty: "difficulty",
  riskLevel: "risk_level",
  discipline: "discipline",
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
    origin_note: body.originNote ?? "発祥・由来は監修後に追記してください。",
    practice_steps: body.practiceSteps ?? [],
    common_mistakes: body.commonMistakes ?? [],
    safety_notes: body.safetyNotes ?? [],
    coach_comment: body.coachComment ?? "",
    knowledge_status: body.knowledgeStatus ?? "draft",
    knowledge_reviewed_by: body.knowledgeReviewedBy ?? "",
    knowledge_source_urls: body.knowledgeSourceUrls ?? [],
    show_knowledge_sources: body.showKnowledgeSources ?? false,
    difficulty: body.difficulty ?? 1,
    risk_level: body.riskLevel ?? 1,
    discipline: body.discipline ?? "ダブルダッチ",
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
