import fs from "node:fs";
import path from "node:path";

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "atlas-data.json"), "utf8"));

const difficultyByLevel = new Map([
  [1, 1],
  [2, 2],
  [3, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [7, 4],
  [8, 4],
  [9, 5],
  [10, 5]
]);

const riskByLevel = new Map([
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [7, 4],
  [8, 4],
  [9, 5],
  [10, 5]
]);

function sql(value) {
  if (value == null) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function array(values) {
  return `array[${values.map(sql).join(", ")}]`;
}

function slugFor(index, name) {
  const normalized = name
    .toLowerCase()
    .replaceAll(".", "")
    .replaceAll("→", "-to-")
    .replaceAll("+", "plus")
    .replaceAll("α", "alpha")
    .replaceAll(" ", "-");
  const ascii = normalized.replace(/[^a-z0-9-]/g, "");
  return ascii ? `t${String(index + 1).padStart(3, "0")}-${ascii}` : `t${String(index + 1).padStart(3, "0")}`;
}

function family(name, category) {
  if (/(倒立|ブリッジ|前転|後転|チェアー|プッシュアップ|肘)/.test(name)) return "倒立・床基礎";
  if (/(ウインド|トーマス|エリオ|スワイプ|1990|2000|C\.C\.|コイン|ボム)/.test(name)) return "ブレイキン";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス)/.test(name)) return "ひねり";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ブランディー|ロケット)/.test(name)) return "空中回転";
  if (/(バタフライ|エアリアル|スクート|ライズ|540|ガンビ|マカコ)/.test(name)) return "トリッキング";
  return category;
}

function axis(name) {
  if (/(倒立|肘|1990|2000)/.test(name)) return "倒立軸";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス)/.test(name)) return "ひねり軸";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ロンダート|側転)/.test(name)) return "縦・横回転";
  if (/(ウインド|スワイプ|コイン|ボム|トーマス|エリオ)/.test(name)) return "床回転";
  return "移動・切り返し";
}

const source = data.sources[0];
const sourceUuid = "00000000-0000-4000-8000-000000000001";
const trickUuids = new Map();
let trickIndex = 0;
const lines = [
  "begin;",
  `insert into public.sources (id, source_key, title, kind, url, show_by_default) values (${sql(sourceUuid)}, ${sql(source.id)}, ${sql(source.title)}, ${sql(source.kind)}, ${sql(source.url)}, false) on conflict (source_key) do nothing;`
];

for (const level of data.levels) {
  for (const name of level.trickNames) {
    if (trickUuids.has(name)) continue;
    const id = `00000000-0000-4000-9000-${String(trickIndex + 1).padStart(12, "0")}`;
    trickUuids.set(name, id);
    const fam = family(name, level.category);
    const tags = [level.category, fam, `Lv.${level.level}`];
    lines.push(
      `insert into public.tricks (id, slug, name, aliases, summary, description, difficulty, risk_level, family, axis, takeoff, landing, rope_context, tags, level, level_category, status, source_id, show_source) values (` +
        [
          sql(id),
          sql(slugFor(trickIndex, name)),
          sql(name),
          "array[]::text[]",
          sql(`${level.category}のレベル${level.level}技。`),
          sql(`${name}は「${source.title}」由来のレベル${level.level}技です。`),
          difficultyByLevel.get(level.level) ?? 3,
          riskByLevel.get(level.level) ?? 3,
          sql(fam),
          sql(axis(name)),
          sql("未設定"),
          sql("未設定"),
          sql(level.level <= 2 ? "縄内アップ" : "縄内単発"),
          array(tags),
          level.level,
          sql(level.category),
          sql("published"),
          sql(sourceUuid),
          "false"
        ].join(", ") +
        ") on conflict (slug) do update set summary = excluded.summary, description = excluded.description, difficulty = excluded.difficulty, risk_level = excluded.risk_level, family = excluded.family, axis = excluded.axis, takeoff = excluded.takeoff, landing = excluded.landing, rope_context = excluded.rope_context, tags = excluded.tags, level = excluded.level, level_category = excluded.level_category, status = excluded.status, source_id = excluded.source_id;"
    );
    trickIndex += 1;
  }
}

for (const level of data.levels) {
  const ids = level.trickNames.map((name) => trickUuids.get(name)).filter(Boolean);
  lines.push(
    `insert into public.level_tests (level, category, title, pass_condition, trick_ids, source_id) values (${level.level}, ${sql(level.category)}, ${sql(level.title)}, ${sql(level.passCondition)}, array[${ids.map(sql).join(", ")}]::uuid[], ${sql(sourceUuid)}) on conflict (level) do nothing;`
  );
}

for (const [index, relation] of data.relations.entries()) {
  lines.push(
    `insert into public.trick_relations (id, from_trick_id, to_trick_id, type, note, strength) values (${sql(`00000000-0000-4000-a000-${String(index + 1).padStart(12, "0")}`)}, ${sql(trickUuids.get(relation.from))}, ${sql(trickUuids.get(relation.to))}, ${sql(relation.type)}, ${sql(relation.note)}, ${relation.strength}) on conflict (from_trick_id, to_trick_id, type) do nothing;`
  );
}

lines.push("commit;");
const output = `${lines.join("\n")}\n`;
const outIndex = process.argv.indexOf("--out");

if (outIndex >= 0) {
  const outPath = process.argv[outIndex + 1];
  if (!outPath) {
    console.error("--out requires a file path");
    process.exit(1);
  }
  fs.writeFileSync(path.resolve(process.cwd(), outPath), output);
  console.log(`wrote ${outPath}`);
} else {
  console.log(output);
}
