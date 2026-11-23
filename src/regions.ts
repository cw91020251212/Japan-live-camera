export type RegionId =
  | "hokkaido"
  | "tohoku"
  | "kanto"
  | "chubu"
  | "kansai"
  | "chugoku"
  | "shikoku"
  | "kyushu";

export type Route = { name: "home" } | { name: "region"; regionId: RegionId };

type Prefecture = { ja: string; zh: string; regionId: RegionId };

const PREFECTURES: Prefecture[] = [
  { ja: "北海道", zh: "北海道", regionId: "hokkaido" },
  { ja: "青森県", zh: "青森縣", regionId: "tohoku" },
  { ja: "岩手県", zh: "岩手縣", regionId: "tohoku" },
  { ja: "宮城県", zh: "宮城縣", regionId: "tohoku" },
  { ja: "秋田県", zh: "秋田縣", regionId: "tohoku" },
  { ja: "山形県", zh: "山形縣", regionId: "tohoku" },
  { ja: "福島県", zh: "福島縣", regionId: "tohoku" },
  { ja: "茨城県", zh: "茨城縣", regionId: "kanto" },
  { ja: "栃木県", zh: "栃木縣", regionId: "kanto" },
  { ja: "群馬県", zh: "群馬縣", regionId: "kanto" },
  { ja: "埼玉県", zh: "埼玉縣", regionId: "kanto" },
  { ja: "千葉県", zh: "千葉縣", regionId: "kanto" },
  { ja: "東京都", zh: "東京都", regionId: "kanto" },
  { ja: "神奈川県", zh: "神奈川縣", regionId: "kanto" },
  { ja: "新潟県", zh: "新潟縣", regionId: "chubu" },
  { ja: "富山県", zh: "富山縣", regionId: "chubu" },
  { ja: "石川県", zh: "石川縣", regionId: "chubu" },
  { ja: "福井県", zh: "福井縣", regionId: "chubu" },
  { ja: "山梨県", zh: "山梨縣", regionId: "chubu" },
  { ja: "長野県", zh: "長野縣", regionId: "chubu" },
  { ja: "岐阜県", zh: "岐阜縣", regionId: "chubu" },
  { ja: "静岡県", zh: "靜岡縣", regionId: "chubu" },
  { ja: "愛知県", zh: "愛知縣", regionId: "chubu" },
  { ja: "三重県", zh: "三重縣", regionId: "kansai" },
  { ja: "滋賀県", zh: "滋賀縣", regionId: "kansai" },
  { ja: "京都府", zh: "京都府", regionId: "kansai" },
  { ja: "大阪府", zh: "大阪府", regionId: "kansai" },
  { ja: "兵庫県", zh: "兵庫縣", regionId: "kansai" },
  { ja: "奈良県", zh: "奈良縣", regionId: "kansai" },
  { ja: "和歌山県", zh: "和歌山縣", regionId: "kansai" },
  { ja: "鳥取県", zh: "鳥取縣", regionId: "chugoku" },
  { ja: "島根県", zh: "島根縣", regionId: "chugoku" },
  { ja: "岡山県", zh: "岡山縣", regionId: "chugoku" },
  { ja: "広島県", zh: "廣島縣", regionId: "chugoku" },
  { ja: "山口県", zh: "山口縣", regionId: "chugoku" },
  { ja: "徳島県", zh: "德島縣", regionId: "shikoku" },
  { ja: "香川県", zh: "香川縣", regionId: "shikoku" },
  { ja: "愛媛県", zh: "愛媛縣", regionId: "shikoku" },
  { ja: "高知県", zh: "高知縣", regionId: "shikoku" },
  { ja: "福岡県", zh: "福岡縣", regionId: "kyushu" },
  { ja: "佐賀県", zh: "佐賀縣", regionId: "kyushu" },
  { ja: "長崎県", zh: "長崎縣", regionId: "kyushu" },
  { ja: "熊本県", zh: "熊本縣", regionId: "kyushu" },
  { ja: "大分県", zh: "大分縣", regionId: "kyushu" },
  { ja: "宮崎県", zh: "宮崎縣", regionId: "kyushu" },
  { ja: "鹿児島県", zh: "鹿兒島縣", regionId: "kyushu" },
  { ja: "沖縄県", zh: "沖繩縣", regionId: "kyushu" },
];

const BY_JA = new Map(PREFECTURES.map((prefecture) => [prefecture.ja, prefecture]));

const BOUNDS: Record<RegionId, [number, number, number, number]> = {
  hokkaido: [139.2, 41.2, 146.0, 45.6],
  tohoku: [139.0, 36.7, 142.1, 41.6],
  kanto: [138.4, 34.8, 140.9, 37.2],
  chubu: [135.4, 34.5, 139.9, 38.6],
  kansai: [134.2, 33.4, 136.9, 35.8],
  chugoku: [130.8, 33.7, 134.5, 35.7],
  shikoku: [132.0, 32.7, 134.8, 34.4],
  kyushu: [122.9, 24.0, 132.1, 34.0],
};

const PREFECTURE_RE = /^(北海道|東京都|大阪府|京都府|[\u4e00-\u9fff]{2,3}県)/;

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: "hokkaido", label: "北海道" },
  { id: "tohoku", label: "東北" },
  { id: "kanto", label: "關東" },
  { id: "chubu", label: "中部" },
  { id: "kansai", label: "關西" },
  { id: "chugoku", label: "中國" },
  { id: "shikoku", label: "四國" },
  { id: "kyushu", label: "九州・沖繩" },
];

export function prefectureFromAddress(address: string): string | null {
  const match = PREFECTURE_RE.exec(address);
  if (!match || !BY_JA.has(match[1])) return null;
  return match[1];
}

export function regionOf(prefectureJa: string): RegionId | null {
  return BY_JA.get(prefectureJa)?.regionId ?? null;
}

export function prefectureZh(prefectureJa: string): string | null {
  return BY_JA.get(prefectureJa)?.zh ?? null;
}

export function regionBounds(id: RegionId): [number, number, number, number] {
  return BOUNDS[id];
}

export function parseRoute(hash: string): Route {
  const id = hash.replace(/^#\/?/, "");
  const region = REGIONS.find((item) => item.id === id);
  if (!region) return { name: "home" };
  return { name: "region", regionId: region.id };
}
