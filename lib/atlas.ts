import atlasData from "@/data/atlas-data.json";
import { sortFamilies } from "@/lib/taxonomy";
import type { AtlasData, LevelTest, Source, Trick, TrickMapPosition, TrickRelation } from "@/lib/types";

const data = atlasData as AtlasData;

export const sources: Source[] = data.sources;
export const levelTests: LevelTest[] = data.levels;

const difficultyByLevel = new Map<number, Trick["difficulty"]>([
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

const riskByLevel = new Map<number, Trick["riskLevel"]>([
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

const explicitTags: Record<string, string[]> = {
  "ブリッジ30秒": ["柔軟性", "肩", "背中"],
  "ロンダート": ["反発", "助走", "接続"],
  "バク転": ["後方", "反発", "補助推奨"],
  "ロン宙": ["後方宙返り", "助走", "高さ"],
  "バタフライツイスト": ["トリッキング", "ひねり", "水平軌道"],
  "コークスクリュー": ["トリッキング", "ひねり", "高難度"],
  "ウインドミル": ["ブレイキン", "床回転", "連続"],
  "1990": ["ブレイキン", "倒立回転", "高難度"],
  "2000": ["ブレイキン", "倒立回転", "高難度"]
};

function clampLevel(value: number): Trick["difficulty"] {
  return Math.max(1, Math.min(5, value)) as Trick["difficulty"];
}

function slugFor(index: number, name: string) {
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

function deriveFamily(name: string) {
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

function deriveAxis(name: string) {
  if (/(倒立|肘|1990|2000)/.test(name)) return "倒立軸";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス)/.test(name)) return "ひねり軸";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ロンダート|側転)/.test(name)) return "縦・横回転";
  if (/(ウインド|スワイプ|コイン|ボム|トーマス|エリオ)/.test(name)) return "床回転";
  return "移動・切り返し";
}

function deriveTakeoff(name: string) {
  if (/(倒立|肘|チェアー|プッシュアップ|ウインド|トーマス|エリオ|スワイプ|コイン|ボム)/.test(name)) return "手支持・床支持";
  if (/(片足|ウェブスター|ゲイナー|ライズ|540|コーク)/.test(name)) return "片足";
  if (/(ロンダート|ロン|バク転|宙|フリップ|バッファ)/.test(name)) return "助走・反発";
  return "その場";
}

function deriveLanding(name: string) {
  if (/(倒立|肘|チェアー|1990|2000)/.test(name)) return "手支持";
  if (/(ウインド|トーマス|エリオ|コイン|ボム|背倒立)/.test(name)) return "床・背中";
  if (/(ロンバク|テンポ|連続)/.test(name)) return "連続へ接続";
  return "足立ち";
}

function deriveRopeContext(level: number, name: string) {
  if (level <= 2) return "縄内アップ";
  if (/(連続|ロンバク|テンポ|スワイプス|ウインド)/.test(name)) return "縄内連続";
  if (level >= 8) return "パフォーマンス";
  return "縄内単発";
}

function deriveTags(name: string, level: number, category: string, family: string) {
  const tags = new Set<string>([family, `Lv.${level}`]);
  if (level <= 3) tags.add("基礎");
  if (level >= 7) tags.add("空中系");
  if (/(倒立|肘|チェアー)/.test(name)) tags.add("倒立");
  if (/(宙|フリップ|ウェブスター|ゲイナー)/.test(name)) tags.add("宙返り");
  if (/(ツイスト|ひねり|フル|コーク|ロデオ)/.test(name)) tags.add("ひねり");
  if (/(ロンダート|ロンバク|バク転)/.test(name)) tags.add("接続技");
  for (const tag of explicitTags[name] ?? []) tags.add(tag);
  return Array.from(tags);
}

function makeSummary(name: string, level: number, category: string) {
  if (level <= 2) return `${category}の土台になる基礎技。縄内で安定して出す前に姿勢と受け身を固める。`;
  if (level <= 5) return `${category}の中級技。手支持、反発、空中感覚を次の発展技につなげる。`;
  if (level <= 8) return `${category}の発展技。高さ、入り、着地をそろえてパフォーマンスに組み込む。`;
  return `${category}の高難度技。十分な前提技と安全な補助環境を確認してから扱う。`;
}

function makeDescription(name: string, level: number, category: string, passCondition: string) {
  return `${name}は、PDF由来のレベルテストではレベル${level}「${category}」に含まれる技です。合格条件は「${passCondition}」。図鑑内では、分類・タグ・前提関係から練習順を確認できるようにしています。`;
}

export function getAllTricks(): Trick[] {
  const seen = new Map<string, Trick>();
  let index = 0;

  for (const level of levelTests) {
    for (const name of level.trickNames) {
      if (seen.has(name)) continue;

      const family = deriveFamily(name);
      const axis = deriveAxis(name);
      const trick: Trick = {
        id: `trick-${String(index + 1).padStart(3, "0")}`,
        slug: slugFor(index, name),
        name,
        aliases: [],
        summary: makeSummary(name, level.level, level.category),
        description: makeDescription(name, level.level, level.category, level.passCondition),
        difficulty: difficultyByLevel.get(level.level) ?? clampLevel(Math.ceil(level.level / 2)),
        riskLevel: riskByLevel.get(level.level) ?? clampLevel(Math.ceil(level.level / 2)),
        family,
        axis,
        takeoff: deriveTakeoff(name),
        landing: deriveLanding(name),
        ropeContext: deriveRopeContext(level.level, name),
        tags: deriveTags(name, level.level, level.category, family),
        level: level.level,
        levelCategory: level.category,
        status: "published",
        sourceId: level.sourceId,
        showSource: false
      };

      seen.set(name, trick);
      index += 1;
    }
  }

  return Array.from(seen.values());
}

export const allTricks = getAllTricks();

const trickByName = new Map(allTricks.map((trick) => [trick.name, trick]));
const trickBySlug = new Map(allTricks.map((trick) => [trick.slug, trick]));
const sourceById = new Map(sources.map((source) => [source.id, source]));

export function getTrickBySlug(slug: string) {
  return trickBySlug.get(slug);
}

export function getSourceById(id: string) {
  return sourceById.get(id);
}

export function getRelations(): TrickRelation[] {
  return data.relations
    .map((relation, index) => {
      const from = trickByName.get(relation.from);
      const to = trickByName.get(relation.to);
      if (!from || !to) return null;
      return {
        id: `relation-${String(index + 1).padStart(3, "0")}`,
        fromTrickId: from.id,
        toTrickId: to.id,
        type: relation.type,
        note: relation.note,
        strength: relation.strength
      } satisfies TrickRelation;
    })
    .filter((relation): relation is TrickRelation => Boolean(relation));
}

export const trickRelations = getRelations();

export function getMapPositions(): TrickMapPosition[] {
  return (data.mapPositions ?? [])
    .map((position) => {
      const trick = trickByName.get(position.name);
      if (!trick) return null;
      return {
        trickId: trick.id,
        x: position.x,
        y: position.y
      } satisfies TrickMapPosition;
    })
    .filter((position): position is TrickMapPosition => Boolean(position));
}

export const mapPositions = getMapPositions();

export function getRelationsForTrick(trickId: string) {
  const incoming = trickRelations.filter((relation) => relation.toTrickId === trickId);
  const outgoing = trickRelations.filter((relation) => relation.fromTrickId === trickId);
  return { incoming, outgoing };
}

export function getTrickById(id: string) {
  return allTricks.find((trick) => trick.id === id);
}

export function getFeaturedTricks() {
  const featured = new Set(data.featured);
  return allTricks.filter((trick) => featured.has(trick.name));
}

export function getFilterOptions() {
  return {
    families: sortFamilies(Array.from(new Set(allTricks.map((trick) => trick.family)))),
    axes: Array.from(new Set(allTricks.map((trick) => trick.axis))).sort(),
    takeoffs: Array.from(new Set(allTricks.map((trick) => trick.takeoff))).sort(),
    landings: Array.from(new Set(allTricks.map((trick) => trick.landing))).sort(),
    ropeContexts: Array.from(new Set(allTricks.map((trick) => trick.ropeContext))).sort(),
    tags: Array.from(new Set(allTricks.flatMap((trick) => trick.tags))).sort()
  };
}
