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

function family(name) {
  if (/(オリジナル技|空中系2つ以上の連続技)/.test(name)) return "連続・創作";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス|1\.5回ひねり|フルハイパー|溜め背面)/.test(name)) return "ひねり";
  if (/(ウインド|トーマス|エリオ|スワイプ|1990|2000|C\.C\.|コイン|ボム)/.test(name)) return "ブレイキン・床回転";
  if (/(倒立|ブリッジ|前転|後転|チェアー|プッシュアップ|肘|首抜き|背倒立|跳ね起き|ワーム|ドルフィン)/.test(name)) return "倒立・床基礎";
  if (/(バタフライ|エアリアル|スクート|ライズ|540|ガンビ|マカコ|ムーンキック|フラッシュキック|ヘリコプテイロ|ルーザー)/.test(name)) return "トリッキング";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ブランディー|ロケット|背面|横転|ロン横|カートサイド|カートアラビアン|反り宙|ジーザス|スワン|アックス)/.test(name)) return "空中回転";
  if (/(側転|ロンダート|^ロンバク$|^バク転$|連続バク転|ハンドスプリング|^カート$|片手ロンダート|かぶき|旋風脚)/.test(name)) return "側方・反発";
  if (/(前回り受け身|フロントスウィープ|バックスウィープ|^1歩$|スイング|振り上げ|屈伸ジャンプ|ブロッキング|パンチ|キャタピー|片足しゃがみ|ニューヨーク|サルフット|ドンキー|シフト|バックドンキー|ダブルシフト|ラビット|てんつく|ヘベルサオン|レインボー|ハローバック)/.test(name)) return "基礎ムーブ";
  return "その他";
}

function discipline(name, fam) {
  if (/(ウインド|トーマス|エリオ|スワイプ|1990|2000|C\.C\.|コイン|ボム|チェアー)/.test(name) || fam === "ブレイキン・床回転") return "ブレイキン";
  if (/(マカコ|ヘベルサオン|ヘリコプテイロ|エアツイガンビ|ガンビ|ライズ)/.test(name)) return "カポエイラ";
  if (/(バタフライ|エアリアル|スクート|540|コーク|ロデオ|クロスアウト|Aトラックス|フラッシュキック|ムーンキック|ルーザー|フルハイパー|フルロール|ラップフル)/.test(name)) return "トリッキング";
  if (/(前回り受け身|フロントスウィープ|バックスウィープ|^1歩$|スイング|振り上げ|屈伸ジャンプ|ブロッキング|パンチ|キャタピー|片足しゃがみ|ニューヨーク|サルフット|ドンキー|シフト|バックドンキー|ダブルシフト|ラビット|てんつく|レインボー|ハローバック)/.test(name) || fam === "基礎ムーブ") return "ダブルダッチ";
  if (/(オリジナル技|空中系2つ以上の連続技)/.test(name)) return "その他";
  return "体操";
}

function axis(name) {
  if (/(倒立|肘|1990|2000)/.test(name)) return "倒立軸";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス)/.test(name)) return "ひねり軸";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ロンダート|側転)/.test(name)) return "縦・横回転";
  if (/(ウインド|スワイプ|コイン|ボム|トーマス|エリオ)/.test(name)) return "床回転";
  return "移動・切り返し";
}

function focus(name, fam, disc) {
  if (fam === "基礎ムーブ") return "縄のリズムを崩さず、踏み替えや床移動を安定させることが練習の軸になります。";
  if (fam === "倒立・床基礎") return "肩、体幹、受け身を整え、手支持や床支持の姿勢を崩さないことが重要です。";
  if (fam === "側方・反発") return "手を着く位置、腰の通り道、着地後の反発をそろえると次の空中技へつながります。";
  if (fam === "空中回転") return "踏切の高さ、回転姿勢、着地の向きを分けて確認しながら段階的に練習します。";
  if (fam === "ひねり") return "回転にひねりを加えるため、目線、締め、着地方向を前提技で確認してから扱います。";
  if (disc === "カポエイラ") return "手支持と蹴り上げの軌道を滑らかにつなぎ、勢いを止めずに切り返します。";
  if (fam === "トリッキング") return "片足踏切や斜めの軌道を使うので、入り方と着地後の流れまでセットで見ます。";
  if (fam === "ブレイキン・床回転") return "床支持の形、重心移動、回転の継続を安全に作ることが練習の中心です。";
  if (/連続|オリジナル/.test(name)) return "単体技の完成度を保ったまま、つなぎ方と見せ方を設計します。";
  return "分類と前提技を確認し、無理なく次の発展技へつなげます。";
}

function levelRole(level) {
  if (level <= 2) return "最初に固めたい基礎";
  if (level <= 5) return "発展技へ進むための中核";
  if (level <= 8) return "演技に入れやすい発展";
  return "十分な前提技が必要な高難度";
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
    const fam = family(name);
    const disc = discipline(name, fam);
    const tags = [disc, fam, `Lv.${level.level}`];
    const practiceFocus = focus(name, fam, disc);
    lines.push(
      `insert into public.tricks (id, slug, name, aliases, summary, description, difficulty, risk_level, discipline, family, axis, takeoff, landing, rope_context, tags, level, level_category, status, source_id, show_source) values (` +
        [
          sql(id),
          sql(slugFor(trickIndex, name)),
          sql(name),
          "array[]::text[]",
          sql(`${disc} / ${fam}の${levelRole(level.level)}技。${practiceFocus}`),
          sql(`${name}は、${disc}の要素を持つ${fam}系の技です。レベル${level.level}「${level.category}」では「${level.passCondition}」が目安です。${practiceFocus} 前提技・派生技・近い技は相関図で確認できます。`),
          difficultyByLevel.get(level.level) ?? 3,
          riskByLevel.get(level.level) ?? 3,
          sql(disc),
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
        ") on conflict (slug) do update set summary = excluded.summary, description = excluded.description, difficulty = excluded.difficulty, risk_level = excluded.risk_level, discipline = excluded.discipline, family = excluded.family, axis = excluded.axis, takeoff = excluded.takeoff, landing = excluded.landing, rope_context = excluded.rope_context, tags = excluded.tags, level = excluded.level, level_category = excluded.level_category, status = excluded.status, source_id = excluded.source_id;"
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
