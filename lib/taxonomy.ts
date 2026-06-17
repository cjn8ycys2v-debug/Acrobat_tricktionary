export const disciplineOrder = ["ダブルダッチ", "体操", "トリッキング", "ブレイキン", "カポエイラ", "その他"] as const;

export const disciplineDescriptions: Record<string, string> = {
  ダブルダッチ: "縄内のリズム、踏み替え、床移動からアクロへつなげるための動き。",
  体操: "倒立、転回、宙返りなど、姿勢と反発を作るアクロの中心技術。",
  トリッキング: "蹴り、ひねり、片足踏切を組み合わせる見せ技・派生技。",
  ブレイキン: "床支持、チェアー、回転系を使って流れと質感を作る技。",
  カポエイラ: "片手支持や斜め軌道を使い、流れるように切り返す技。",
  その他: "創作、連続、複合系など、既存分類に収まりきらない技。"
};

export const familyOrder = [
  "基礎ムーブ",
  "倒立・床基礎",
  "側方・反発",
  "空中回転",
  "ひねり",
  "トリッキング",
  "ブレイキン・床回転",
  "連続・創作",
  "その他"
] as const;

export function deriveDiscipline(name: string, family: string) {
  if (/(ウインド|トーマス|エリオ|スワイプ|1990|2000|C\.C\.|コイン|ボム|チェアー)/.test(name) || family === "ブレイキン・床回転") {
    return "ブレイキン";
  }
  if (/(マカコ|ヘベルサオン|ヘリコプテイロ|エアツイガンビ|ガンビ|ライズ)/.test(name)) {
    return "カポエイラ";
  }
  if (
    /(バタフライ|エアリアル|スクート|540|コーク|ロデオ|クロスアウト|Aトラックス|フラッシュキック|ムーンキック|ルーザー|フルハイパー|フルロール|ラップフル)/.test(
      name
    )
  ) {
    return "トリッキング";
  }
  if (
    /(前回り受け身|フロントスウィープ|バックスウィープ|^1歩$|スイング|振り上げ|屈伸ジャンプ|ブロッキング|パンチ|キャタピー|片足しゃがみ|ニューヨーク|サルフット|ドンキー|シフト|バックドンキー|ダブルシフト|ラビット|てんつく|レインボー|ハローバック)/.test(
      name
    ) ||
    family === "基礎ムーブ"
  ) {
    return "ダブルダッチ";
  }
  if (/(オリジナル技|空中系2つ以上の連続技)/.test(name)) return "その他";
  return "体操";
}

export function compareDisciplines(a: string, b: string) {
  const aIndex = disciplineOrder.indexOf(a as (typeof disciplineOrder)[number]);
  const bIndex = disciplineOrder.indexOf(b as (typeof disciplineOrder)[number]);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return a.localeCompare(b, "ja");
}

export function compareFamilies(a: string, b: string) {
  const aIndex = familyOrder.indexOf(a as (typeof familyOrder)[number]);
  const bIndex = familyOrder.indexOf(b as (typeof familyOrder)[number]);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return a.localeCompare(b, "ja");
}

export function sortDisciplines(disciplines: string[]) {
  return [...disciplines].sort(compareDisciplines);
}

export function sortFamilies(families: string[]) {
  return [...families].sort(compareFamilies);
}
