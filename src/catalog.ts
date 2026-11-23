import { classifyRow, type Camera, type CatalogRow } from "./classify";
import { shouldHide, type OfficialDoor } from "./select";

export type Catalog = { cameras: Camera[]; doors: OfficialDoor[] };

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") pushRow();
    else if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });
    return record;
  });
}

export function buildCatalog(csvText: string, doors: OfficialDoor[]): Catalog {
  const cameras = parseCsv(csvText)
    .map((row) => classifyRow(row as CatalogRow))
    .filter((camera): camera is Camera => camera !== null);
  return { cameras, doors };
}

export function applyLinkChecks(catalog: Catalog, results: { url: string; status: number }[]): Catalog {
  const status = new Map(results.map((result) => [result.url, result.status]));
  const hiddenFor = (url: string, hidden: boolean) => {
    const code = status.get(url);
    if (code === undefined) return hidden;
    return shouldHide(code);
  };
  return {
    cameras: catalog.cameras.map((camera) => ({ ...camera, hidden: hiddenFor(camera.pageUrl, camera.hidden) })),
    doors: catalog.doors.map((door) => ({ ...door, hidden: hiddenFor(door.pageUrl, door.hidden) })),
  };
}
