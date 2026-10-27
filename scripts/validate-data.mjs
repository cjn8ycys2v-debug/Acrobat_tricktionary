import fs from "node:fs";
import path from "node:path";

const dataPath = path.join(process.cwd(), "data", "atlas-data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const videoReferencePath = path.join(process.cwd(), "data", "video-reference-data.json");
const videoReferences = JSON.parse(fs.readFileSync(videoReferencePath, "utf8"));

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

const videoReferenceTricks = new Set();
for (const reference of videoReferences ?? []) {
  if (!trickNames.has(reference.trickName)) errors.push(`video reference trick missing: ${reference.trickName}`);
  if (videoReferenceTricks.has(reference.trickName)) errors.push(`duplicate video reference trick: ${reference.trickName}`);
  videoReferenceTricks.add(reference.trickName);
  try {
    const url = new URL(reference.referenceUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "youtu.be" && !host.endsWith("youtube.com")) errors.push(`video reference is not YouTube: ${reference.trickName}`);
  } catch {
    errors.push(`invalid video reference URL: ${reference.trickName}`);
  }
  if (!Number.isInteger(reference.referenceStartSec) || reference.referenceStartSec < 0) errors.push(`invalid video start: ${reference.trickName}`);
  if (!Number.isInteger(reference.referenceEndSec) || reference.referenceEndSec < reference.referenceStartSec) errors.push(`invalid video end: ${reference.trickName}`);
  if (!reference.title?.trim() || !reference.channel?.trim()) errors.push(`video reference metadata missing: ${reference.trickName}`);
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

console.log(`OK: ${trickNames.size} tricks, ${data.levels.length} levels, ${data.relations.length} relations, ${videoReferences.length} video references`);
