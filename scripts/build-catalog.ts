import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { applyLinkChecks, buildCatalog } from "../src/catalog";
import type { OfficialDoor } from "../src/select";

const doors = JSON.parse(readFileSync(new URL("../data/official-doors.json", import.meta.url), "utf8")) as OfficialDoor[];
const source = process.env.LIVE_CAMERA_CSV;
const csv = source
  ? readFileSync(source, "utf8")
  : await fetch("https://raw.githubusercontent.com/w16y/opendata-livecamera-jp/main/livecamera-jp.csv").then((response) => {
      if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);
      return response.text();
    });

async function linkStatus(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000) });
    await response.body?.cancel();
    return response.status;
  } catch {
    return 0;
  }
}

async function checkLinks(urls: string[]): Promise<{ url: string; status: number }[]> {
  const unique = [...new Set(urls)];
  const results: { url: string; status: number }[] = [];
  const queue = [...unique];
  const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) return;
      results.push({ url, status: await linkStatus(url) });
    }
  });
  await Promise.all(workers);
  return results;
}

const catalog = buildCatalog(csv, doors);
const checked = await checkLinks([
  ...catalog.cameras.map((camera) => camera.pageUrl),
  ...catalog.doors.map((door) => door.pageUrl),
]);
mkdirSync(new URL("../public", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../public/catalog.json", import.meta.url),
  JSON.stringify(applyLinkChecks(catalog, checked)),
);
