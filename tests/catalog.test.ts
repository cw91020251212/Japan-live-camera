import { describe, expect, it } from "vitest";
import { applyLinkChecks, buildCatalog, parseCsv } from "../src/catalog";
import type { OfficialDoor } from "../src/select";

const csv = [
  "stream_title,stream_url,stream_status,stream_type,category,poi,provider,provider_url,address,latitude,longitude",
  "浪岡IC,https://example.jp/a.jpg,TRUE,image,道路,浪岡IC,公開目錄,https://example.jp,青森県青森市,40.71,140.57",
  "壞鏡頭,https://example.jp/dead.jpg,FALSE,image,道路,壞,公開目錄,https://example.jp,青森県青森市,40.72,140.58",
].join("\n");

const doors: OfficialDoor[] = [
  {
    id: "tohoku-road",
    name: "ドラぷら東北",
    regionId: "tohoku",
    category: "road",
    provider: "NEXCO東日本",
    pageUrl: "https://www.driveplaza.com/traffic/camera/tohoku.html",
    note: "東北高速道路",
    hidden: false,
  },
];

describe("catalog", () => {
  it("parses quotes and builds only viewable cameras", () => {
    expect(parseCsv('"a,b",c\n"1,2",3')).toEqual([{ "a,b": "1,2", c: "3" }]);
    const catalog = buildCatalog(csv, doors);
    expect(catalog.cameras).toHaveLength(1);
    expect(catalog.cameras[0].name).toBe("浪岡IC");
    expect(catalog.doors).toHaveLength(1);
  });

  it("hides a door when its page does not open and keeps the record", () => {
    const catalog = buildCatalog(csv, doors);
    const next = applyLinkChecks(catalog, [{ url: doors[0].pageUrl, status: 404 }]);
    expect(next.doors[0].hidden).toBe(true);
    expect(next.doors[0].name).toBe("ドラぷら東北");
  });

  it("shows a previously hidden record again when the page opens", () => {
    const hiddenDoor = { ...doors[0], hidden: true };
    const catalog = buildCatalog(csv, [hiddenDoor]);
    const next = applyLinkChecks(catalog, [{ url: hiddenDoor.pageUrl, status: 200 }]);
    expect(next.doors[0].hidden).toBe(false);
  });
});
