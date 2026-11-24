import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Camera } from "./classify";
import type { Catalog } from "./catalog";
import { viewModel, type RegionMarker, type ViewState } from "./view";
import "./style.css";

let catalog: Catalog = { cameras: [], doors: [] };
let state: ViewState = { category: "all", imagesOnly: false, selectedId: null };
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
      properties: { id: camera.id },
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
    style: "https://tiles.openfreemap.org/styles/liberty",
    bounds: [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ],
    fitBoundsOptions: { padding: 36 },
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
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
    style: "https://tiles.openfreemap.org/styles/liberty",
    bounds: [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ],
    fitBoundsOptions: { padding: 24 },
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
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
        "circle-color": "#243044",
        "circle-radius": 6,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#f7f3ea",
      },
    });
    paintSelection();
    map.on("click", "points", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id !== "string") return;
      state = { ...state, selectedId: id };
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
  map.setPaintProperty("points", "circle-color", ["case", ["==", ["get", "id"], id], "#9c3b2e", "#243044"]);
  map.setPaintProperty("points", "circle-radius", ["case", ["==", ["get", "id"], id], 8, 6]);
}

function bindCameraButtons(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>("[data-camera-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.cameraId ?? null;
      state = { ...state, selectedId: id };
      draw();
      const camera = catalog.cameras.find((item) => item.id === id);
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
  }
  armRefresh();
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
    state = { ...state, selectedId: null };
    draw();
  });
  draw();
}

void start();
