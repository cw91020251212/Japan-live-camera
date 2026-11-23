import { prefectureFromAddress, prefectureZh, regionOf } from "./regions";
import type { RegionId } from "./regions";

export type Category = "road" | "tourism" | "weather" | "other";
export type Kind = "image" | "video" | "link";

export type CatalogRow = {
  stream_title: string;
  stream_url: string;
  stream_status: string;
  stream_type: string;
  category: string;
  poi: string;
  provider: string;
  provider_url: string;
  address: string;
  latitude: string;
  longitude: string;
};

export type Camera = {
  id: string;
  name: string;
  place: string;
  prefectureJa: string;
  prefectureZh: string;
  regionId: RegionId;
  category: Category;
  kind: Kind;
  latitude: number;
  longitude: number;
  pageUrl: string;
  mediaUrl: string | null;
  embedUrl: string | null;
  provider: string;
  refreshSeconds: number | null;
  hidden: boolean;
};

const TOURISM = new Set(["観光", "鉄道", "空港", "山岳"]);
const WEATHER = new Set(["河川", "海岸"]);

function categoryOf(raw: string): Category {
  if (raw === "道路") return "road";
  if (TOURISM.has(raw)) return "tourism";
  if (WEATHER.has(raw)) return "weather";
  return "other";
}

function youtubeEmbed(url: string): string | null {
  let id: string | null = null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") id = parsed.pathname.slice(1).split("/")[0] ?? null;
    else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
      else if (parsed.pathname.startsWith("/embed/")) id = parsed.pathname.split("/")[2] ?? null;
    }
  } catch {
    return null;
  }
  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  return `https://www.youtube.com/embed/${id}`;
}

function isDirectImage(url: string): boolean {
  try {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function classifyRow(row: CatalogRow): Camera | null {
  if (row.stream_status !== "TRUE" || !row.stream_url) return null;
  const prefectureJa = prefectureFromAddress(row.address);
  const regionId = prefectureJa ? regionOf(prefectureJa) : null;
  const zh = prefectureJa ? prefectureZh(prefectureJa) : null;
  if (!prefectureJa || !regionId || !zh) return null;

  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 20 ||
    latitude > 50 ||
    longitude < 122 ||
    longitude > 154
  ) {
    return null;
  }

  const name = row.stream_title.trim() || row.poi.trim();
  if (!name) return null;
  const place = row.poi.trim() || name;
  const embedUrl = youtubeEmbed(row.stream_url);
  const image = isDirectImage(row.stream_url);

  return {
    id: `${row.latitude},${row.longitude}:${name}`,
    name,
    place,
    prefectureJa,
    prefectureZh: zh,
    regionId,
    category: categoryOf(row.category),
    kind: image ? "image" : embedUrl ? "video" : "link",
    latitude,
    longitude,
    pageUrl: row.stream_url,
    mediaUrl: image ? row.stream_url : null,
    embedUrl: image ? null : embedUrl,
    provider: row.provider,
    refreshSeconds: image ? 60 : null,
    hidden: false,
  };
}
