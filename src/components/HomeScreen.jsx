import { ArrowLeft, ArrowRight } from "lucide-react";
import { FuzhouMap } from "./FuzhouMap";
import { getLineRuns, getPlayableStations, ROUTE_DIRECTIONS } from "../lib/map";
import {
  localizeStationName,
  localizeText,
  TYPING_LANGUAGES,
  t,
} from "../lib/i18n";

export function HomeScreen({
  data,
  mapModel,
  selectedLine,
  runIndex,
  onRunChange,
  direction,
  onDirectionChange,
  mode,
  onModeChange,
  typingLanguage,
  onTypingLanguageChange,
  onSelect,
  onReset,
  onStart,
}) {
  const runs = getLineRuns(selectedLine);
  const selectedRun = runs[runIndex] ?? runs[0] ?? null;
  const playableStations = getPlayableStations(
    selectedLine,
    runIndex,
    direction,
  );
  return (
    <section className={`home-map-screen${selectedLine ? " focused" : ""}`}>
      <FuzhouMap
        mapModel={mapModel}
        selectedLineId={selectedLine?.id ?? null}
        onSelect={onSelect}
      />

      <div
        className="home-copy"
        aria-hidden={selectedLine ? "true" : undefined}
      >
        <div className="eyebrow">
          <span /> {t("homeEyebrow", typingLanguage)}
        </div>
        <h1>
          {t("heroLine1", typingLanguage)}<em>{t("heroLine2", typingLanguage)}</em>
        </h1>
        <p className="lede">
          {t("heroDesc", typingLanguage)}
        </p>
        <div className="home-instruction">
          <b>01</b>
          <span>{t("heroCallout", typingLanguage)}</span>
        </div>
        <span className="data-status">
          {data.lines.length} {t("routesCount", typingLanguage)} ·{" "}
          {data.lines.reduce((sum, line) => sum + line.stations.length, 0)}{" "}
          {t("stationsSuffix", typingLanguage)}
        </span>
      </div>

      {selectedLine ? (
        <>
          <button className="map-reset" type="button" onClick={onReset}>
            <ArrowLeft size={15} /> {t("backToTaiwan", typingLanguage)} <kbd>ESC</kbd>
          </button>
          <div className="route-focus-card" aria-live="polite">
            <span className="focus-kicker">{t("selectedRouteLabel", typingLanguage)}</span>
            <div className="focus-route-title">
              <span
                className="focus-line-code"
                style={{ "--focus-color": selectedLine.color }}
              >
                {selectedLine.lineId}
              </span>
              <div>
                <h2>{localizeText(selectedLine.lineName, typingLanguage)}</h2>
                <p>
                  {localizeText(selectedLine.operatorName, typingLanguage)} · {playableStations.length} {t("station", typingLanguage)}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="home-control-deck">
        <div className="route-carousel" aria-label={t("routeListLabel", typingLanguage)}>
          {data.lines.map((line) => (
            <button
              key={line.id}
              className={`route-button${selectedLine?.id === line.id ? " selected" : ""}`}
              type="button"
              style={{ "--route": line.color }}
              onClick={() => onSelect(line.id)}
            >
              <span className="route-symbol">{line.lineId}</span>
              <span>
                <strong>{localizeText(line.lineName, typingLanguage)}</strong>
                <small>
                  {localizeText(line.operatorName, typingLanguage)} · {getPlayableStations(line).length} {t("station", typingLanguage)}
                </small>
              </span>
            </button>
          ))}
        </div>

        {selectedLine ? (
          <div
            className="focus-actions"
            style={{ "--focus-color": selectedLine.color }}
          >
            {runs.length > 1 ? (
              <div className="run-picker" aria-label={t("runPickerAria", typingLanguage)}>
                <span className="control-label">{t("runPickerLabel", typingLanguage)}</span>
                <div className="run-options">
                  {runs.map((run, index) => (
                    <label
                      key={run.label}
                      className={`run-option${runIndex === index ? " selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="run"
                        value={index}
                        checked={runIndex === index}
                        onChange={() => onRunChange(index)}
                      />
                      <span>
                        <b>{run.label}</b>
                        <small>{run.stations.length} {t("station", typingLanguage)}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedRun ? (
              <DirectionPicker
                stations={selectedRun.stations}
                value={direction}
                onChange={onDirectionChange}
                language={typingLanguage}
              />
            ) : null}
            <div className="option-toolbar">
              <SegmentedControl
                label={t("modeLabel", typingLanguage)}
                name="mode"
                value={mode}
                onChange={onModeChange}
                options={getModeOptions(typingLanguage)}
              />
              <button className="start-button" type="button" onClick={onStart}>
                <span>{t("startRoute", typingLanguage)}</span>
                <b>
                  <ArrowRight size={20} />
                </b>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DirectionPicker({ stations, value, onChange, language }) {
  const firstStation = stations[0];
  const lastStation = stations[stations.length - 1];
  // 按语言本地化站名: 英文档取 nameEn, 简/繁档取相应汉字形
  const localize = (station) =>
    language === TYPING_LANGUAGES.ENGLISH
      ? station.nameEn
      : localizeStationName(station, language);
  const options = [
    {
      value: ROUTE_DIRECTIONS.FORWARD,
      origin: firstStation,
      destination: lastStation,
    },
    {
      value: ROUTE_DIRECTIONS.REVERSE,
      origin: lastStation,
      destination: firstStation,
    },
  ];

  return (
    <div className="direction-picker" role="radiogroup" aria-label={t("directionAria", language)}>
      <span className="control-label">{t("directionLabel", language)}</span>
      <div className="direction-options">
        {options.map((option) => (
          <label
            key={option.value}
            className={`direction-option${value === option.value ? " selected" : ""}`}
          >
            <input
              type="radio"
              name="direction"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              <small>{t("from", language)} {localize(option.origin)}</small>
              <b>
                {t("to", language)} {localize(option.destination)}
                <ArrowRight size={14} aria-hidden="true" />
              </b>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "zh-Hans", label: "简体" },
  { value: "pinyin", label: "拼音" },
];

const GAME_MODE_OPTIONS = [
  { value: "timed", label: "30 秒" },
  { value: "line", label: "全线" },
];

// 依语言返回模式选项 (与 GAME_MODE_OPTIONS 保持 value 一致, 仅 label 本地化)
function getModeOptions(language) {
  return [
    { value: "timed", label: t("modeTimed", language) },
    { value: "line", label: t("modeLine", language) },
  ];
}

function SegmentedControl({ label, name, value, onChange, options }) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      <span className="control-label">{label}</span>
      <div className="segmented-options">
        {options.map((option) => (
          <label
            key={option.value}
            className={`segment-option${value === option.value ? " selected" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
