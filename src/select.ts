import type { Camera } from "./classify";
import { REGIONS, type RegionId } from "./regions";

export type OfficialDoor = {
  id: string;
  name: string;
  regionId: RegionId | "all";
  category: "road" | "tourism" | "weather";
  provider: string;
  pageUrl: string;
  note: string;
  hidden: boolean;
};

export type FilterQuery = {
  category: "all" | "road" | "tourism" | "weather";
  imagesOnly: boolean;
};

function categoryMatches(category: Camera["category"] | OfficialDoor["category"], query: FilterQuery): boolean {
  return query.category === "all" || category === query.category;
}

export function filterCameras(cameras: Camera[], regionId: RegionId, query: FilterQuery): Camera[] {
  return cameras.filter((camera) => {
    if (camera.hidden || camera.regionId !== regionId) return false;
    if (!categoryMatches(camera.category, query)) return false;
    if (query.imagesOnly && camera.kind !== "image" && camera.kind !== "video") return false;
    return true;
  });
}

export function doorsFor(doors: OfficialDoor[], regionId: RegionId, query: FilterQuery): OfficialDoor[] {
  return doors.filter((door) => {
    if (door.hidden) return false;
    if (door.regionId !== "all" && door.regionId !== regionId) return false;
    return categoryMatches(door.category, query);
  });
}

export function regionCounts(cameras: Camera[], doors: OfficialDoor[]): { id: RegionId; label: string; live: number; doors: number }[] {
  return REGIONS.map((region) => ({
    id: region.id,
    label: region.label,
    live: cameras.filter(
      (camera) => !camera.hidden && camera.regionId === region.id && (camera.kind === "image" || camera.kind === "video"),
    ).length,
    doors: doors.filter((door) => !door.hidden && (door.regionId === "all" || door.regionId === region.id)).length,
  }));
}

export function shouldHide(status: number): boolean {
  return status < 200 || status >= 400;
}
