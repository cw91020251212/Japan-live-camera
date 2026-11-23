import { describe, expect, it } from "vitest";
import type { Camera } from "../src/classify";
import { renderDoors, renderHome, renderSheet } from "../src/render";
import type { OfficialDoor } from "../src/select";

const photo = {
  id: "p",
  name: "京都站",
  place: "京都駅",
  prefectureJa: "京都府",
  prefectureZh: "京都府",
  regionId: "kansai",
  category: "tourism",
  kind: "image",
  latitude: 34.9,
  longitude: 135.7,
  pageUrl: "https://example.jp/k.jpg",
  mediaUrl: "https://example.jp/k.jpg",
  embedUrl: null,
  provider: "公開目錄",
  refreshSeconds: 60,
  hidden: false,
} satisfies Camera;

describe("render", () => {
  it("renders eight region links with both counts", () => {
    const html = renderHome([{ id: "tohoku", label: "東北", live: 24, doors: 6 }]);
    expect(html).toContain('href="#/tohoku"');
    expect(html).toContain("24 有畫面");
    expect(html).toContain("6 官方入口");
  });

  it("renders a photo, a video, and a compact official card", () => {
    expect(renderSheet(photo)).toContain("<img");
    expect(renderSheet(photo)).toContain("京都駅");
    expect(renderSheet({ ...photo, kind: "video", embedUrl: "https://www.youtube.com/embed/abc" })).toContain("<iframe");
    const link = renderSheet({ ...photo, kind: "link", mediaUrl: null, embedUrl: null, name: "E4 東北道" });
    expect(link).toContain("前往官方頁面");
    expect(link).toContain("本站不存放影像");
    expect(link).not.toContain("<img");
  });

  it("escapes door names and opens doors in a new tab", () => {
    const door: OfficialDoor = {
      id: "x",
      name: "A&B",
      regionId: "tohoku",
      category: "road",
      provider: "NEXCO東日本",
      pageUrl: "https://www.driveplaza.com/traffic/camera/tohoku.html",
      note: "東北",
      hidden: false,
    };
    const html = renderDoors([door]);
    expect(html).toContain("A&amp;B");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
