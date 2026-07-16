// Build福州地铁 metro.json from Wikidata (coords) + Wikipedia (station order).
// Output: public/data/metro.json  in the same shape as tw-metro-typing:
//   { lines: [{ id, lineName, color, stations:[{ stationId, sequence, nameZh, nameEn, target(pinyin), lat, lon }], segments, gameStationIds }] }
//
// nameZh 已是简体（Wikidata zh-hans + Wikipedia 简体版）。
// target = pinyin (拼音, 无声调, 空格连接), 用作打字模式 3 的目标.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { pinyin } from "pinyin-pro";

const USER_AGENT = "FuzhouMetroTyping/1.0 (https://github.com/gandli/fz-metro-typing; build script)";

// Wikidata QID for each Fuzhou Metro line
const LINES = [
  { id: "L1",  qid: "Q15941872", nameZh: "1 号线",    color: "#e60039", wpTable: 0 },
  { id: "L2",  qid: "Q20063925", nameZh: "2 号线",    color: "#00a651", wpTable: 1 },
  { id: "L4",  qid: "Q25346431", nameZh: "4 号线",    color: "#f39800", wpTable: 2 },
  { id: "L5",  qid: "Q25305553", nameZh: "5 号线",    color: "#8e4c9e", wpTable: 3 },
  { id: "L6",  qid: "Q24886992", nameZh: "6 号线",    color: "#00b1cc", wpTable: 4 },
  { id: "BHE", qid: "Q59135401", nameZh: "滨海快线",  color: "#005baa", wpTable: 5 },
];

// ------------------------------------------------------------------
// 1) Wikidata: station coords + labels
// ------------------------------------------------------------------
async function fetchCoords() {
  const values = LINES.map((l) => `wd:${l.qid}`).join(" ");
  const query = `SELECT ?line ?s ?sZh ?sEn ?coord WHERE {
  VALUES ?line { ${values} }
  ?s wdt:P81 ?line ; wdt:P625 ?coord .
  OPTIONAL { ?s rdfs:label ?sZh FILTER(LANG(?sZh) IN ("zh","zh-cn","zh-hans")) }
  OPTIONAL { ?s rdfs:label ?sEn FILTER(LANG(?sEn)="en") }
}`;
  const url = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const data = await res.json();
  // Deduplicate by (line, sQid); pick the row with the cleanest labels.
  const byKey = new Map();
  for (const r of data.results.bindings) {
    const lineQid = r.line.value.split("/").pop();
    const sQid = r.s.value.split("/").pop();
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(r.coord.value);
    if (!m) continue;
    const lon = Number(m[1]);
    const lat = Number(m[2]);
    let zh = r.sZh?.value ?? "";
    let en = r.sEn?.value ?? "";
    zh = zh.replace(/站( \(.*\))?$/u, "").replace(/·/g, "·").trim();
    en = en.replace(/\s*(Station|station)$/u, "").trim();
    const key = `${lineQid}|${sQid}`;
    const existing = byKey.get(key);
    // Prefer entries with both zh and en, longer zh, or English capitalization
    const score = (zh ? 2 : 0) + (en ? 1 : 0) + zh.length * 0.01;
    if (!existing || score > existing.score) {
      byKey.set(key, { lineQid, sQid, zh, en, lon, lat, score });
    }
  }
  return [...byKey.values()];
}

// ------------------------------------------------------------------
// 2) Wikipedia zh 车站列表: 站序 (每张 wikitable 一条线)
//    HTML pattern:
//    tr rows starting from row 2 (skip header + subheader)
//    First data cell = station name (in a link title="车站名")
// ------------------------------------------------------------------
async function fetchWikipediaOrder() {
  const url =
    "https://zh.wikipedia.org/wiki/%E7%A6%8F%E5%B7%9E%E5%9C%B0%E9%93%81%E8%BD%A6%E7%AB%99%E5%88%97%E8%A1%A8";
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "zh-CN" },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const html = await res.text();

  const tables = [...html.matchAll(/<table[^>]*class="wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/g)].map(
    (m) => m[1],
  );
  const perLine = [];
  for (let i = 0; i < LINES.length; i++) {
    const tbl = tables[LINES[i].wpTable];
    if (!tbl) {
      perLine.push([]);
      continue;
    }
    const rows = [...tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
    // Skip caption + header (usually 2 rows). Only take the FIRST <td> of each data row.
    const stations = [];
    const seen = new Set();
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r];
      // First <td> only (skip <th> = still header)
      const firstTd = row.match(/<td[^>]*>([\s\S]*?)<\/td>/);
      if (!firstTd) continue;
      let cell = firstTd[1];
      // Extract text: prefer link title, else strip tags
      let nameZh = "";
      const linkMatch = cell.match(/<a[^>]*title="([^"<>]{1,40}?)"[^>]*>/);
      if (linkMatch && /站/.test(linkMatch[1])) {
        nameZh = linkMatch[1]
          .replace(/站(\s*\(.*\))?$/u, "")
          .replace(/\s*\(.*?\)\s*$/u, "")
          .trim();
      }
      if (!nameZh) {
        // fallback: strip HTML tags and take text
        nameZh = cell
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, "")
          .trim();
        // remove trailing 站/括注
        nameZh = nameZh.replace(/站$/u, "").replace(/\(.*?\)$/u, "").trim();
      }
      // Filter out non-station rows (some tables have caption/subtotal rows)
      if (!nameZh || nameZh.length > 12 || /^\d+$/.test(nameZh)) continue;
      if (seen.has(nameZh)) continue;
      seen.add(nameZh);
      stations.push({ sequence: stations.length + 1, nameZh });
    }
    perLine.push(stations);
  }
  return perLine;
}

// ------------------------------------------------------------------
// 3) Wire it together
// ------------------------------------------------------------------
function toPinyin(zh) {
  // No tones, lowercase, space-separated per Chinese char
  return pinyin(zh, { toneType: "none", type: "array" })
    .join(" ")
    .toLowerCase()
    .replace(/·/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("→ Wikidata coords");
  const coords = await fetchCoords();
  console.log(`  ${coords.length} unique station×line entries`);

  console.log("→ Wikipedia station order");
  const perLineOrder = await fetchWikipediaOrder();
  perLineOrder.forEach((s, i) => console.log(`  ${LINES[i].nameZh}: ${s.length} stations`));

  // Index coords by (lineQid, cleaned zh name)
  const coordIndex = new Map();
  for (const c of coords) {
    const key = `${c.lineQid}|${normalizeName(c.zh)}`;
    coordIndex.set(key, c);
  }

  const lines = LINES.map((line, li) => {
    const ordered = perLineOrder[li];
    const raw = [];
    const missing = [];
    for (const s of ordered) {
      const lookupKey = `${line.qid}|${normalizeName(s.nameZh)}`;
      let co = coordIndex.get(lookupKey);
      if (!co) {
        // 兜底: 从任意线路取该站坐标 (换乘站)
        co = [...coordIndex.values()].find(
          (c) => normalizeName(c.zh) === normalizeName(s.nameZh),
        );
      }
      if (!co) {
        missing.push(s.nameZh);
        continue;
      }
      raw.push({ nameZh: s.nameZh, co });
    }
    // Re-sequence based on final position (skip未开通站的 gap 后重新 1..N)
    const stations = raw.map((r, idx) =>
      buildStation({ sequence: idx + 1, nameZh: r.nameZh }, r.co, line),
    );
    if (missing.length)
      console.log(`  ⚠ ${line.nameZh} skipped (未开通/无坐标): ${missing.join(", ")}`);
    const stationIds = stations.map((st) => st.stationId);
    return {
      id: line.id,
      lineId: line.id,
      lineName: line.nameZh,
      color: line.color,
      operatorName: "福州地铁",
      stations,
      segments: stationIds.length > 1 ? [stationIds] : [],
      gameStationIds: stationIds,
    };
  });

  const out = { lines, updatedAt: new Date().toISOString() };
  await mkdir("public/data", { recursive: true });
  await writeFile("public/data/metro.json", JSON.stringify(out, null, 2));
  const total = lines.reduce((n, l) => n + l.stations.length, 0);
  console.log(`✔ wrote public/data/metro.json — ${lines.length} lines, ${total} station rows`);
}

function normalizeName(s) {
  return String(s || "")
    .replace(/·/g, "·")
    .replace(/[\s\u3000]+/g, "")
    .replace(/[\u2014\u2013\-–—]/g, "-")
    .trim();
}

function buildStation(orderRow, coord, line) {
  const stationId = `${line.id}-${String(orderRow.sequence).padStart(2, "0")}`;
  const nameZh = orderRow.nameZh;
  const nameEn = coord.en || toPinyin(nameZh).replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id: stationId,
    stationId,
    sequence: orderRow.sequence,
    nameZh,
    nameEn,
    target: toPinyin(nameZh),
    lat: coord.lat,
    lon: coord.lon,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
