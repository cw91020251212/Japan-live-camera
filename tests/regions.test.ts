import { describe, expect, it } from "vitest";
import { REGIONS, parseRoute, prefectureFromAddress, prefectureZh, regionOf } from "../src/regions";

describe("prefectures", () => {
  it("reads a prefecture from the start of an address", () => {
    expect(prefectureFromAddress("青森県青森市浪岡")).toBe("青森県");
    expect(prefectureFromAddress("東京都千代田区")).toBe("東京都");
    expect(prefectureFromAddress("北海道札幌市")).toBe("北海道");
    expect(prefectureFromAddress("京都府京都市")).toBe("京都府");
    expect(prefectureFromAddress("大阪府大阪市")).toBe("大阪府");
  });

  it("returns null when the address has no prefecture", () => {
    expect(prefectureFromAddress("")).toBeNull();
    expect(prefectureFromAddress("日本")).toBeNull();
  });

  it("maps every listed prefecture to one region and a Chinese name", () => {
    expect(regionOf("青森県")).toBe("tohoku");
    expect(regionOf("東京都")).toBe("kanto");
    expect(regionOf("新潟県")).toBe("chubu");
    expect(regionOf("三重県")).toBe("kansai");
    expect(regionOf("広島県")).toBe("chugoku");
    expect(regionOf("徳島県")).toBe("shikoku");
    expect(regionOf("沖縄県")).toBe("kyushu");
    expect(prefectureZh("静岡県")).toBe("靜岡縣");
    expect(prefectureZh("広島県")).toBe("廣島縣");
    expect(prefectureZh("徳島県")).toBe("德島縣");
    expect(prefectureZh("沖縄県")).toBe("沖繩縣");
  });

  it("lists eight regions in display order", () => {
    expect(REGIONS.map((region) => region.label)).toEqual([
      "北海道", "東北", "關東", "中部", "關西", "中國", "四國", "九州・沖繩",
    ]);
  });

  it("parses the home and region routes", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
    expect(parseRoute("#/")).toEqual({ name: "home" });
    expect(parseRoute("#/tohoku")).toEqual({ name: "region", regionId: "tohoku" });
    expect(parseRoute("#/nope")).toEqual({ name: "home" });
  });
});
