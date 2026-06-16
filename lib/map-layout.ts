import type { Trick, TrickMapPosition, TrickRelation } from "@/lib/types";

const columnGap = 300;
const rowGap = 112;
const familyGap = 24;
const optimizationPasses = 5;

type LayoutColumn = {
  level: number;
  tricks: Trick[];
};

type Score = {
  value?: number;
  weight: number;
};

export function makeLevelColumnLayout(tricks: Trick[], relations: TrickRelation[]): TrickMapPosition[] {
  if (!tricks.length) return [];

  const trickById = new Map(tricks.map((trick) => [trick.id, trick]));
  const validRelations = relations.filter((relation) => trickById.has(relation.fromTrickId) && trickById.has(relation.toTrickId));
  const columns = makeInitialColumns(tricks);
  const columnIndexByTrickId = new Map<string, number>();

  columns.forEach((column, columnIndex) => {
    column.tricks.forEach((trick) => columnIndexByTrickId.set(trick.id, columnIndex));
  });

  for (let pass = 0; pass < optimizationPasses; pass += 1) {
    sortForward(columns, validRelations, columnIndexByTrickId);
    sortBackward(columns, validRelations, columnIndexByTrickId);
  }

  return columns.flatMap((column, columnIndex) => {
    let y = 0;
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
}

export function makeLevelColumnLayoutMap(tricks: Trick[], relations: TrickRelation[]) {
  return new Map(makeLevelColumnLayout(tricks, relations).map((position) => [position.trickId, position] as const));
}

function makeInitialColumns(tricks: Trick[]): LayoutColumn[] {
  const byLevel = new Map<number, Trick[]>();
  for (const trick of tricks) {
    const level = Number.isFinite(trick.level) ? trick.level : 0;
    const group = byLevel.get(level) ?? [];
    group.push(trick);
    byLevel.set(level, group);
  }

  return Array.from(byLevel.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, group]) => ({
      level,
      tricks: group.sort(compareTricks)
    }));
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

function compareTricks(a: Trick, b: Trick) {
  return (
    a.level - b.level ||
    a.family.localeCompare(b.family, "ja") ||
    a.levelCategory.localeCompare(b.levelCategory, "ja") ||
    a.name.localeCompare(b.name, "ja")
  );
}
