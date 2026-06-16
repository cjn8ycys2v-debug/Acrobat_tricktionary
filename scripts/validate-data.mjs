import fs from "node:fs";
import path from "node:path";

const dataPath = path.join(process.cwd(), "data", "atlas-data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const errors = [];
const levelNumbers = new Set();
const trickNames = new Set();

for (const level of data.levels ?? []) {
  if (levelNumbers.has(level.level)) errors.push(`duplicate level: ${level.level}`);
  levelNumbers.add(level.level);
  if (!level.trickNames?.length) errors.push(`level ${level.level} has no tricks`);
  for (const name of level.trickNames ?? []) {
    trickNames.add(name);
  }
}

for (const relation of data.relations ?? []) {
  if (!trickNames.has(relation.from)) errors.push(`relation source missing: ${relation.from}`);
  if (!trickNames.has(relation.to)) errors.push(`relation target missing: ${relation.to}`);
  if (relation.from === relation.to) errors.push(`self relation: ${relation.from}`);
  if (!["prerequisite", "progression", "variation", "combo"].includes(relation.type)) {
    errors.push(`invalid relation type: ${relation.type}`);
  }
}

const learningEdges = (data.relations ?? []).filter((relation) => relation.type === "prerequisite" || relation.type === "progression");
const graph = new Map();
for (const edge of learningEdges) {
  if (!graph.has(edge.from)) graph.set(edge.from, []);
  graph.get(edge.from).push(edge.to);
}

const visiting = new Set();
const visited = new Set();

function visit(node, trail = []) {
  if (visiting.has(node)) {
    errors.push(`learning relation cycle: ${[...trail, node].join(" -> ")}`);
    return;
  }
  if (visited.has(node)) return;

  visiting.add(node);
  for (const next of graph.get(node) ?? []) visit(next, [...trail, node]);
  visiting.delete(node);
  visited.add(node);
}

for (const node of graph.keys()) visit(node);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK: ${trickNames.size} tricks, ${data.levels.length} levels, ${data.relations.length} relations`);
