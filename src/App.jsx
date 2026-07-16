import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ResultScreen } from "./components/ResultScreen";
import { useMapData } from "./hooks/useMapData";
import {
  buildMapModel,
  getPlayableStations,
  ROUTE_DIRECTIONS,
} from "./lib/map";
import {
  getTypingTarget,
  isTypingCharacterMatch,
  normalizeCommittedText,
  TYPING_LANGUAGES,
} from "./lib/typing";
import { isChineseLanguage, t as tr } from "./lib/i18n";

const TIMED_MS = 30000;

export default function App() {
  const { data, topology, error } = useMapData();
  const mapModel = useMemo(
    () => (data && topology ? buildMapModel(topology, data.lines) : null),
    [data, topology],
  );
  const [screen, setScreen] = useState("home");
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [runIndex, setRunIndex] = useState(0);
  const [direction, setDirection] = useState(ROUTE_DIRECTIONS.FORWARD);
  const [mode, setMode] = useState("timed");
  const [typingLanguage, setTypingLanguage] = useState(
    TYPING_LANGUAGES.ENGLISH,
  );
  const [dark, setDark] = useState(false);
  const [stationIndex, setStationIndex] = useState(0);
  const [typedIndex, setTypedIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [shake, setShake] = useState(false);
  const [compositionText, setCompositionText] = useState("");
  const startTimeRef = useRef(0);
  const typingInputRef = useRef(null);
  const gameActiveRef = useRef(false);
  const isComposingRef = useRef(false);
  // Typing progress can advance faster than React re-renders during fast bursts,
  // so input position and the active station are also tracked synchronously.
  const typedIndexRef = useRef(0);
  const stationIndexRef = useRef(0);

  const selectedLine =
    data?.lines.find((line) => line.id === selectedLineId) ?? null;
  const stations = useMemo(
    () => getPlayableStations(selectedLine, runIndex, direction),
    [direction, selectedLine, runIndex],
  );
  const attempts = correct + errors;
  const elapsed = Math.floor(elapsedMs / 1000);
  const remaining = Math.max(Math.ceil((TIMED_MS - elapsedMs) / 1000), 0);
  const minutes = Math.max(elapsedMs, 2000) / 60000;
  const metrics = {
    // Clamp to 2s so the first keystrokes don't show an absurd spike.
    speed: isChineseLanguage(typingLanguage)
      ? Math.round(correct / minutes)
      : Math.round(correct / 5 / minutes),
    speedUnit: isChineseLanguage(typingLanguage) ? "CPM" : "WPM",
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 100,
  };
  const showSiteChrome = screen !== "game";

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  // 移动端: 进入 game 页给 body 加 .game-active (让隐藏 input 变可见输入框);
  // 同时监听 visualViewport 实时暴露软键盘高度到 CSS var --kb-h, 供 sticky 布局用
  useEffect(() => {
    document.body.classList.toggle("game-active", screen === "game");
    if (screen !== "game") {
      document.documentElement.style.removeProperty("--kb-h");
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb-h", `${kb}px`);
      // 键盘弹起 (>100px 阈值) 时标记 body, CSS 用于精简小视口 UI
      document.body.classList.toggle("kb-open", kb > 100);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--kb-h");
      document.body.classList.remove("kb-open");
    };
  }, [screen]);

  const resetTypingInput = useCallback(() => {
    isComposingRef.current = false;
    if (typingInputRef.current) typingInputRef.current.value = "";
    setCompositionText("");
  }, []);

  const startGame = useCallback(() => {
    if (!selectedLine) return;
    resetTypingInput();
    gameActiveRef.current = true;
    typingInputRef.current?.focus({ preventScroll: true });
    typedIndexRef.current = 0;
    stationIndexRef.current = 0;
    setStationIndex(0);
    setTypedIndex(0);
    setCorrect(0);
    setErrors(0);
    setCompleted(0);
    setElapsedMs(0);
    startTimeRef.current = performance.now();
    setScreen("game");
  }, [resetTypingInput, selectedLine]);

  const backToHome = useCallback(() => {
    gameActiveRef.current = false;
    resetTypingInput();
    typingInputRef.current?.blur();
    setSelectedLineId(null);
    setRunIndex(0);
    setDirection(ROUTE_DIRECTIONS.FORWARD);
    setScreen("home");
  }, [resetTypingInput]);

  const selectLine = useCallback((lineId) => {
    window.scrollTo({ top: 0 });
    setSelectedLineId(lineId);
    setRunIndex(0);
    setDirection(ROUTE_DIRECTIONS.FORWARD);
  }, []);

  const selectRun = useCallback((index) => {
    setRunIndex(index);
    setDirection(ROUTE_DIRECTIONS.FORWARD);
  }, []);

  const resetLineSelection = useCallback(() => {
    setSelectedLineId(null);
    setRunIndex(0);
    setDirection(ROUTE_DIRECTIONS.FORWARD);
  }, []);

  const finishGame = useCallback(() => {
    if (!gameActiveRef.current) return;
    gameActiveRef.current = false;
    resetTypingInput();
    typingInputRef.current?.blur();
    // Capture the exact finish time instead of the last whole-second tick.
    const ms = performance.now() - startTimeRef.current;
    setElapsedMs(mode === "timed" ? Math.min(ms, TIMED_MS) : ms);
    setScreen("result");
  }, [mode, resetTypingInput]);

  useEffect(() => {
    if (screen !== "game") return undefined;
    const timer = setInterval(() => {
      const ms = performance.now() - startTimeRef.current;
      setElapsedMs(mode === "timed" ? Math.min(ms, TIMED_MS) : ms);
    }, 200);
    return () => clearInterval(timer);
  }, [mode, screen]);

  useEffect(() => {
    if (screen === "game" && mode === "timed" && elapsedMs >= TIMED_MS)
      finishGame();
  }, [elapsedMs, finishGame, mode, screen]);

  const advanceStation = useCallback(() => {
    const currentIndex = stationIndexRef.current;
    setCompleted((value) => value + 1);
    if (mode === "line" && currentIndex >= stations.length - 1) {
      finishGame();
      return;
    }
    const nextIndex = (currentIndex + 1) % stations.length;
    typedIndexRef.current = 0;
    stationIndexRef.current = nextIndex;
    setStationIndex(nextIndex);
    setTypedIndex(0);
  }, [finishGame, mode, stations.length]);

  const typeCharacter = useCallback(
    (character) => {
      if (!gameActiveRef.current || [...character].length !== 1) return;
      const station = stations[stationIndexRef.current];
      if (!station) return;
      const target = getTypingTarget(station, typingLanguage);
      const targetCharacters = [...target];
      const expected = targetCharacters[typedIndexRef.current];
      if (isTypingCharacterMatch(character, expected, typingLanguage)) {
        typedIndexRef.current += 1;
        setCorrect((value) => value + 1);
        if (typedIndexRef.current >= targetCharacters.length) advanceStation();
        else setTypedIndex(typedIndexRef.current);
      } else {
        setErrors((value) => value + 1);
        setShake(false);
        requestAnimationFrame(() => setShake(true));
        setTimeout(() => setShake(false), 170);
      }
    },
    [advanceStation, stations, typingLanguage],
  );

  const consumeTypingInput = useCallback(
    (input) => {
      const value = input.value;
      if (!value) return;
      input.value = "";
      setCompositionText("");
      for (const character of normalizeCommittedText(value, typingLanguage))
        typeCharacter(character);
    },
    [typeCharacter, typingLanguage],
  );

  const handleTypingInput = useCallback(
    (event) => {
      if (isComposingRef.current || event.nativeEvent.isComposing) {
        setCompositionText(event.currentTarget.value);
        return;
      }
      consumeTypingInput(event.currentTarget);
    },
    [consumeTypingInput],
  );

  const handleCompositionStart = useCallback((event) => {
    isComposingRef.current = true;
    setCompositionText(event.currentTarget.value);
  }, []);

  const handleCompositionUpdate = useCallback((event) => {
    setCompositionText(event.data || event.currentTarget.value || "");
  }, []);

  const handleCompositionEnd = useCallback(
    (event) => {
      isComposingRef.current = false;
      setCompositionText("");
      // compositionend fires after the input control contains the committed
      // candidate, so consume it here and ignore all interim composition input.
      consumeTypingInput(event.currentTarget);
    },
    [consumeTypingInput],
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === "Escape") {
        if (screen === "game") backToHome();
        else if (screen === "home" && selectedLineId) {
          resetLineSelection();
        }
        return;
      }
      if (
        screen !== "game" ||
        event.target === typingInputRef.current ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.length !== 1
      )
        return;
      if (
        event.key === " " ||
        getTypingTarget(stations[stationIndex], typingLanguage)[
          typedIndexRef.current
        ] === " "
      )
        event.preventDefault();
      typeCharacter(event.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    backToHome,
    resetLineSelection,
    screen,
    selectedLineId,
    stationIndex,
    stations,
    typeCharacter,
    typingLanguage,
  ]);

  const currentTarget = getTypingTarget(stations[stationIndex], typingLanguage);

  return (
    <div className="app-shell">
      <input
        ref={typingInputRef}
        className="mobile-typing-input"
        type="text"
        inputMode="text"
        lang={typingLanguage === TYPING_LANGUAGES.SIMPLIFIED ? "zh-Hans" : "en"}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={
          typingLanguage === TYPING_LANGUAGES.SIMPLIFIED
            ? "中文站名输入"
            : typingLanguage === TYPING_LANGUAGES.PINYIN
              ? "拼音站名输入"
              : "英文站名输入"
        }
        aria-describedby={screen === "game" ? "typing-instruction" : undefined}
        onInput={handleTypingInput}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
      />
      {showSiteChrome ? (
        <header className="topbar">
          <button
            className="brand"
            type="button"
            onClick={backToHome}
            aria-label={tr("brandBack", typingLanguage)}
          >
            <span>FUZHOU METRO TYPING</span>
          </button>
          <div className="top-actions">
            <button
              className="icon-button lang-cycle"
              type="button"
              aria-label={tr("langLabel", typingLanguage)}
              onClick={() => {
                const order = ["en", "zh-Hans", "pinyin"];
                const next = order[(order.indexOf(typingLanguage) + 1) % 3];
                setTypingLanguage(next);
              }}
              title={tr("langLabel", typingLanguage)}
            >
              <span className="lang-tag">
                {typingLanguage === "en"
                  ? "EN"
                  : typingLanguage === "zh-Hans"
                    ? "简"
                    : "拼"}
              </span>
            </button>
            <button
              className="icon-button"
              type="button"
              aria-pressed={dark}
              aria-label={tr("themeToggle", typingLanguage) || "切换深色模式"}
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>
      ) : null}
      <main>
        {error ? <DataError message={error.message} /> : null}
        {!error && (!data || !mapModel) ? (
          <div className="loading">
            <span />
            {tr("loading", typingLanguage)}
          </div>
        ) : null}
        {data && mapModel && screen === "home" ? (
          <HomeScreen
            data={data}
            mapModel={mapModel}
            selectedLine={selectedLine}
            runIndex={runIndex}
            onRunChange={selectRun}
            direction={direction}
            onDirectionChange={setDirection}
            mode={mode}
            onModeChange={setMode}
            typingLanguage={typingLanguage}
            onTypingLanguageChange={setTypingLanguage}
            onSelect={selectLine}
            onReset={resetLineSelection}
            onStart={startGame}
          />
        ) : null}
        {data &&
        mapModel &&
        screen === "game" &&
        selectedLine &&
        stations.length ? (
          <GameScreen
            mapModel={mapModel}
            line={selectedLine}
            stations={stations}
            mode={mode}
            stationIndex={stationIndex}
            typedIndex={typedIndex}
            target={currentTarget}
            typingLanguage={typingLanguage}
            compositionText={compositionText}
            completed={completed}
            remaining={remaining}
            elapsed={elapsed}
            metrics={metrics}
            shake={shake}
            onBack={backToHome}
            onFocusTyping={() =>
              typingInputRef.current?.focus({ preventScroll: true })
            }
          />
        ) : null}
        {screen === "result" ? (
          <ResultScreen
            elapsed={elapsed}
            completed={completed}
            metrics={metrics}
            routeColor={selectedLine?.color}
            language={typingLanguage}
            onBack={backToHome}
            onRetry={startGame}
          />
        ) : null}
      </main>
      {showSiteChrome ? (
        <footer>
          <div className="footer-brand">
            <span className="footer-wordmark">FUZHOU METRO TYPING</span>
            <span className="footer-lines" aria-hidden="true">
              {(data?.lines ?? []).map((line) => (
                <i key={line.id} style={{ background: line.color }} />
              ))}
            </span>
          </div>
          <div className="footer-meta">
            <p>
              <span className="footer-label">DATA</span>
              行政区边界{" "}
              <a
                href="https://datav.aliyun.com/portal/school/atlas/area_selector"
                target="_blank"
                rel="noreferrer"
              >
                DataV.GeoAtlas
              </a>
              <span className="footer-sep">·</span>
              站点坐标{" "}
              <a
                href="https://www.wikidata.org/wiki/Q1022261"
                target="_blank"
                rel="noreferrer"
              >
                Wikidata
              </a>
              <span className="footer-sep">·</span>
              站序{" "}
              <a
                href="https://zh.wikipedia.org/wiki/%E7%A6%8F%E5%B7%9E%E5%9C%B0%E9%93%81%E8%BD%A6%E7%AB%99%E5%88%97%E8%A1%A8"
                target="_blank"
                rel="noreferrer"
              >
                Wikipedia
              </a>
            </p>
            <p>
              Forked from{" "}
              <a
                href="https://github.com/ridemountainpig/tw-metro-typing"
                target="_blank"
                rel="noreferrer"
              >
                tw-metro-typing
              </a>
              <span className="footer-sep">·</span>
              <a
                href="https://github.com/gandli/fz-metro-typing"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function DataError({ message }) {
  return (
    <div className="data-error">
      <strong>福州地铁数据载入失败</strong>
      <span>{message}</span>
      <button type="button" onClick={() => location.reload()}>
        重新载入
      </button>
    </div>
  );
}
