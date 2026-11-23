# 日本 Live Camera 地圖 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一個零月費嘅日本公開 Live Camera 網站：第一眼八個地方，入去之後全屏地圖；有畫面先喺本站顯示，其餘只放官方連結。

**Architecture:** 呢個資料夾就係個網站，同宿舍分數計數器分開。純函數負責分類、篩選、計數同 HTML。Vite 負責畫面。MapLibre 只負責畫點。目錄由 CSV 建成 `public/catalog.json`，每星期重建。

**Tech Stack:** Node 22、TypeScript、Vite 6、Vitest 2、MapLibre GL 4、OpenFreeMap Liberty 樣式。

## Global Constraints

- 介面用書面繁體中文；地名保持日文；縣名加中文。
- 站名 `Live Camera`，副題 `日本公開鏡頭`。
- 第一眼八個地方：北海道、東北、關東、中部、關西、中國、四國、九州・沖繩。
- 入去地方之後先係全屏地圖同底部卡片。唔用右側長面板。
- 篩選：全部、道路、觀光、天氣災害。另有「只看有畫面」。
- 直接圖片先至當相片。只限 YouTube 嵌入當影片。其他網址當官方連結。
- 官方入口冇真實座標就只出現喺清單，唔放假點。
- `stream_status` 唔係 `TRUE`、冇座標、冇網址、讀唔到都道府縣，就唔收。
- 相片預設 60 秒刷新。瀏覽器向原站要圖，本站唔儲影像。
- 連結每星期檢查。開唔到就收起，資料留低。
- 唔買 JARTIC、水防災數據。唔收私人鏡頭。第一版唔做 Live TV、唔做 Google 立體。
- 底圖用 `https://tiles.openfreemap.org/styles/liberty`。
- 頁尾原文：`本站只整理公開連結與允許嵌入的畫面。需付費轉載的鏡頭只提供官方連結，畫面在官方網站觀看。`

---

### Task 1: 建立專案

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `npm test` 可以跑。之後嘅模組都放喺 `src/`。

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

describe("project", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL，因為未有 `package.json` 同 vitest。

- [ ] **Step 3: Write the project files**

`package.json`

```json
{
  "name": "japan-live-camera",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "catalog": "tsx scripts/build-catalog.ts"
  },
  "dependencies": {
    "maplibre-gl": "^4.7.1"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "scripts", "tests"]
}
```

`vite.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

`index.html`

```html
<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Live Camera · 日本公開鏡頭</title>
  </head>
  <body>
    <div id="app"></div>
    <footer id="legal">本站只整理公開連結與允許嵌入的畫面。需付費轉載的鏡頭只提供官方連結，畫面在官方網站觀看。</footer>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`.gitignore`

```gitignore
node_modules
dist
```

`src/main.ts` 先放一行，等 Vite 有入口：

```ts
document.querySelector<HTMLElement>("#app")!.textContent = "Live Camera";
```

- [ ] **Step 4: Install and run the test**

Run: `npm install` then `npm test`
Expected: PASS，`runs vitest`。

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold the Japan live camera app"
```

---

### Task 2: 地方同縣名

**Files:**
- Create: `src/regions.ts`
- Test: `tests/regions.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `export type RegionId = "hokkaido" | "tohoku" | "kanto" | "chubu" | "kansai" | "chugoku" | "shikoku" | "kyushu"`
  - `export type Route = { name: "home" } | { name: "region"; regionId: RegionId }`
  - `export function prefectureFromAddress(address: string): string | null`
  - `export function regionOf(prefectureJa: string): RegionId | null`
  - `export function prefectureZh(prefectureJa: string): string | null`
  - `export function parseRoute(hash: string): Route`
  - `export function regionBounds(id: RegionId): [number, number, number, number]`
  - `export const REGIONS: { id: RegionId; label: string }[]`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/regions.test.ts`
Expected: FAIL，`regions.ts` 未存在。

- [ ] **Step 3: Write the implementation**

`src/regions.ts` 要包含全部 47 個都道府縣。日文鍵用地址入面嘅字形：`静岡県`、`広島県`、`徳島県`。中文顯示用 `靜岡縣`、`廣島縣`、`德島縣`。

分區：

- hokkaido：北海道
- tohoku：青森県、岩手県、宮城県、秋田県、山形県、福島県
- kanto：茨城県、栃木県、群馬県、埼玉県、千葉県、東京都、神奈川県
- chubu：新潟県、富山県、石川県、福井県、山梨県、長野県、岐阜県、静岡県、愛知県
- kansai：三重県、滋賀県、京都府、大阪府、兵庫県、奈良県、和歌山県
- chugoku：鳥取県、島根県、岡山県、広島県、山口県
- shikoku：徳島県、香川県、愛媛県、高知県
- kyushu：福岡県、佐賀県、長崎県、熊本県、大分県、宮崎県、鹿児島県、沖縄県

`regionBounds` 回傳 `[west, south, east, north]`：

```ts
const BOUNDS: Record<RegionId, [number, number, number, number]> = {
  hokkaido: [139.2, 41.2, 146.0, 45.6],
  tohoku: [139.0, 36.7, 142.1, 41.6],
  kanto: [138.4, 34.8, 140.9, 37.2],
  chubu: [135.4, 34.5, 139.9, 38.6],
  kansai: [134.2, 33.4, 136.9, 35.8],
  chugoku: [130.8, 33.7, 134.5, 35.7],
  shikoku: [132.0, 32.7, 134.8, 34.4],
  kyushu: [122.9, 24.0, 132.1, 34.0],
};
```

`prefectureFromAddress` 用呢個正規式，長名先試：

```ts
const PREFECTURE_RE = /^(北海道|東京都|大阪府|京都府|[\u4e00-\u9fff]{2,3}県)/;
```

對到表先至回傳，對唔到回傳 `null`。`parseRoute` 只接受 `REGIONS` 入面嘅 id。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/regions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/regions.ts tests/regions.test.ts
git commit -m "feat: map Japanese prefectures onto eight regions"
```

---

### Task 3: 分辨相片、影片、官方連結

**Files:**
- Create: `src/classify.ts`
- Test: `tests/classify.test.ts`

**Interfaces:**
- Consumes: `RegionId`、`prefectureFromAddress`、`regionOf`、`prefectureZh`
- Produces:
  - `export type Category = "road" | "tourism" | "weather" | "other"`
  - `export type Kind = "image" | "video" | "link"`
  - `export type CatalogRow = { stream_title: string; stream_url: string; stream_status: string; stream_type: string; category: string; poi: string; provider: string; provider_url: string; address: string; latitude: string; longitude: string }`
  - `export type Camera = { id: string; name: string; place: string; prefectureJa: string; prefectureZh: string; regionId: RegionId; category: Category; kind: Kind; latitude: number; longitude: number; pageUrl: string; mediaUrl: string | null; embedUrl: string | null; provider: string; refreshSeconds: number | null; hidden: boolean }`
  - `export function classifyRow(row: CatalogRow): Camera | null`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/classify.test.ts`
Expected: FAIL，`classify.ts` 未存在。

- [ ] **Step 3: Write the implementation**

規則：

- 緯度要喺 20 到 50，經度要喺 122 到 154。
- `category`：`道路` → `road`；`観光`、`鉄道`、`空港`、`山岳` → `tourism`；`河川`、`海岸` → `weather`；其他包括空白同 `その他` → `other`。
- 網址路徑以 `.jpg`、`.jpeg`、`.png`、`.webp`、`.gif` 結尾先至 `kind: "image"`。`mediaUrl` 係嗰條網址，`refreshSeconds` 係 60。
- YouTube `watch?v=`、`youtu.be/`、`/embed/` 先至 `kind: "video"`。`embedUrl` 用 `https://www.youtube.com/embed/` 加影片 id。`refreshSeconds` 係 `null`。
- 其餘有網址嘅係 `kind: "link"`。`mediaUrl` 同 `embedUrl` 都係 `null`。
- `pageUrl` 永遠係原來嘅 `stream_url`。
- `name` 用 `stream_title`，空白先用 `poi`。`place` 用 `poi`，空白先用 `name`。
- `id` 用 `` `${latitude},${longitude}:${name}` ``。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/classify.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/classify.ts tests/classify.test.ts
git commit -m "feat: classify public camera rows into photo, video, or link"
```

---

### Task 4: 篩選、計數、壞連結

**Files:**
- Create: `src/select.ts`
- Test: `tests/select.test.ts`

**Interfaces:**
- Consumes: `Camera`、`RegionId`、`REGIONS`
- Produces:
  - `export type OfficialDoor = { id: string; name: string; regionId: RegionId | "all"; category: "road" | "tourism" | "weather"; provider: string; pageUrl: string; note: string; hidden: boolean }`
  - `export type FilterQuery = { category: "all" | "road" | "tourism" | "weather"; imagesOnly: boolean }`
  - `export function filterCameras(cameras: Camera[], regionId: RegionId, query: FilterQuery): Camera[]`
  - `export function doorsFor(doors: OfficialDoor[], regionId: RegionId, query: FilterQuery): OfficialDoor[]`
  - `export function regionCounts(cameras: Camera[], doors: OfficialDoor[]): { id: RegionId; label: string; live: number; doors: number }[]`
  - `export function shouldHide(status: number): boolean`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/select.test.ts`
Expected: FAIL，`select.ts` 未存在。

- [ ] **Step 3: Write the implementation**

`imagesOnly` 只收 `kind` 係 `image` 或 `video`。`hidden: true` 唔計入篩選同計數。`regionId: "all"` 嘅門喺每個地方都出現，每個地方嘅 `doors` 數都加一。`category: "other"` 只喺 `category: "all"` 出現。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/select.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/select.ts tests/select.test.ts
git commit -m "feat: filter cameras and count regional doors"
```

---

### Task 5: 畫面 HTML

**Files:**
- Create: `src/render.ts`
- Test: `tests/render.test.ts`

**Interfaces:**
- Consumes: `Camera`、`OfficialDoor`、`regionCounts` 嘅回傳形狀
- Produces:
  - `export function renderHome(counts: { id: string; label: string; live: number; doors: number }[]): string`
  - `export function renderSheet(camera: Camera): string`
  - `export function renderDoors(doors: OfficialDoor[]): string`
  - `export function escapeHtml(value: string): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import type { Camera } from "../src/classify";
import { renderDoors, renderHome, renderSheet } from "../src/render";
import type { OfficialDoor } from "../src/select";

const photo = {
  id: "p", name: "京都站", place: "京都駅", prefectureJa: "京都府", prefectureZh: "京都府",
  regionId: "kansai", category: "tourism", kind: "image", latitude: 34.9, longitude: 135.7,
  pageUrl: "https://example.jp/k.jpg", mediaUrl: "https://example.jp/k.jpg", embedUrl: null,
  provider: "公開目錄", refreshSeconds: 60, hidden: false,
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
      id: "x", name: "A&B", regionId: "tohoku", category: "road", provider: "NEXCO東日本",
      pageUrl: "https://www.driveplaza.com/traffic/camera/tohoku.html", note: "東北", hidden: false,
    };
    const html = renderDoors([door]);
    expect(html).toContain("A&amp;B");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/render.test.ts`
Expected: FAIL，`render.ts` 未存在。

- [ ] **Step 3: Write the implementation**

`escapeHtml` 要轉 `& < > " '`。所有文字先逃逸再放入 HTML。

相片卡片用：

```html
<img alt="" src="ESCAPED_MEDIA_URL" data-refresh="60">
```

影片卡片用：

```html
<iframe title="ESCAPED_NAME" src="ESCAPED_EMBED_URL" allow="fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>
```

官方連結卡片用文字「畫面在官方網站觀看。本站不存放影像。」同連結文字「前往官方頁面」。`href` 用 `pageUrl`。

地方格用 `<a href="#/ID">`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/render.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/render.ts tests/render.test.ts
git commit -m "feat: render region cards and camera sheets"
```

---

### Task 6: 官方入口同目錄產生器

**Files:**
- Create: `data/official-doors.json`
- Create: `src/catalog.ts`
- Create: `scripts/build-catalog.ts`
- Test: `tests/catalog.test.ts`

**Interfaces:**
- Consumes: `classifyRow`、`OfficialDoor`、`shouldHide`
- Produces:
  - `export type Catalog = { cameras: Camera[]; doors: OfficialDoor[] }`
  - `export function parseCsv(text: string): Record<string, string>[]`
  - `export function buildCatalog(csvText: string, doors: OfficialDoor[]): Catalog`
  - `export function applyLinkChecks(catalog: Catalog, results: { url: string; status: number }[]): Catalog`
  - `scripts/build-catalog.ts` 讀 `LIVE_CAMERA_CSV` 環境變數，冇就抓 `https://raw.githubusercontent.com/w16y/opendata-livecamera-jp/main/livecamera-jp.csv`，寫入 `public/catalog.json`。抓取失敗就非零結束，唔覆寫舊檔。

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { applyLinkChecks, buildCatalog, parseCsv } from "../src/catalog";
import type { OfficialDoor } from "../src/select";

const csv = [
  "stream_title,stream_url,stream_status,stream_type,category,poi,provider,provider_url,address,latitude,longitude",
  "浪岡IC,https://example.jp/a.jpg,TRUE,image,道路,浪岡IC,公開目錄,https://example.jp,青森県青森市,40.71,140.57",
  "壞鏡頭,https://example.jp/dead.jpg,FALSE,image,道路,壞,公開目錄,https://example.jp,青森県青森市,40.72,140.58",
].join("\n");

const doors: OfficialDoor[] = [{
  id: "tohoku-road", name: "ドラぷら東北", regionId: "tohoku", category: "road",
  provider: "NEXCO東日本", pageUrl: "https://www.driveplaza.com/traffic/camera/tohoku.html",
  note: "東北高速道路", hidden: false,
}];

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/catalog.test.ts`
Expected: FAIL，`catalog.ts` 未存在。

- [ ] **Step 3: Write the data file and implementation**

`data/official-doors.json` 只放已核對嘅頁：

```json
[
  {
    "id": "tohoku-road",
    "name": "ドラぷら東北",
    "regionId": "tohoku",
    "category": "road",
    "provider": "NEXCO東日本",
    "pageUrl": "https://www.driveplaza.com/traffic/camera/tohoku.html",
    "note": "東北高速道路",
    "hidden": false
  },
  {
    "id": "kanto-road",
    "name": "ドラぷら關東",
    "regionId": "kanto",
    "category": "road",
    "provider": "NEXCO東日本",
    "pageUrl": "https://www.driveplaza.com/traffic/camera/kanto.html",
    "note": "關東高速道路",
    "hidden": false
  },
  {
    "id": "hokkaido-road-index",
    "name": "ドラぷら索引",
    "regionId": "hokkaido",
    "category": "road",
    "provider": "NEXCO東日本",
    "pageUrl": "https://www.driveplaza.com/traffic/camera/",
    "note": "北海道由索引進入",
    "hidden": false
  },
  {
    "id": "shinetsu-road-index",
    "name": "ドラぷら索引",
    "regionId": "chubu",
    "category": "road",
    "provider": "NEXCO東日本",
    "pageUrl": "https://www.driveplaza.com/traffic/camera/",
    "note": "信越由索引進入",
    "hidden": false
  },
  {
    "id": "river-national",
    "name": "川の防災情報",
    "regionId": "all",
    "category": "weather",
    "provider": "國土交通省",
    "pageUrl": "https://www.river.go.jp/",
    "note": "全國河川入口",
    "hidden": false
  }
]
```

`parseCsv` 要處理雙引號同引號入面嘅逗號。`buildCatalog` 對每一行叫 `classifyRow`，丟走 `null`。`applyLinkChecks` 用 `pageUrl` 對狀態，`shouldHide` 為真就設 `hidden: true`，否則 `hidden: false`。

`scripts/build-catalog.ts`：

```ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { buildCatalog } from "../src/catalog";
import type { OfficialDoor } from "../src/select";

const doors = JSON.parse(readFileSync(new URL("../data/official-doors.json", import.meta.url), "utf8")) as OfficialDoor[];
const source = process.env.LIVE_CAMERA_CSV;
const csv = source
  ? readFileSync(source, "utf8")
  : await fetch("https://raw.githubusercontent.com/w16y/opendata-livecamera-jp/main/livecamera-jp.csv").then((response) => {
      if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);
      return response.text();
    });
mkdirSync(new URL("../public", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/catalog.json", import.meta.url), JSON.stringify(buildCatalog(csv, doors)));
```

抓取拋錯時程式自然非零結束，舊 `catalog.json` 唔會被寫過。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data/official-doors.json src/catalog.ts scripts/build-catalog.ts tests/catalog.test.ts
git commit -m "feat: build the public camera catalog from the free CSV"
```

---

### Task 7: 接上第一眼同地圖

**Files:**
- Create: `src/view.ts`
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `public/catalog.json`
- Modify: `index.html`
- Test: `tests/view.test.ts`

**Interfaces:**
- Consumes: `parseRoute`、`regionBounds`、`filterCameras`、`doorsFor`、`regionCounts`、`renderHome`、`renderSheet`、`renderDoors`、`Catalog`
- Produces:
  - `export type ViewState = { category: "all" | "road" | "tourism" | "weather"; imagesOnly: boolean; selectedId: string | null }`
  - `export function viewModel(catalog: Catalog, hash: string, state: ViewState): { title: string; html: string; bounds: [number, number, number, number] | null; points: Camera[] }`
  - 畫面：`#/` 顯示地方格；`#/tohoku` 顯示地圖、篩選、底部卡片、官方入口。
  - 地圖：MapLibre，`style: "https://tiles.openfreemap.org/styles/liberty"`，`cluster: true`，`clusterRadius: 50`。

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import type { Camera } from "../src/classify";
import type { OfficialDoor } from "../src/select";
import { viewModel, type ViewState } from "../src/view";

const photo = {
  id: "p", name: "浪岡IC", place: "浪岡IC", prefectureJa: "青森県", prefectureZh: "青森縣",
  regionId: "tohoku", category: "road", kind: "image", latitude: 40.7, longitude: 140.5,
  pageUrl: "https://example.jp/a.jpg", mediaUrl: "https://example.jp/a.jpg", embedUrl: null,
  provider: "公開目錄", refreshSeconds: 60, hidden: false,
} satisfies Camera;
const door: OfficialDoor = {
  id: "river", name: "川の防災情報", regionId: "all", category: "weather",
  provider: "國土交通省", pageUrl: "https://www.river.go.jp/", note: "全國河川入口", hidden: false,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/view.test.ts`
Expected: FAIL，`src/view.ts` 未存在。`viewModel` 放喺 `src/view.ts`，唔好放喺 `src/main.ts`，測試先至唔使載入 MapLibre。

- [ ] **Step 3: Write the app**

`viewModel` 寫喺 `src/view.ts`，唔可以碰 `document` 或 MapLibre。`src/main.ts` 先操作 DOM。

`public/catalog.json` 先放一份可以離線打開嘅官方連結，因為示意網址唔係直接圖片：

```json
{
  "cameras": [{
    "id": "40.71,140.57:浪岡IC",
    "name": "浪岡IC",
    "place": "浪岡IC",
    "prefectureJa": "青森県",
    "prefectureZh": "青森縣",
    "regionId": "tohoku",
    "category": "road",
    "kind": "link",
    "latitude": 40.71,
    "longitude": 140.57,
    "pageUrl": "https://www.driveplaza.com/traffic/camera/tohoku.html",
    "mediaUrl": null,
    "embedUrl": null,
    "provider": "示意",
    "refreshSeconds": null,
    "hidden": false
  }],
  "doors": []
}
```

`index.html` 喺 `<head>` 加：

```html
<link rel="stylesheet" href="/src/style.css" />
```

`start()` 行為：

- 抓 `/catalog.json`。失敗就喺 `#app` 寫「目錄暫時讀不到。請稍後再試。」
- `hashchange` 同篩選按鈕呼叫 `viewModel`，把 `html` 放入 `#app`。
- 有 `bounds` 先建立或更新地圖。來源用 GeoJSON，`cluster: true`，`clusterRadius: 50`。
- 撳群組就 `easeTo` 放大兩級。撳單點就設 `selectedId`。
- 有 `data-refresh` 嘅圖片，每 60 秒把 `src` 換成原網址加 `?t=` 加時間戳。離開畫面要 `clearInterval`。
- 篩選按鈕文字：全部、道路、觀光、天氣災害、只看有畫面。
- 地方畫面有連結「全部地方」，指向 `#/`。

`style.css`：紙色底 `#f3f1eb`，墨色字 `#1b242c`。地方格兩欄，窄過 720px 變一欄。地圖高 `calc(100vh - 48px)`。底部卡片貼住地圖下緣，官方連結卡片唔顯示空白大圖。頁尾 12px。

- [ ] **Step 4: Run tests and the dev server**

Run: `npm test`
Expected: PASS

Run: `npm run dev`
Expected: 首頁見到八個地方。撳東北見到地圖、浪岡IC 嘅官方連結卡片，同埋「前往官方頁面」。撳「只看有畫面」之後，呢個連結點消失。

- [ ] **Step 5: Commit**

```bash
git add src/view.ts src/main.ts src/style.css public/catalog.json index.html tests/view.test.ts
git commit -m "feat: show regions first and a full-screen map inside a region"
```

---

### Task 8: 每星期更新

**Files:**
- Create: `.github/workflows/refresh-live-cameras.yml`
- Modify: `scripts/build-catalog.ts`

**Interfaces:**
- Consumes: `buildCatalog`、`applyLinkChecks`、`shouldHide`
- Produces: 每星期一 00:00 UTC 重建 `public/catalog.json`。檢查 `pageUrl` 嘅 HTTP 狀態，套用 `applyLinkChecks`，然後只喺檔案有變時提交。

- [ ] **Step 1: Write the failing test**

`tests/catalog.test.ts` 加：

```ts
it("shows a previously hidden record again when the page opens", () => {
  const hiddenDoor = { ...doors[0], hidden: true };
  const catalog = buildCatalog(csv, [hiddenDoor]);
  const next = applyLinkChecks(catalog, [{ url: hiddenDoor.pageUrl, status: 200 }]);
  expect(next.doors[0].hidden).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/catalog.test.ts`
Expected: PASS。`applyLinkChecks` 見到 `shouldHide(200)` 係 false，就要把 `hidden` 設回 `false`。

- [ ] **Step 3: Check links before writing the catalog**

`scripts/build-catalog.ts` 喺寫檔前，對每個 `pageUrl` 做 `fetch(url, { method: "GET", redirect: "follow" })`。網絡錯誤當 `status: 0`。同一網址只查一次。然後 `applyLinkChecks`。

`.github/workflows/refresh-live-cameras.yml`

```yaml
name: Refresh live cameras
on:
  schedule:
    - cron: "0 0 * * 1"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run catalog
      - run: npm test
      - name: Commit catalog when it changes
        run: |
          git add public/catalog.json
          git diff --cached --quiet && exit 0
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -m "chore: refresh the Japan live camera catalog"
          git push
```

- [ ] **Step 4: Run the local checks**

Run: `npm test`
Expected: PASS

用一份細 CSV 跑一次：

```bash
$env:LIVE_CAMERA_CSV = "tests/fixtures/sample.csv"
npm run catalog
```

`tests/fixtures/sample.csv` 用 Task 6 測試入面嗰兩行。預期 `public/catalog.json` 只有浪岡IC，壞鏡頭唔喺入面。官方入口仍然在。

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/refresh-live-cameras.yml scripts/build-catalog.ts tests
git commit -m "feat: refresh public camera links every week"
```
