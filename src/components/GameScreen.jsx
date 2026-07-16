import { ArrowLeft, ArrowRight } from "lucide-react";
import { MetroMap } from "./MetroMap";
import {
  TYPING_LANGUAGES,
  isChineseLanguage,
  localizeStationName,
  localizeText,
  t,
} from "../lib/i18n";

export function GameScreen({
  mapModel,
  line,
  stations,
  mode,
  stationIndex,
  typedIndex,
  target,
  typingLanguage,
  compositionText,
  completed,
  remaining,
  elapsed,
  metrics,
  shake,
  onBack,
  onFocusTyping,
}) {
  const lang = typingLanguage;
  const station = stations[stationIndex];
  const next = stations[stationIndex + 1] ?? null;
  const targetCharacters = [...target];
  const trainProgress = targetCharacters.length
    ? typedIndex / targetCharacters.length
    : 0;
  const isChinese = isChineseLanguage(lang);
  const isPinyin = lang === TYPING_LANGUAGES.PINYIN;
  // 主显示: 中文档→简体 / 拼音档→带空格美观串 (station.target) / 英文档→英文
  const targetName = isChinese
    ? localizeStationName(station, lang)
    : isPinyin
      ? station.target
      : station.nameEn;
  // 对照语言 (与 target 互补, 帮助记忆): 中文档→英文, 英文/拼音档→简体汉字
  const oppositeName = isChinese
    ? station.nameEn
    : localizeStationName(station, TYPING_LANGUAGES.SIMPLIFIED);
  const oppositeNext = next
    ? isChinese
      ? next.nameEn
      : localizeStationName(next, TYPING_LANGUAGES.SIMPLIFIED)
    : null;
  const oppositeLabel = isChinese ? t("labelEn", lang) : t("labelZh", lang);
  const terminalName = isChinese
    ? localizeStationName(stations[stations.length - 1], lang)
    : isPinyin
      ? stations[stations.length - 1]?.target
      : stations[stations.length - 1]?.nameEn;
  return (
    <section className="game" style={{ "--active-route": line.color }}>
      <p className="screen-reader-status" aria-live="polite" aria-atomic="true">
        {t("nowArriving", lang)} {localizeStationName(station, lang)}, {t("pleaseType", lang)} {targetName}
      </p>
      <MetroMap
        mapModel={mapModel}
        selectedLine={line}
        stations={stations}
        stationIndex={stationIndex}
        trainProgress={trainProgress}
        language={lang}
      />
      <div className="game-chrome">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={15} /> {t("back", lang)} <kbd>ESC</kbd>
        </button>
        <div className="route-pill" style={{ background: line.color }}>
          <span className="route-pill-name">
            {localizeText(line.lineName, lang)}
          </span>
          <span className="route-pill-sep">·</span>
          <span className="route-pill-dir">
            {t("to", lang)} {terminalName}
          </span>
        </div>
      </div>
      <div className="scorebar">
        <Metric
          label={mode === "timed" ? t("remaining", lang) : t("elapsed", lang)}
          value={mode === "timed" ? remaining : elapsed}
          unit={t("seconds", lang)}
        />
        <Metric label={t("arrived", lang)} value={completed} unit={t("station", lang)} />
        <Metric label={t("speed", lang)} value={metrics.speed} unit={metrics.speedUnit} />
        <Metric label={t("accuracy", lang)} value={metrics.accuracy} unit="%" />
      </div>
      <article
        className={`station-card${shake ? " shake" : ""}`}
        onClick={onFocusTyping}
      >
        <div className="station-meta">
          <span>{String(stationIndex + 1).padStart(2, "0")}<sup>/{stations.length}</sup></span>
          <span title={station.address}>{station.address}</span>
        </div>
        <div className="station-main">
          <div>
            <p>{oppositeLabel}</p>
            <h2>{oppositeName}</h2>
          </div>
          <div className={`next-station${next ? "" : " is-terminal"}`}>
            <span>{next ? t("nextStation", lang) : t("terminal", lang)}</span>
            <strong>{oppositeNext ?? t("routeEnd", lang)}</strong>
            {next ? (
              <b>
                <ArrowRight size={22} />
              </b>
            ) : null}
          </div>
        </div>
        <div className={`typing-area${isChinese ? " is-chinese" : ""}`}>
          <div
            className="typing-target"
            style={{
              "--fit-font": `calc((min(760px, 94vw) - 48px) / ${(targetCharacters.length * (isChinese ? 1 : 0.65)).toFixed(2)})`,
            }}
            aria-label={`${t("pleaseType", lang)} ${targetName}`}
          >
            {targetCharacters.map((character, index) => (
              <span
                key={`${character}-${index}`}
                className={
                  index < typedIndex
                    ? "typed"
                    : index === typedIndex
                      ? "current"
                      : ""
                }
              >
                {character === " " ? "\u00A0" : character}
              </span>
            ))}
          </div>
          {isChinese ? (
            <p
              id="typing-instruction"
              className={`composition-status${compositionText ? " is-composing" : ""}`}
            >
              {compositionText ? (
                <>
                  {t("composing", lang)} · <strong>{compositionText}</strong>
                </>
              ) : (
                t("useIme", lang)
              )}
            </p>
          ) : (
            <span id="typing-instruction" className="screen-reader-status">
              {t("typeEnglish", lang)}
            </span>
          )}
        </div>
        <div className="line-strip">
          <i />
          <span>{localizeText(line.lineName, lang)}</span>
        </div>
      </article>
    </section>
  );
}

function Metric({ label, value, unit }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{unit}</span>
    </div>
  );
}
