import type { Camera } from "./classify";
import type { Catalog } from "./catalog";
import { doorsFor, filterCameras, regionCounts, type FilterQuery } from "./select";
import { parseRoute, regionBounds, REGIONS } from "./regions";
import { renderDoors, renderHome, renderSheet } from "./render";

export type ViewState = { category: "all" | "road" | "tourism" | "weather"; imagesOnly: boolean; selectedId: string | null };

export function viewModel(
  catalog: Catalog,
  hash: string,
  state: ViewState,
): { title: string; html: string; bounds: [number, number, number, number] | null; points: Camera[] } {
  const route = parseRoute(hash);
  if (route.name === "home") {
    return {
      title: "日本公開鏡頭",
      html: renderHome(regionCounts(catalog.cameras, catalog.doors)),
      bounds: null,
      points: [],
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
      <div class="sheet" data-sheet>${selected ? renderSheet(selected) : ""}</div>
      <div data-doors>${renderDoors(doors)}</div>
    </div>
  </section>`;

  return { title: label, html, bounds: regionBounds(route.regionId), points };
}
