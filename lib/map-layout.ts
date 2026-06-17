import type { Trick, TrickMapPosition, TrickRelation } from "@/lib/types";
import { compareDisciplines } from "@/lib/taxonomy";

const columnGap = 320;
const rowGap = 112;
const familyGap = 24;
const laneGap = 220;
const componentGap = 86;
const optimizationPasses = 6;

export const primarySkillRelationTypes = ["prerequisite", "progression"] as const;

type LayoutColumn = {
  rank: number;
  tricks: Trick[];
};

type Score = {
  value?: number;
  weight: number;
};

export function makeLevelColumnLayout(tricks: Trick[], relations: TrickRelation[]): TrickMapPosition[] {
  if (!tricks.length) return [];

  const trickById = new Map(tricks.map((trick) => [trick.id, trick]));
  const validRelations = relations.filter((relation) => trickById.has(relation.fromTrickId) && trickById.has(relation.toTrickId) && isPrimarySkillRelation(relation));
  const disciplines = Array.from(new Set(tricks.map((trick) => trick.discipline))).sort(compareDisciplines);
  const positions: TrickMapPosition[] = [];
  let laneTop = 0;

  for (const discipline of disciplines) {
    const laneTricks = tricks.filter((trick) => trick.discipline === discipline);
    const laneIds = new Set(laneTricks.map((trick) => trick.id));
    const laneRelations = validRelations.filter((relation) => laneIds.has(relation.fromTrickId) && laneIds.has(relation.toTrickId));
    const { positions: lanePositions, height } = layoutLane(laneTricks, laneRelations, laneTop);
    positions.push(...lanePositions);
    laneTop += height + laneGap;
  }

  return positions;
}

export function makeDirectSkillTreeRelations(relations: TrickRelation[], tricks: Trick[] = [], options: { maxIncomingPerTarget?: number } = {}) {
  const trickIds = tricks.length ? new Set(tricks.map((trick) => trick.id)) : null;
  const trickById = new Map(tricks.map((trick) => [trick.id, trick]));
  const primary = relations.filter((relation) => isPrimarySkillRelation(relation) && (!trickIds || (trickIds.has(relation.fromTrickId) && trickIds.has(relation.toTrickId))));
  const bestByPair = new Map<string, TrickRelation>();

  for (const relation of primary) {
    const key = `${relation.fromTrickId}\u0000${relation.toTrickId}`;
    const current = bestByPair.get(key);
    if (!current || relationWeight(relation) > relationWeight(current)) bestByPair.set(key, relation);
  }

  const deduped = Array.from(bestByPair.values());
  const adjacency = new Map<string, string[]>();

  for (const relation of deduped) {
    const outgoing = adjacency.get(relation.fromTrickId) ?? [];
    outgoing.push(relation.toTrickId);
    adjacency.set(relation.fromTrickId, outgoing);
  }

  const direct = deduped.filter((relation) => !hasAlternativePath(relation.fromTrickId, relation.toTrickId, relation, adjacency));
  return limitIncomingRelations(direct, trickById, options.maxIncomingPerTarget ?? 1);
}

export function isPrimarySkillRelation(relation: Pick<TrickRelation, "type">) {
  return primarySkillRelationTypes.includes(relation.type as (typeof primarySkillRelationTypes)[number]);
}

function layoutLane(tricks: Trick[], relations: TrickRelation[], laneTop: number) {
  const components = makeWeakComponents(tricks, relations);
  const positions: TrickMapPosition[] = [];
  let componentTop = laneTop;

  for (const componentTricks of components) {
    const componentIds = new Set(componentTricks.map((trick) => trick.id));
    const componentRelations = relations.filter((relation) => componentIds.has(relation.fromTrickId) && componentIds.has(relation.toTrickId));
    const component = layoutComponent(componentTricks, componentRelations, componentTop);
    positions.push(...component.positions);
    componentTop += component.height + componentGap;
  }

  return {
    positions,
    height: Math.max(rowGap, componentTop - laneTop - componentGap)
  };
}

function layoutComponent(tricks: Trick[], relations: TrickRelation[], top: number) {
  const columns = makeInitialColumns(tricks, relations);
  const columnIndexByTrickId = new Map<string, number>();
  columns.forEach((column, columnIndex) => {
    column.tricks.forEach((trick) => columnIndexByTrickId.set(trick.id, columnIndex));
  });

  for (let pass = 0; pass < optimizationPasses; pass += 1) {
    sortForward(columns, relations, columnIndexByTrickId);
    sortBackward(columns, relations, columnIndexByTrickId);
  }

  const columnHeights = columns.map((column) => measureColumnHeight(column.tricks));
  const laneHeight = Math.max(rowGap, ...columnHeights);
  const positions = columns.flatMap((column, columnIndex) => {
    let y = top + Math.max(0, (laneHeight - columnHeights[columnIndex]) / 2);
    let previousFamily = "";

    return column.tricks.map((trick, index) => {
      if (index > 0 && trick.family !== previousFamily) y += familyGap;
      previousFamily = trick.family;

      const position = {
        trickId: trick.id,
        x: columnIndex * columnGap,
        y
      };
      y += rowGap;
      return position;
    });
  });

  return { positions, height: laneHeight };
}

function makeWeakComponents(tricks: Trick[], relations: TrickRelation[]) {
  const trickById = new Map(tricks.map((trick) => [trick.id, trick]));
  const neighbors = new Map(tricks.map((trick) => [trick.id, new Set<string>()]));

  for (const relation of relations) {
    neighbors.get(relation.fromTrickId)?.add(relation.toTrickId);
    neighbors.get(relation.toTrickId)?.add(relation.fromTrickId);
  }

  const visited = new Set<string>();
  const components: Trick[][] = [];

  for (const trick of [...tricks].sort(compareTricks)) {
    if (visited.has(trick.id)) continue;
    const queue = [trick.id];
    const component: Trick[] = [];

    while (queue.length) {
      const id = queue.shift();
      if (!id || visited.has(id)) continue;
      visited.add(id);
      const current = trickById.get(id);
      if (current) component.push(current);
      for (const next of neighbors.get(id) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }

    components.push(component.sort(compareTricks));
  }

  return components.sort(compareComponents);
}

export function makeLevelColumnLayoutMap(tricks: Trick[], relations: TrickRelation[]) {
  return new Map(makeLevelColumnLayout(tricks, relations).map((position) => [position.trickId, position] as const));
}

function makeInitialColumns(tricks: Trick[], relations: TrickRelation[]): LayoutColumn[] {
  const rankById = makeRankByTrickId(tricks, relations);
  const byRank = new Map<number, Trick[]>();
  for (const trick of tricks) {
    const rank = rankById.get(trick.id) ?? 0;
    const group = byRank.get(rank) ?? [];
    group.push(trick);
    byRank.set(rank, group);
  }

  return Array.from(byRank.entries())
    .sort(([a], [b]) => a - b)
    .map(([rank, group]) => ({
      rank,
      tricks: group.sort(compareTricks)
    }));
}

function makeRankByTrickId(tricks: Trick[], relations: TrickRelation[]) {
  const rankById = new Map(tricks.map((trick) => [trick.id, 0]));
  const outgoing = new Map<string, TrickRelation[]>();
  const indegree = new Map(tricks.map((trick) => [trick.id, 0]));

  for (const relation of relations) {
    const group = outgoing.get(relation.fromTrickId) ?? [];
    group.push(relation);
    outgoing.set(relation.fromTrickId, group);
    indegree.set(relation.toTrickId, (indegree.get(relation.toTrickId) ?? 0) + 1);
  }

  const queue = tricks
    .filter((trick) => (indegree.get(trick.id) ?? 0) === 0)
    .sort(compareTricks);
  const visited = new Set<string>();

  while (queue.length) {
    const trick = queue.shift();
    if (!trick || visited.has(trick.id)) continue;
    visited.add(trick.id);

    for (const relation of outgoing.get(trick.id) ?? []) {
      rankById.set(relation.toTrickId, Math.max(rankById.get(relation.toTrickId) ?? 0, (rankById.get(trick.id) ?? 0) + 1));
      indegree.set(relation.toTrickId, Math.max(0, (indegree.get(relation.toTrickId) ?? 0) - 1));
      if ((indegree.get(relation.toTrickId) ?? 0) === 0) {
        const next = tricks.find((candidate) => candidate.id === relation.toTrickId);
        if (next) queue.push(next);
        queue.sort(compareTricks);
      }
    }
  }

  for (const trick of tricks) {
    if (!visited.has(trick.id)) {
      rankById.set(trick.id, Math.max(rankById.get(trick.id) ?? 0, Math.max(0, trick.level - 1)));
    }
  }

  return rankById;
}

function sortForward(columns: LayoutColumn[], relations: TrickRelation[], columnIndexByTrickId: Map<string, number>) {
  for (let columnIndex = 1; columnIndex < columns.length; columnIndex += 1) {
    const orderById = makeOrderById(columns);
    sortColumn(columns[columnIndex], orderById, (trickId) =>
      makeWeightedAverage(
        relations
          .filter((relation) => relation.toTrickId === trickId && (columnIndexByTrickId.get(relation.fromTrickId) ?? columnIndex) < columnIndex)
          .map((relation) => ({ value: orderById.get(relation.fromTrickId), weight: relationWeight(relation) }))
      )
    );
  }
}

function sortBackward(columns: LayoutColumn[], relations: TrickRelation[], columnIndexByTrickId: Map<string, number>) {
  for (let columnIndex = columns.length - 2; columnIndex >= 0; columnIndex -= 1) {
    const orderById = makeOrderById(columns);
    sortColumn(columns[columnIndex], orderById, (trickId) =>
      makeWeightedAverage(
        relations
          .filter((relation) => relation.fromTrickId === trickId && (columnIndexByTrickId.get(relation.toTrickId) ?? columnIndex) > columnIndex)
          .map((relation) => ({ value: orderById.get(relation.toTrickId), weight: relationWeight(relation) }))
      )
    );
  }
}

function sortColumn(column: LayoutColumn, orderById: Map<string, number>, getScore: (trickId: string, orderById: Map<string, number>) => number | null) {
  column.tricks = column.tricks
    .map((trick, index) => ({ trick, index, score: getScore(trick.id, orderById) }))
    .sort((a, b) => {
      if (a.score !== null && b.score !== null && a.score !== b.score) return a.score - b.score;
      if (a.score !== null && b.score === null) return -1;
      if (a.score === null && b.score !== null) return 1;
      return compareTricks(a.trick, b.trick) || a.index - b.index;
    })
    .map((item) => item.trick);
}

function makeOrderById(columns: LayoutColumn[]) {
  const orderById = new Map<string, number>();
  for (const column of columns) {
    column.tricks.forEach((trick, index) => orderById.set(trick.id, index));
  }
  return orderById;
}

function makeWeightedAverage(scores: Score[]) {
  const valid = scores.filter((score): score is { value: number; weight: number } => typeof score.value === "number" && Number.isFinite(score.value));
  if (!valid.length) return null;
  const totalWeight = valid.reduce((total, score) => total + score.weight, 0);
  return valid.reduce((total, score) => total + score.value * score.weight, 0) / totalWeight;
}

function relationWeight(relation: TrickRelation) {
  const typeWeight = relation.type === "prerequisite" || relation.type === "progression" ? 1.25 : 1;
  return Math.max(1, relation.strength) * typeWeight;
}

function measureColumnHeight(tricks: Trick[]) {
  if (!tricks.length) return 0;
  let height = 0;
  let previousFamily = "";

  for (const [index, trick] of tricks.entries()) {
    if (index > 0 && trick.family !== previousFamily) height += familyGap;
    previousFamily = trick.family;
    height += rowGap;
  }

  return height;
}

function hasAlternativePath(fromId: string, toId: string, skippedRelation: TrickRelation, adjacency: Map<string, string[]>) {
  const queue = adjacency.get(fromId)?.filter((id) => id !== skippedRelation.toTrickId) ?? [];
  const visited = new Set<string>([fromId]);

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === toId) return true;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) queue.push(next);
  }

  return false;
}

function limitIncomingRelations(relations: TrickRelation[], trickById: Map<string, Trick>, maxIncomingPerTarget: number) {
  if (maxIncomingPerTarget <= 0) return relations;
  const grouped = new Map<string, TrickRelation[]>();
  const indexById = new Map(relations.map((relation, index) => [relation.id, index]));

  for (const relation of relations) {
    const group = grouped.get(relation.toTrickId) ?? [];
    group.push(relation);
    grouped.set(relation.toTrickId, group);
  }

  const selected = Array.from(grouped.values()).flatMap((group) =>
    group.sort((a, b) => compareRelationPriority(a, b, trickById) || (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0)).slice(0, maxIncomingPerTarget)
  );

  return selected.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
}

function compareRelationPriority(a: TrickRelation, b: TrickRelation, trickById: Map<string, Trick>) {
  return relationPriority(b, trickById) - relationPriority(a, trickById);
}

function relationPriority(relation: TrickRelation, trickById: Map<string, Trick>) {
  const from = trickById.get(relation.fromTrickId);
  const to = trickById.get(relation.toTrickId);
  const sameDiscipline = from && to && from.discipline === to.discipline ? 16 : 0;
  const sameFamily = from && to && from.family === to.family ? 8 : 0;
  const levelGapPenalty = from && to ? Math.max(0, Math.abs(to.level - from.level) - 1) * 2 : 0;
  const progressionBonus = relation.type === "progression" ? 3 : 0;
  return relation.strength * 100 + sameDiscipline + sameFamily + progressionBonus - levelGapPenalty;
}

function compareTricks(a: Trick, b: Trick) {
  return (
    a.discipline.localeCompare(b.discipline, "ja") ||
    a.level - b.level ||
    a.family.localeCompare(b.family, "ja") ||
    a.levelCategory.localeCompare(b.levelCategory, "ja") ||
    a.name.localeCompare(b.name, "ja")
  );
}

function compareComponents(a: Trick[], b: Trick[]) {
  const firstA = [...a].sort(compareTricks)[0];
  const firstB = [...b].sort(compareTricks)[0];
  if (!firstA || !firstB) return b.length - a.length;
  return (
    firstA.level - firstB.level ||
    firstA.family.localeCompare(firstB.family, "ja") ||
    b.length - a.length ||
    firstA.name.localeCompare(firstB.name, "ja")
  );
}
