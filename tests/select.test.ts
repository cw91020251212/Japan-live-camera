import { describe, expect, it } from "vitest";
import type { Camera } from "../src/classify";
import { doorsFor, filterCameras, regionCounts, shouldHide, type OfficialDoor } from "../src/select";

const photo = {
  id: "p", name: "浪岡IC", place: "浪岡IC", prefectureJa: "青森県", prefectureZh: "青森縣",
  regionId: "tohoku", category: "road", kind: "image", latitude: 40.7, longitude: 140.5,
  pageUrl: "https://example.jp/a.jpg", mediaUrl: "https://example.jp/a.jpg", embedUrl: null,
  provider: "公開目錄", refreshSeconds: 60, hidden: false,
} satisfies Camera;

const doorCamera = { ...photo, id: "d", kind: "link" as const, category: "weather" as const, mediaUrl: null };
const hidden = { ...photo, id: "h", hidden: true };
const door: OfficialDoor = {
  id: "river", name: "川の防災情報", regionId: "all", category: "weather",
  provider: "國土交通省", pageUrl: "https://www.river.go.jp/", note: "全國河川入口", hidden: false,
};

describe("selection", () => {
  it("filters by region, category, hidden flag, and images only", () => {
    const all = filterCameras([photo, doorCamera, hidden], "tohoku", { category: "all", imagesOnly: false });
    expect(all.map((camera) => camera.id)).toEqual(["p", "d"]);
    expect(filterCameras([photo, doorCamera], "tohoku", { category: "road", imagesOnly: false }).map((c) => c.id)).toEqual(["p"]);
    expect(filterCameras([photo, doorCamera], "tohoku", { category: "all", imagesOnly: true }).map((c) => c.id)).toEqual(["p"]);
    expect(filterCameras([photo], "kanto", { category: "all", imagesOnly: false })).toEqual([]);
  });

  it("keeps national doors on a region and hides them from unrelated categories", () => {
    expect(doorsFor([door], "kyushu", { category: "weather", imagesOnly: true }).map((item) => item.id)).toEqual(["river"]);
    expect(doorsFor([door], "kyushu", { category: "road", imagesOnly: false })).toEqual([]);
  });

  it("counts visible in-page cameras separately from doors", () => {
    const counts = regionCounts([photo, doorCamera, hidden], [door]);
    const tohoku = counts.find((region) => region.id === "tohoku");
    expect(tohoku).toMatchObject({ label: "東北", live: 1, doors: 1 });
  });

  it("hides links that do not open", () => {
    expect(shouldHide(200)).toBe(false);
    expect(shouldHide(399)).toBe(false);
    expect(shouldHide(404)).toBe(true);
    expect(shouldHide(0)).toBe(true);
  });
});
