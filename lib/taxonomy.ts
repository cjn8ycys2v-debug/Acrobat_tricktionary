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

export function sortFamilies(families: string[]) {
  return [...families].sort(compareFamilies);
}
