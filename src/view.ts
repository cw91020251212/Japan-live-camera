import type { Camera } from "./classify";
import type { Catalog } from "./catalog";
import { doorsFor, filterCameras, regionCounts, type FilterQuery } from "./select";
import { JAPAN_BOUNDS, parseRoute, regionAnchor, regionBounds, REGIONS } from "./regions";
import { escapeHtml, renderDoors, renderSheet } from "./render";

export type ViewState = {
  category: "all" | "road" | "tourism" | "weather";
  imagesOnly: boolean;
  selectedId: string | null;
  listOpen: boolean;
};

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
        <button type="button" data-images-only aria-pressed="${state.imagesOnly ? "true" : "false"}">不含官方頁</button>
      </div>
    </div>
    <div id="map"></div>
    <div class="panel${state.listOpen ? " list-open" : ""}">
      <div class="sheet" data-sheet>${cameraList(points, state.selectedId, state.listOpen, selected ? renderSheet(selected) : "")}</div>
      <div data-doors>${renderDoors(doors)}</div>
    </div>
  </section>`;

  return { kind: "region", title: label, html, bounds: regionBounds(route.regionId), points, markers: [] };
}

function kindLabel(kind: Camera["kind"]): string {
  if (kind === "image") return "圖片";
  if (kind === "video") return "YouTube";
  return "官方頁";
}

function cameraList(points: Camera[], selectedId: string | null, listOpen: boolean, card: string): string {
  const legend = `<p class="legend"><span><i class="dot video"></i>YouTube</span><span><i class="dot image"></i>圖片</span><span><i class="dot link"></i>官方頁</span></p>`;
  const toggle = `<button type="button" class="list-toggle" data-list-toggle aria-expanded="${listOpen ? "true" : "false"}">鏡頭清單 · ${points.length}</button>`;
  let body = card;
  if (listOpen) {
    if (points.length === 0) body = `<p class="empty">這個範圍沒有符合的鏡頭。</p>${card}`;
    else {
      const items = points
        .map((camera) => {
          const pressed = camera.id === selectedId ? "true" : "false";
          return `<li><button type="button" data-camera-id="${escapeHtml(camera.id)}" aria-pressed="${pressed}"><span class="cam-name">${escapeHtml(camera.name)}</span><span class="cam-meta">${escapeHtml(camera.prefectureZh)} · ${kindLabel(camera.kind)}</span></button></li>`;
        })
        .join("");
      body = `<p class="list-label">這個地方的鏡頭</p><ul class="camera-list">${items}</ul>${card}`;
    }
  }
  return `${legend}${toggle}<div class="sheet-body">${body}</div>`;
}
