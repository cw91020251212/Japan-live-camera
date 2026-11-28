import type { Camera } from "./classify";
import type { OfficialDoor } from "./select";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CATEGORY_LABEL = {
  road: "道路",
  tourism: "觀光",
  weather: "天氣災害",
  other: "其他",
} as const;

export function renderHome(counts: { id: string; label: string; live: number; doors: number }[]): string {
  const cards = counts
    .map(
      (count) =>
        `<a class="region-card" href="#/${escapeHtml(count.id)}"><span class="region-name">${escapeHtml(count.label)}</span><span>${count.live} 有畫面</span><span>${count.doors} 官方入口</span></a>`,
    )
    .join("");
  return `<main class="home" data-view="home"><h1>Live Camera</h1><p class="subtitle">日本公開鏡頭</p><nav class="regions">${cards}</nav></main>`;
}

export function renderSheet(camera: Camera): string {
  const name = escapeHtml(camera.name);
  const place = escapeHtml(camera.place);
  const prefecture = escapeHtml(camera.prefectureZh);
  const meta = `${escapeHtml(CATEGORY_LABEL[camera.category])} · ${escapeHtml(camera.provider)}`;
  if (camera.kind === "image" && camera.mediaUrl) {
    const src = escapeHtml(camera.mediaUrl);
    return `<article class="card image"><img alt="" src="${src}" data-refresh="${camera.refreshSeconds ?? 60}"><h2>${place}</h2><p>${name} · ${prefecture}</p><p>${meta}</p></article>`;
  }
  if (camera.kind === "video" && camera.embedUrl) {
    const href = escapeHtml(camera.pageUrl);
    return `<article class="card video"><h2>${place}</h2><p>${prefecture}</p><p>${meta}</p><p>這段要在 YouTube 看。</p><p><a href="${href}" target="_blank" rel="noopener noreferrer">在 YouTube 開啟</a></p></article>`;
  }
  const href = escapeHtml(camera.pageUrl);
  return `<article class="card link"><h2>${name}</h2><p>${prefecture}</p><p>畫面在官方網站觀看。本站不存放影像。</p><p><a href="${href}" target="_blank" rel="noopener noreferrer">前往官方頁面</a></p></article>`;
}

export function renderDoors(doors: OfficialDoor[]): string {
  if (doors.length === 0) return "";
  const items = doors
    .map(
      (door) =>
        `<li><a href="${escapeHtml(door.pageUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(door.name)}</a><span>${escapeHtml(door.note)}</span></li>`,
    )
    .join("");
  return `<section class="doors"><h2>官方入口</h2><ul>${items}</ul></section>`;
}
