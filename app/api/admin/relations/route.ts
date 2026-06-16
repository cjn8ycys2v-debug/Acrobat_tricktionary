import { NextResponse } from "next/server";
import { getAdminAccessState } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RelationType } from "@/lib/types";

type BulkRelationInput = {
  fromTrickId: string;
  toTrickId: string;
  type: RelationType;
  note: string;
  strength: 1 | 2 | 3 | 4 | 5;
};

export async function PUT(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const body = await request.json();
  if (!body.trickId || typeof body.trickId !== "string") {
    return NextResponse.json({ error: "trickId is required" }, { status: 400 });
  }

  const incomingBaseIds = normalizeIds(body.incomingBaseIds);
  const outgoingAdvancedIds = normalizeIds(body.outgoingAdvancedIds);

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", saved: false, message: "Supabase未設定のため相関保存はスキップしました。" }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const removeIncoming = await supabase
    .from("trick_relations")
    .delete()
    .eq("to_trick_id", body.trickId)
    .in("type", ["prerequisite", "progression"]);
  if (removeIncoming.error) return NextResponse.json({ error: removeIncoming.error.message }, { status: 500 });

  const removeOutgoing = await supabase
    .from("trick_relations")
    .delete()
    .eq("from_trick_id", body.trickId)
    .eq("type", "progression");
  if (removeOutgoing.error) return NextResponse.json({ error: removeOutgoing.error.message }, { status: 500 });

  const rows = [
    ...incomingBaseIds.map((fromId) => ({
      from_trick_id: fromId,
      to_trick_id: body.trickId,
      type: "prerequisite",
      note: "管理画面から登録",
      strength: 3
    })),
    ...outgoingAdvancedIds.map((toId) => ({
      from_trick_id: body.trickId,
      to_trick_id: toId,
      type: "progression",
      note: "管理画面から登録",
      strength: 3
    }))
  ];

  if (rows.length) {
    const { error } = await supabase.from("trick_relations").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, relations: rows.length });
}

export async function PATCH(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const body = await request.json();
  const relations = normalizeBulkRelations(body.relations);

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", saved: false, relations: relations.length }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const removeExisting = await supabase.from("trick_relations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (removeExisting.error) return NextResponse.json({ error: removeExisting.error.message }, { status: 500 });

  const rows = relations.map((relation) => ({
    from_trick_id: relation.fromTrickId,
    to_trick_id: relation.toTrickId,
    type: relation.type,
    note: relation.note,
    strength: relation.strength
  }));

  if (rows.length) {
    const { error } = await supabase.from("trick_relations").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, relations: rows.length });
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item))));
}

function normalizeBulkRelations(value: unknown): BulkRelationInput[] {
  if (!Array.isArray(value)) return [];
  const relationTypes = new Set<RelationType>(["prerequisite", "progression", "variation", "combo"]);
  const seen = new Set<string>();
  const relations: BulkRelationInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const input = item as Record<string, unknown>;
    if (typeof input.fromTrickId !== "string" || typeof input.toTrickId !== "string") continue;
    if (input.fromTrickId === input.toTrickId) continue;
    if (!relationTypes.has(input.type as RelationType)) continue;
    const strength = Math.max(1, Math.min(5, Number(input.strength) || 3)) as 1 | 2 | 3 | 4 | 5;
    const key = `${input.fromTrickId}\u0000${input.toTrickId}\u0000${input.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    relations.push({
      fromTrickId: input.fromTrickId,
      toTrickId: input.toTrickId,
      type: input.type as RelationType,
      note: typeof input.note === "string" ? input.note : "",
      strength
    });
  }

  return relations;
}
