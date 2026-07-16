import { RotateCcw } from "lucide-react";
import { t } from "../lib/i18n";

export function ResultScreen({
  elapsed,
  completed,
  metrics,
  routeColor,
  language = "zh-Hans",
  onBack,
  onRetry,
}) {
  // 插值 helper: {elapsed} / {completed} → 实际值
  const summary = t("resultSummary", language)
    .replace("{elapsed}", elapsed)
    .replace("{completed}", completed);

  return (
    <section className="results" style={{ "--result-route": routeColor }}>
      <div className="result-card">
        <span className="result-kicker">{t("resultKicker", language)}</span>
        <h2>{t("resultTitle", language)}</h2>
        <p>{summary}</p>
        <div className="result-metrics">
          <div>
            <strong>{completed}</strong>
            <span>{t("resultStationsLabel", language)}</span>
          </div>
          <div>
            <strong>{metrics.speed}</strong>
            <span>
              {t("resultSpeedPrefix", language)} {metrics.speedUnit}
            </span>
          </div>
          <div>
            <strong>{metrics.accuracy}%</strong>
            <span>{t("resultAccuracyLabel", language)}</span>
          </div>
        </div>
        <div className="result-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            {t("resultRestart", language)}
          </button>
          <button className="start-button" type="button" onClick={onRetry}>
            <span>{t("resultRetry", language)}</span>
            <b>
              <RotateCcw size={19} />
            </b>
          </button>
        </div>
      </div>
    </section>
  );
}
