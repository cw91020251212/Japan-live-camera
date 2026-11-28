import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Camera } from "./classify";
import type { Catalog } from "./catalog";
import { viewModel, type RegionMarker, type ViewState } from "./view";
import "./style.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const KIND_COLOR = ["match", ["get", "kind"], "video", "#1f4b73", "image", "#9c3b2e", "#8d8478"] as const;

let catalog: Catalog = { cameras: [], doors: [] };
let state: ViewState = { category: "all", imagesOnly: false, selectedId: null, listOpen: false };
let map: Map | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function appRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("missing #app");
  return root;
}

function pointsData(points: Camera[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((camera) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [camera.longitude, camera.latitude] },
      properties: { id: camera.id, kind: camera.kind },
    })),
  };
}

function clearRefresh(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

function armRefresh(): void {
  clearRefresh();
  const image = document.querySelector<HTMLImageElement>("img[data-refresh]");
  if (!image) return;
  const original = image.getAttribute("src") ?? "";
  refreshTimer = setInterval(() => {
    const join = original.includes("?") ? "&" : "?";
    image.src = `${original}${join}t=${Date.now()}`;
  }, 60_000);
}

function destroyMap(): void {
  map?.remove();
  map = null;
}

function bindRegionMap(bounds: [number, number, number, number], markers: RegionMarker[]): void {
  destroyMap();
  const container = document.querySelector<HTMLElement>("#map");
  if (!container) return;
  map = new maplibregl.Map({
    container,
    style: MAP_STYLE,
    bounds: [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ],
    fitBoundsOptions: { padding: { top: 72, right: 56, bottom: 64, left: 28 } },
    attributionControl: false,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  map.on("load", () => {
    if (!map) return;
    for (const marker of markers) {
      const link = document.createElement("a");
      link.className = "region-pin";
      link.href = `#/${marker.id}`;
      link.setAttribute("aria-label", `${marker.label}，${marker.live} 個畫面`);
      const name = document.createElement("span");
      name.className = "pin-name";
      name.textContent = marker.label;
      const count = document.createElement("span");
      count.className = "pin-count";
      count.textContent = `${marker.live} 個畫面`;
      link.append(name, count);
      new maplibregl.Marker({ element: link, anchor: "center" }).setLngLat([marker.longitude, marker.latitude]).addTo(map);
    }
  });
}

function bindMap(bounds: [number, number, number, number], points: Camera[]): void {
  destroyMap();
  const container = document.querySelector<HTMLElement>("#map");
  if (!container) return;
  map = new maplibregl.Map({
    container,
    style: MAP_STYLE,
    bounds: [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ],
    fitBoundsOptions: { padding: { top: 72, right: 56, bottom: 96, left: 24 } },
    attributionControl: false,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  map.on("load", () => {
    if (!map) return;
    map.addSource("cameras", {
      type: "geojson",
      data: pointsData(points),
    });
    map.addLayer({
      id: "points",
      type: "circle",
      source: "cameras",
      paint: {
        "circle-color": KIND_COLOR,
        "circle-radius": 6,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fffefb",
      },
    });
    paintSelection();
    map.on("click", "points", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id !== "string") return;
      state = { ...state, selectedId: state.selectedId === id ? null : id, listOpen: false };
      draw();
    });
    map.on("click", (event) => {
      if (!map) return;
      const hits = map.queryRenderedFeatures(event.point, { layers: ["points"] });
      if (hits.length > 0) return;
      if (!state.selectedId && !state.listOpen) return;
      state = { ...state, selectedId: null, listOpen: false };
      draw();
    });
    map.on("mouseenter", "points", () => {
      if (map) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "points", () => {
      if (map) map.getCanvas().style.cursor = "";
    });
  });
}

function updatePoints(points: Camera[]): void {
  const source = map?.getSource("cameras");
  if (!source || source.type !== "geojson") return;
  (source as GeoJSONSource).setData(pointsData(points));
  paintSelection();
}

function paintSelection(): void {
  if (!map?.getLayer("points")) return;
  const id = state.selectedId ?? "";
  map.setPaintProperty("points", "circle-color", KIND_COLOR);
  map.setPaintProperty("points", "circle-radius", ["case", ["==", ["get", "id"], id], 9, 6]);
  map.setPaintProperty("points", "circle-stroke-width", ["case", ["==", ["get", "id"], id], 3, 2]);
}

function bindCameraButtons(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>("[data-camera-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.cameraId ?? null;
      const selectedId = state.selectedId === id ? null : id;
      state = { ...state, selectedId, listOpen: false };
      draw();
      if (!selectedId) return;
      const camera = catalog.cameras.find((item) => item.id === selectedId);
      if (!camera || !map) return;
      map.easeTo({ center: [camera.longitude, camera.latitude], zoom: Math.max(map.getZoom(), 8) });
    });
  });
}

function draw(): void {
  const view = viewModel(catalog, location.hash || "#/", state);
  document.title = `Live Camera · ${view.title}`;
  const root = appRoot();
  const current = root.querySelector("[data-view]")?.getAttribute("data-view");
  const sameMap = Boolean(map && view.kind === "region" && current === "region" && view.bounds && root.querySelector("#map"));
  if (sameMap) {
    const sheet = root.querySelector("[data-sheet]");
    const doors = root.querySelector("[data-doors]");
    const next = document.createElement("div");
    next.innerHTML = view.html;
    if (sheet) sheet.innerHTML = next.querySelector("[data-sheet]")?.innerHTML ?? "";
    if (doors) doors.innerHTML = next.querySelector("[data-doors]")?.innerHTML ?? "";
    root.querySelectorAll<HTMLButtonElement>("[data-category], [data-images-only]").forEach((button) => {
      const match = next.querySelector<HTMLButtonElement>(
        button.dataset.category ? `[data-category="${button.dataset.category}"]` : "[data-images-only]",
      );
      if (match) button.setAttribute("aria-pressed", match.getAttribute("aria-pressed") ?? "false");
    });
    updatePoints(view.points);
    bindCameraButtons(root);
    bindListToggle(root);
  } else {
    destroyMap();
    root.innerHTML = view.html;
    if (view.bounds && view.kind === "home") bindRegionMap(view.bounds, view.markers);
    else if (view.bounds) bindMap(view.bounds, view.points);
    root.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.dataset.category;
        if (category !== "all" && category !== "road" && category !== "tourism" && category !== "weather") return;
        state = { ...state, category };
        draw();
      });
    });
    root.querySelector<HTMLButtonElement>("[data-images-only]")?.addEventListener("click", () => {
      state = { ...state, imagesOnly: !state.imagesOnly };
      draw();
    });
    bindCameraButtons(root);
    bindListToggle(root);
  }
  armRefresh();
}

function bindListToggle(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>("[data-list-toggle]")?.addEventListener("click", () => {
    state = { ...state, listOpen: !state.listOpen };
    draw();
  });
}

async function start(): Promise<void> {
  const root = appRoot();
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    catalog = (await response.json()) as Catalog;
  } catch {
    root.textContent = "目錄暫時讀不到。請稍後再試。";
    return;
  }
  window.addEventListener("hashchange", () => {
    state = { ...state, selectedId: null, listOpen: false };
    draw();
  });
  draw();
}

void start();
