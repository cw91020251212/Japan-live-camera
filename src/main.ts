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
      link.setAttribute("aria-label", `${marker.label} ${marker.live}`);
      const count = document.createElement("strong");
      count.textContent = String(marker.live);
      const name = document.createElement("span");
      name.textContent = marker.label;
      link.append(count, name);
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
      cluster: true,
      clusterRadius: 50,
    });
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "cameras",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#1b242c",
        "circle-radius": 18,
      },
    });
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "cameras",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
      },
      paint: { "text-color": "#f3f1eb" },
    });
    map.addLayer({
      id: "points",
      type: "circle",
      source: "cameras",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#8c3a2f",
        "circle-radius": 7,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#f3f1eb",
      },
    });
    map.on("click", "clusters", (event) => {
      if (!map) return;
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      map.easeTo({
        center: feature.geometry.coordinates as [number, number],
        zoom: map.getZoom() + 2,
      });
    });
    map.on("click", "points", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id !== "string") return;
      state = { ...state, selectedId: id };
      draw();
    });
    map.on("mouseenter", "clusters", () => {
      if (map) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
      if (map) map.getCanvas().style.cursor = "";
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
