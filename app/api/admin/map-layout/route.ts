import { NextResponse } from "next/server";
import { getAdminAccessState } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PositionInput = {
  trickId: string;
  x: number;
  y: number;
};

export async function PUT(request: Request) {
  const access = await getAdminAccessState();
  if (!access.isAdmin) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const body = await request.json();
  const positions = normalizePositions(body.positions);

  if (!positions.length) {
    return NextResponse.json({ error: "positions are required" }, { status: 400 });
  }

  if (access.mode === "prototype") {
    return NextResponse.json({ mode: "prototype", saved: false, positions: positions.length }, { status: 202 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase is not configured" }, { status: 500 });
  }

  const rows = positions.map((position) => ({
    trick_id: position.trickId,
    x: position.x,
    y: position.y
  }));

  const { error } = await supabase.from("trick_map_positions").upsert(rows, { onConflict: "trick_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ saved: true, positions: rows.length });
}

function normalizePositions(value: unknown): PositionInput[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const positions: PositionInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const input = item as Record<string, unknown>;
    if (typeof input.trickId !== "string" || !Number.isFinite(input.x) || !Number.isFinite(input.y)) continue;
    if (seen.has(input.trickId)) continue;
    seen.add(input.trickId);
    positions.push({
      trickId: input.trickId,
      x: Math.round(input.x as number),
      y: Math.round(input.y as number)
    });
  }

  return positions;
}
