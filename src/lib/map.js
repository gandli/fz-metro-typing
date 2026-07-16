import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

// 视口: 采竖长比例, 迁就手机端展示 (fz 数据横向经度跨度比纵向大, 但 metro map 图上倾向竖排)
export const MAP_VIEWBOX = [200, 24, 640, 712];
export const ROUTE_DIRECTIONS = {
  FORWARD: "forward",
  REVERSE: "reverse",
};

// 岛外/远郊县 (福清市 350181、平潭县 350128、永泰县 350125), 无地铁站, 排除让主区不被压小
const REMOTE_DISTRICTS = new Set(["350181", "350128", "350125"]);

// 主视区: 包住实际有地铁的经纬度 + 少量 padding (长乐机场东至 119.69, 荆溪厚屿北至 26.15)
const FUZHOU_MAIN_BOUNDS = {
  type: "Polygon",
  coordinates: [
    [
      [119.0, 25.8],
      [119.0, 26.25],
      [119.85, 26.25],
      [119.85, 25.8],
      [119.0, 25.8],
    ],
  ],
};

export function buildMapModel(topology, lines) {
  const objectKey = Object.keys(topology.objects)[0]; // "map" or first available
  const collection = feature(topology, topology.objects[objectKey]);
  const mainland = {
    type: "FeatureCollection",
    features: collection.features.filter(
      (district) => !REMOTE_DISTRICTS.has(district.properties.id),
    ),
  };
  const projection = geoMercator().fitExtent(
    [
      [470, 44],
      [790, 716],
    ],
    FUZHOU_MAIN_BOUNDS,
  );
  const path = geoPath(projection);
  const counties = mainland.features.map((district) => ({
    id: district.properties.id,
    name: district.properties.name,
    path: path(district),
  }));

  const routes = lines.map((line) => {
    const pointsById = new Map(
      line.stations.map((station) => [
        station.stationId,
        projection([station.lon, station.lat]),
      ]),
    );
    const segments = (
      line.mapSegments ??
      line.segments ?? [line.stations.map((station) => station.stationId)]
    )
      .map((stationIds) =>
        stationIds.map((id) => pointsById.get(id)).filter(Boolean),
      )
      .filter((points) => points.length > 1);
    const stations = line.stations.map((station) => ({
      ...station,
      point: pointsById.get(station.stationId),
    }));
    return { ...line, pointsById, segments, stations };
  });

  return { counties, routes };
}

export function getRouteViewBox(route, minimumWidth = 270, padding = 42, aspectRatio = 0.72) {
  if (!route) return MAP_VIEWBOX;
  const points = route.segments.flat();
  if (!points.length) return MAP_VIEWBOX;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rawW = maxX - minX + padding * 2;
  const rawH = maxY - minY + padding * 2;
  // 让 viewBox aspect (height/width) 匹配容器, 避免 preserveAspectRatio=meet 缩小路线
  // aspectRatio = 容器 height/width; 若 rawH/rawW < aspectRatio, 拉高 viewBox; 反之拉宽
  let width, height;
  if (rawH / rawW < aspectRatio) {
    width = Math.max(rawW, minimumWidth);
    height = width * aspectRatio;
  } else {
    height = rawH;
    width = Math.max(height / aspectRatio, minimumWidth);
  }
  return [(minX + maxX - width) / 2, (minY + maxY - height) / 2, width, height];
}

export function pointsToString(points) {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

// Each entry in line.segments is a real service pattern (trunk or branch).
// 福州地铁目前无分支线, 每条 line 只有一个 segment; 保留 tw 版兼容多 segment 的结构.
export function getLineRuns(line) {
  if (!line) return [];
  const stationById = new Map(
    line.stations.map((station) => [station.stationId, station]),
  );
  const segments = line.segments ?? [
    line.gameStationIds ?? line.stations.map((station) => station.stationId),
  ];
  return segments
    .map((stationIds, index) => {
      const stations = stationIds
        .map((id) => stationById.get(id))
        .filter(Boolean);
      return {
        index,
        stations,
        label: stations.length
          ? `${stations[0].nameZh} → ${stations[stations.length - 1].nameZh}`
          : "",
      };
    })
    .filter((run) => run.stations.length > 1);
}

export function getPlayableStations(
  line,
  runIndex = 0,
  direction = ROUTE_DIRECTIONS.FORWARD,
) {
  const runs = getLineRuns(line);
  const stations = (runs[runIndex] ?? runs[0])?.stations ?? [];
  return direction === ROUTE_DIRECTIONS.REVERSE
    ? [...stations].reverse()
    : stations;
}
