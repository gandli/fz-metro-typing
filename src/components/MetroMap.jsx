import { useRef, useCallback, useEffect } from "react";
import { useGesture } from "@use-gesture/react";
import { getRouteViewBox, pointsToString } from "../lib/map";
import { localizeText, t as tr } from "../lib/i18n";

// 手势变换限制
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const MAX_PAN = 480; // px 允许平移边界 (稍大以给缩放态更多余地)

/**
 * 手势叠加层: 地图 SVG 上方的透明 div 承担 pointer events
 * - 单指拖 → pan
 * - 双指捏合 → pinch zoom (缩放中心=双指中点)
 * - 双指旋转 → 视角旋转
 * - 桌面: 滚轮缩放 / drag 拖动 / 双击重置
 *
 * 性能: transform 用 imperative DOM 更新 (ref.current.style), 不走 React 重渲染
 * SVG stroke 用 CSS var --map-scale counter-scale, 缩放时线不加粗
 */
export function MetroMap({
  mapModel,
  selectedLine,
  stations,
  stationIndex,
  trainProgress,
  language,
}) {
  const route = mapModel.routes.find((item) => item.id === selectedLine.id);
  // 视口自适应 viewBox aspect: 手机竖屏容器高比宽 ~1.5, 桌面横屏 ~0.72
  // 让 viewBox 主动匹配容器 aspect, 路线渲染时不再被 preserveAspectRatio=meet 压缩
  const isPortrait =
    typeof window !== "undefined" && window.innerHeight > window.innerWidth;
  const containerAspect = isPortrait ? 1.5 : 0.72;
  const routeViewBox = getRouteViewBox(route, 6, 3, containerAspect);
  routeViewBox[1] += routeViewBox[3] * 0.16;
  const viewBox = routeViewBox.join(" ");
  const nextIndex =
    stationIndex + 1 < stations.length ? stationIndex + 1 : null;
  const currentPoint = route.pointsById.get(stations[stationIndex].stationId);
  const nextPoint =
    nextIndex === null
      ? currentPoint
      : route.pointsById.get(stations[nextIndex].stationId);
  const journeyProgress =
    nextIndex === null ? 0 : Math.min(Math.max(trainProgress, 0), 1);
  const train = [
    currentPoint[0] + (nextPoint[0] - currentPoint[0]) * journeyProgress,
    currentPoint[1] + (nextPoint[1] - currentPoint[1]) * journeyProgress,
  ];
  const progressPoints = stations
    .slice(0, stationIndex + 1)
    .map((station) => route.pointsById.get(station.stationId))
    .filter(Boolean);
  if (journeyProgress > 0) progressPoints.push(train);

  const containerRef = useRef(null);
  const resetBtnRef = useRef(null);
  // 变换状态以 ref 存 (imperative 更新, 避免每帧 React re-render)
  const state = useRef({ x: 0, y: 0, scale: 1, rotation: 0 });
  const isTransformed = useRef(false);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const applyTransform = useCallback((animated = false) => {
    const el = containerRef.current;
    if (!el) return;
    const { x, y, scale, rotation } = state.current;
    el.style.transition = animated
      ? "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)"
      : "none";
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotation}deg)`;
    // 缩放时给 SVG 传递 counter-scale 变量, CSS 里用于抵消 stroke 加粗
    el.style.setProperty("--map-scale", scale);
    // 变换态标记 → 决定归位按钮显隐
    const transformed =
      x !== 0 || y !== 0 || scale !== 1 || rotation !== 0;
    if (transformed !== isTransformed.current) {
      isTransformed.current = transformed;
      if (resetBtnRef.current) {
        resetBtnRef.current.dataset.visible = transformed ? "1" : "0";
      }
    }
  }, []);

  const resetTransform = useCallback(() => {
    state.current = { x: 0, y: 0, scale: 1, rotation: 0 };
    applyTransform(true);
  }, [applyTransform]);

  // 换路线时自动归位 (视角跟着新路线)
  useEffect(() => {
    resetTransform();
  }, [selectedLine.id, resetTransform]);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, cancel, first }) => {
        if (pinching) return cancel();
        if (first) applyTransform(false); // 首帧关闭过渡
        state.current.x = clamp(state.current.x + dx, -MAX_PAN, MAX_PAN);
        state.current.y = clamp(state.current.y + dy, -MAX_PAN, MAX_PAN);
        applyTransform(false);
      },
      onPinch: ({ offset: [s, r], first }) => {
        if (first) applyTransform(false);
        state.current.scale = clamp(s, MIN_SCALE, MAX_SCALE);
        state.current.rotation = r;
        applyTransform(false);
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        state.current.scale = clamp(
          state.current.scale * (1 - dy * 0.0015),
          MIN_SCALE,
          MAX_SCALE,
        );
        applyTransform(false);
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        rubberband: 0.1,
        // 旋转允许但阈值高一点 (5°) 减少误触
        threshold: [0.1, 5],
      },
      drag: {
        filterTaps: true,
        // 同时接受触摸和鼠标 (pointer 事件默认涵盖两者)
        preventScroll: true,
      },
    },
  );

  return (
    <>
      <div
        ref={containerRef}
        className="metro-map-container"
        role="img"
        aria-label={`${localizeText(selectedLine.lineName ?? "", language)} — ${tr("mapA11y", language)}`}
        onDoubleClick={resetTransform}
        style={{ touchAction: "none" }}
      >
        <svg className="metro-map" viewBox={viewBox} aria-hidden="true">
          <g className="game-counties">
            {mapModel.counties.map((county) => (
              <path key={county.id} d={county.path} />
            ))}
          </g>
          {mapModel.routes.map((item) =>
            item.segments.map((points, index) => (
              <polyline
                key={`${item.id}-${index}`}
                className={`map-line ${item.id === route.id ? "selected" : "network"}`}
                points={pointsToString(points)}
                stroke={item.color}
              />
            )),
          )}
          {route.segments.map((points, index) => (
            <polyline
              key={index}
              className="map-casing"
              points={pointsToString(points)}
            />
          ))}
          {route.segments.map((points, index) => (
            <polyline
              key={index}
              className="map-line selected"
              points={pointsToString(points)}
              stroke={route.color}
            />
          ))}
          <polyline
            className="map-progress"
            points={pointsToString(progressPoints)}
            stroke={route.color}
          />
          {route.stations.map((station) => {
            const index = stations.findIndex(
              (item) => item.stationId === station.stationId,
            );
            const [x, y] = station.point;
            const state =
              index < stationIndex && index >= 0
                ? " is-passed"
                : index === stationIndex
                  ? " is-current"
                  : index === nextIndex
                    ? " is-next"
                    : "";
            return (
              <circle
                key={station.stationId}
                className={`map-node on-route${state}`}
                cx={x}
                cy={y}
                r=".24"
              />
            );
          })}
          <g
            className="map-train"
            style={{ transform: `translate(${train[0]}px, ${train[1]}px)` }}
          >
            <g className="map-train-icon" transform="scale(.03)">
              <circle className="train-halo" r="22" />
              <rect className="train-body" x="-18" y="-12" width="36" height="24" rx="7" />
              <rect className="train-window" x="-11" y="-6" width="8" height="7" rx="2" />
              <rect className="train-window" x="3" y="-6" width="8" height="7" rx="2" />
              <circle className="train-light" cx="-9" cy="7" r="2" />
              <circle className="train-light" cx="9" cy="7" r="2" />
            </g>
          </g>
        </svg>
      </div>
      <button
        ref={resetBtnRef}
        type="button"
        className="map-reset-btn"
        data-visible="0"
        onClick={resetTransform}
        aria-label={tr("recenter", language)}
      >
        <span aria-hidden="true">⊙</span> {tr("recenter", language)}
      </button>
    </>
  );
}
