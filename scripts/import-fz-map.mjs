// 从 Atlas GIS MCP 官方几何重建 fuzhou-districts.topo.json (准确底图)。
//
// 数据来源: Atlas GIS MCP 工具 `AdcodeToGeojson(adcodes:"350100_full")`,
// 返回 DataV.GeoAtlas 官方 13 区县几何 (fileUrl: https://g.datav.run/share/... 或
// 原生 https://geo.datav.aliyun.com/areas_v3/bound/350100_full.json)。
// 该 MCP 工具等价于直接拉取下方 DATAV_URL —— 二者同源, 几何一致。
//
// 修复 (相对 fork 自带旧 topojson):
//  1. FZ_MAIN_BOUNDS 过窄导致闽清(西)/罗源·连江(北)/长乐(东南)被 fitExtent 裁掉/压扁。
//     真实范围见 src/lib/map.js 的 FUZHOU_MAIN_BOUNDS (已放宽)。
//  2. 连江县几何内嵌马祖飞地 (lon 120.4~120.5, 距主城 130km, 不相连) —— 非福州主城,
//     且超出主视区, 渲染时被 fitExtent 裁出画布 (无需在数据中删点, 避免破坏环环绕方向
//     触发 d3 反子午线切割的幽灵矩形)。
//  3. 排除远郊 3 县 (福清 350181 / 平潭 350128 / 永泰 350125, 无地铁站)。
//
// 注意: 不在数据层删马祖顶点 —— 删点会破坏环的环绕方向, 导致 d3 geoMercator 球面投影
// 把该多边形切出 ~77000 单位的幽灵矩形 (rsvg 等不裁剪 viewBox 的工具会显示成灰块,
// 浏览器 SVG 靠 viewBox 自动裁剪掉, 故 app 内正常)。保持完整几何 + 靠 bounds 隐藏最稳。

import { writeFile, mkdir } from "node:fs/promises";
import topojson from "topojson";

const DATAV_URL = "https://geo.datav.aliyun.com/areas_v3/bound/350100_full.json";
const REMOTE = new Set(["350181", "350128", "350125"]); // 福清, 平潭, 永泰

async function main() {
  const res = await fetch(DATAV_URL);
  if (!res.ok) throw new Error(`DataV ${res.status} (Atlas MCP AdcodeToGeojson 同源)`);
  const official = await res.json();

  const features = official.features
    .filter((f) => !REMOTE.has(String(f.properties.adcode)))
    .map((f) => ({
      type: "Feature",
      properties: { id: String(f.properties.adcode), name: f.properties.name },
      geometry: f.geometry,
    }));

  // 经 topojson 归一化 (环绕方向/量化), 与 app 解码管线一致
  const topo = topojson.topology({ map: { type: "FeatureCollection", features } }, 1e4);

  await mkdir("public/data", { recursive: true });
  await writeFile(
    "public/data/fuzhou-districts.topo.json",
    JSON.stringify(topo),
  );
  console.log(
    `✔ wrote public/data/fuzhou-districts.topo.json — ${topo.objects.map.geometries.length} districts (Atlas MCP / DataV 官方几何, 马祖由 bounds 隐藏)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
