import { memo, useEffect, useMemo, useRef, useState } from "react";
import { getRouteViewBox, MAP_VIEWBOX, pointsToString } from "../lib/map";

export const FuzhouMap = memo(function FuzhouMap({
  mapModel,
  selectedLineId,
  onSelect,
}) {
  const svgRef = useRef(null);
  const [intro, setIntro] = useState(true);
  const selectedRoute =
    mapModel.routes.find((route) => route.id === selectedLineId) ?? null;
  // 视口自适应 viewBox aspect: 手机竖屏容器高比宽 ~1.5, 桌面横屏 ~0.72
  // 修 focused 状态下路线被压成中央小坨的问题 (对齐 MetroMap.jsx 的处理)
  const isPortrait =
    typeof window !== "undefined" && window.innerHeight > window.innerWidth;
  const targetAspect = isPortrait ? 1.5 : 0.72;
  const targetViewBox = useMemo(
    () => getRouteViewBox(selectedRoute, 8, 4, targetAspect),
    [selectedRoute, targetAspect],
  );

  useEffect(() => {
    const maxSegments = Math.max(
      ...mapModel.routes.map((route) => route.segments.length),
    );
    const introDuration =
      (0.25 + mapModel.routes.length * 0.14 + maxSegments * 0.45 + 1.9) * 1000;
    const timer = setTimeout(() => setIntro(false), introDuration);
    return () => clearTimeout(timer);
  }, [mapModel.routes]);

  // The intro draw animation disables non-scaling-stroke, so zooming into a
  // route while it runs would blow the stroke widths up with the viewBox.
  useEffect(() => {
    if (selectedLineId) setIntro(false);
  }, [selectedLineId]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const from = (svg.getAttribute("viewBox") ?? MAP_VIEWBOX.join(" "))
      .split(/\s+/)
      .map(Number);
    const startedAt = performance.now();
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 680;
    let frameId;
    const frame = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      svg.setAttribute(
        "viewBox",
        from
          .map((value, index) => value + (targetViewBox[index] - value) * eased)
          .join(" "),
      );
      if (progress < 1) frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [targetViewBox]);

  return (
    <svg
      ref={svgRef}
      className={`fuzhou-map${intro ? " intro" : ""}`}
      viewBox={MAP_VIEWBOX.join(" ")}
      role="img"
      aria-label="依真实经纬度绘制的福州地铁路线地图"
    >
      <defs>
        <filter id="island-shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="16"
            stdDeviation="18"
            floodColor="#39352c"
            floodOpacity=".12"
          />
        </filter>
        <pattern
          id="map-grid"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0H0V24"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".055"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect
        className="home-map-grid"
        x="-800"
        y="-400"
        width="2600"
        height="1600"
        fill="url(#map-grid)"
      />
      <g className="fuzhou-districts" filter="url(#island-shadow)">
        {mapModel.counties.map((county) => (
          <path key={county.id} d={county.path} aria-label={county.name} />
        ))}
      </g>
      <g className="home-routes">
        {mapModel.routes.map((route, routeIndex) => {
          const selected = route.id === selectedLineId;
          const routeDelay = 0.25 + routeIndex * 0.14;
          const nodes = [
            ...new Map(
              route.stations.map((station) => [
                station.stationId,
                station.point,
              ]),
            ).values(),
          ].filter(Boolean);
          return (
            <g
              key={route.id}
              className={`home-route${selected ? " selected" : ""}${selectedLineId && !selected ? " muted" : ""}`}
              style={{ "--draw-delay": `${routeDelay.toFixed(2)}s` }}
              role="button"
              tabIndex={0}
              aria-label={`选择${route.lineName}`}
              onClick={() => onSelect(route.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(route.id);
                }
              }}
            >
              {route.segments.map((points, index) => (
                <g
                  key={index}
                  style={{
                    "--seg-delay": `${(routeDelay + index * 0.45).toFixed(2)}s`,
                  }}
                >
                  <polyline
                    className="home-route-hit"
                    points={pointsToString(points)}
                  />
                  <polyline
                    className="home-route-casing"
                    pathLength="1"
                    points={pointsToString(points)}
                  />
                  <polyline
                    className="home-route-line"
                    pathLength="1"
                    points={pointsToString(points)}
                    stroke={route.color}
                  />
                </g>
              ))}
              {selected
                ? nodes.map(([x, y], index) => (
                    <circle
                      key={index}
                      className="home-route-node"
                      cx={x}
                      cy={y}
                      r=".29"
                    />
                  ))
                : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
});
