import type { Camera } from "./classify";
import type { Catalog } from "./catalog";
import { doorsFor, filterCameras, regionCounts, type FilterQuery } from "./select";
import { JAPAN_BOUNDS, parseRoute, regionAnchor, regionBounds, REGIONS } from "./regions";
import { escapeHtml, renderDoors, renderSheet } from "./render";

export type ViewState = { category: "all" | "road" | "tourism" | "weather"; imagesOnly: boolean; selectedId: string | null };

export type RegionMarker = {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  live: number;
};

export function viewModel(
  catalog: Catalog,
  hash: string,
  state: ViewState,
): {
  kind: "home" | "region";
  title: string;
  html: string;
  bounds: [number, number, number, number] | null;
  points: Camera[];
  markers: RegionMarker[];
} {
  const route = parseRoute(hash);
  if (route.name === "home") {
    const markers = regionCounts(catalog.cameras, catalog.doors).map((count) => {
      const [longitude, latitude] = regionAnchor(count.id);
      return { id: count.id, label: count.label, longitude, latitude, live: count.live };
    });
    return {
      kind: "home",
      title: "日本公開鏡頭",
      html: `<section class="region" data-view="home"><div class="bar"><h1>Live Camera</h1></div><div id="map"></div></section>`,
      bounds: JAPAN_BOUNDS,
      points: [],
      markers,
    };
  }

  const query: FilterQuery = { category: state.category, imagesOnly: state.imagesOnly };
  const points = filterCameras(catalog.cameras, route.regionId, query);
  const doors = doorsFor(catalog.doors, route.regionId, query);
  const selected = points.find((camera) => camera.id === state.selectedId) ?? null;
  const label = REGIONS.find((region) => region.id === route.regionId)?.label ?? "";
  const pressed = (category: ViewState["category"]) => (state.category === category ? "true" : "false");
  const html = `<section class="region" data-view="region">
    <div class="bar">
      <a href="#/">全部地方</a>
      <h1>${label}</h1>
      <div class="filters">
        <button type="button" data-category="all" aria-pressed="${pressed("all")}">全部</button>
        <button type="button" data-category="road" aria-pressed="${pressed("road")}">道路</button>
        <button type="button" data-category="tourism" aria-pressed="${pressed("tourism")}">觀光</button>
        <button type="button" data-category="weather" aria-pressed="${pressed("weather")}">天氣災害</button>
        <button type="button" data-images-only aria-pressed="${state.imagesOnly ? "true" : "false"}">只看有畫面</button>
      </div>
    </div>
    <div id="map"></div>
    <div class="panel">
      <div class="sheet" data-sheet>${selected ? renderSheet(selected) : ""}${cameraList(points, state.selectedId)}</div>
      <div data-doors>${renderDoors(doors)}</div>
    </div>
  </section>`;

  return { kind: "region", title: label, html, bounds: regionBounds(route.regionId), points, markers: [] };
}

function cameraList(points: Camera[], selectedId: string | null): string {
  if (points.length === 0) return `<p class="empty">這個範圍沒有符合的鏡頭。</p>`;
  const items = points
    .map((camera) => {
      const kind = camera.kind === "link" ? "官方頁" : "有畫面";
      const pressed = camera.id === selectedId ? "true" : "false";
      return `<li><button type="button" data-camera-id="${escapeHtml(camera.id)}" aria-pressed="${pressed}"><span class="cam-name">${escapeHtml(camera.name)}</span><span class="cam-meta">${escapeHtml(camera.prefectureZh)} · ${kind}</span></button></li>`;
    })
    .join("");
  return `<p class="list-label">這個地方的鏡頭</p><ul class="camera-list">${items}</ul>`;
}
