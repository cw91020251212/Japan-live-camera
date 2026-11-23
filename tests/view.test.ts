import { describe, expect, it } from "vitest";
import type { Camera } from "../src/classify";
import type { OfficialDoor } from "../src/select";
import { viewModel, type ViewState } from "../src/view";

const photo = {
  id: "p",
  name: "浪岡IC",
  place: "浪岡IC",
  prefectureJa: "青森県",
  prefectureZh: "青森縣",
  regionId: "tohoku",
  category: "road",
  kind: "image",
  latitude: 40.7,
  longitude: 140.5,
  pageUrl: "https://example.jp/a.jpg",
  mediaUrl: "https://example.jp/a.jpg",
  embedUrl: null,
  provider: "公開目錄",
  refreshSeconds: 60,
  hidden: false,
} satisfies Camera;
const door: OfficialDoor = {
  id: "river",
  name: "川の防災情報",
  regionId: "all",
  category: "weather",
  provider: "國土交通省",
  pageUrl: "https://www.river.go.jp/",
  note: "全國河川入口",
  hidden: false,
};
const state: ViewState = { category: "all", imagesOnly: false, selectedId: null };

describe("viewModel", () => {
  it("shows the region grid on the home route", () => {
    const view = viewModel({ cameras: [photo], doors: [door] }, "#/", state);
    expect(view.title).toBe("日本公開鏡頭");
    expect(view.html).toContain("東北");
    expect(view.bounds).toBeNull();
    expect(view.points).toEqual([]);
  });

  it("shows points and doors for the selected region", () => {
    const view = viewModel({ cameras: [photo], doors: [door] }, "#/tohoku", { ...state, selectedId: "p" });
    expect(view.points.map((camera) => camera.id)).toEqual(["p"]);
    expect(view.html).toContain("浪岡IC");
    expect(view.html).toContain("川の防災情報");
    expect(view.bounds).toEqual([139.0, 36.7, 142.1, 41.6]);
  });
});
