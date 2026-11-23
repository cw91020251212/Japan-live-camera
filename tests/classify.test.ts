import { describe, expect, it } from "vitest";
import { classifyRow } from "../src/classify";

const base = {
  stream_title: "浪岡IC",
  stream_url: "https://example.jp/a.jpg",
  stream_status: "TRUE",
  stream_type: "image",
  category: "道路",
  poi: "浪岡IC",
  provider: "公開目錄",
  provider_url: "https://example.jp",
  address: "青森県青森市",
  latitude: "40.71",
  longitude: "140.57",
};

describe("classifyRow", () => {
  it("keeps a direct image as an in-page photo", () => {
    const camera = classifyRow(base);
    expect(camera?.kind).toBe("image");
    expect(camera?.category).toBe("road");
    expect(camera?.prefectureZh).toBe("青森縣");
    expect(camera?.regionId).toBe("tohoku");
    expect(camera?.refreshSeconds).toBe(60);
    expect(camera?.mediaUrl).toBe("https://example.jp/a.jpg");
    expect(camera?.embedUrl).toBeNull();
    expect(camera?.hidden).toBe(false);
  });

  it("embeds a YouTube watch URL and treats other videos as links", () => {
    const youtube = classifyRow({
      ...base,
      stream_type: "video",
      stream_url: "https://www.youtube.com/watch?v=abc123XYZ_-",
      category: "観光",
    });
    expect(youtube?.kind).toBe("video");
    expect(youtube?.embedUrl).toBe("https://www.youtube.com/embed/abc123XYZ_-");
    expect(youtube?.category).toBe("tourism");

    const page = classifyRow({ ...base, stream_type: "video", stream_url: "https://example.jp/live" });
    expect(page?.kind).toBe("link");
    expect(page?.embedUrl).toBeNull();
  });

  it("maps river and coast to weather, and a blank category to other", () => {
    expect(classifyRow({ ...base, category: "河川" })?.category).toBe("weather");
    expect(classifyRow({ ...base, category: "海岸" })?.category).toBe("weather");
    expect(classifyRow({ ...base, category: "鉄道" })?.category).toBe("tourism");
    expect(classifyRow({ ...base, category: "" })?.category).toBe("other");
  });

  it("drops rows that are not viewable, unlocated, or outside Japan", () => {
    expect(classifyRow({ ...base, stream_status: "FALSE" })).toBeNull();
    expect(classifyRow({ ...base, stream_status: "" })).toBeNull();
    expect(classifyRow({ ...base, stream_url: "" })).toBeNull();
    expect(classifyRow({ ...base, address: "不明" })).toBeNull();
    expect(classifyRow({ ...base, latitude: "0", longitude: "0" })).toBeNull();
  });
});
