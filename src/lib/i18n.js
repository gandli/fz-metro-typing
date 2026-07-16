// 三档语言: 英文 / 简体 / 拼音
// 数据源已是简体 (Wikidata zh-hans + Wikipedia 简体版), 无需 opencc.
// 拼音模式: 打小写 pinyin 串 (如 "dong jie kou"), 匹配逻辑同英文.
export const TYPING_LANGUAGES = Object.freeze({
  ENGLISH: "en",
  SIMPLIFIED: "zh-Hans",
  PINYIN: "pinyin",
});

// 语言 label (界面上 SegmentedControl 用)
export const LANGUAGE_OPTIONS = [
  { value: TYPING_LANGUAGES.ENGLISH, label: "English" },
  { value: TYPING_LANGUAGES.SIMPLIFIED, label: "简体" },
  { value: TYPING_LANGUAGES.PINYIN, label: "拼音" },
];

/** 按语言返回站名 (data 里 nameZh 简体 / nameEn 英文 / target 拼音串) */
export function localizeStationName(station, language) {
  if (!station) return "";
  if (language === TYPING_LANGUAGES.ENGLISH) return station.nameEn ?? "";
  if (language === TYPING_LANGUAGES.PINYIN) return station.target ?? "";
  return station.nameZh ?? "";
}

/** 是否中文档 (需要 IME 输入) */
export function isChineseLanguage(language) {
  return language === TYPING_LANGUAGES.SIMPLIFIED;
}

/** 通用: 把文本按语言本地化 (线路名、方向标签等) */
export function localizeText(text, language) {
  if (!text) return "";
  if (language === TYPING_LANGUAGES.ENGLISH) {
    return LINE_NAME_EN[text] ?? OPERATOR_NAME_EN[text] ?? text;
  }
  if (language === TYPING_LANGUAGES.PINYIN) {
    return LINE_NAME_PY[text] ?? text;
  }
  return text; // 简体档: 数据已是简体, 直接返回
}

// 线路名英文 override (数据里的 lineName 是"1 号线"等中文, 英文档需要显示 "Line 1")
const LINE_NAME_EN = {
  "1 号线": "Line 1",
  "2 号线": "Line 2",
  "4 号线": "Line 4",
  "5 号线": "Line 5",
  "6 号线": "Line 6",
  滨海快线: "Binhai Express",
};
const LINE_NAME_PY = {
  "1 号线": "1 hao xian",
  "2 号线": "2 hao xian",
  "4 号线": "4 hao xian",
  "5 号线": "5 hao xian",
  "6 号线": "6 hao xian",
  滨海快线: "bin hai kuai xian",
};
const OPERATOR_NAME_EN = {
  福州地铁: "Fuzhou Metro",
};

// ---- UI 文案字典 ----
const UI_STRINGS = {
  back: { en: "Back", "zh-Hans": "返回选线", pinyin: "fanhui xuanxian" },
  routeName: { en: "Route", "zh-Hans": "路线", pinyin: "luxian" },
  from: { en: "From", "zh-Hans": "从", pinyin: "cong" },
  to: { en: "→", "zh-Hans": "往", pinyin: "wang" },
  nextStation: { en: "NEXT", "zh-Hans": "下一站", pinyin: "xiayizhan" },
  terminal: { en: "TERMINAL", "zh-Hans": "终点站", pinyin: "zhongdianzhan" },
  routeEnd: { en: "End of Line", "zh-Hans": "本线终点", pinyin: "benxian zhongdian" },
  stations: { en: "stops", "zh-Hans": "站", pinyin: "zhan" },
  // 打字对照 label: 命名按"对面语言"
  labelEn: { en: "CHINESE", "zh-Hans": "ENGLISH", pinyin: "CHINESE" },
  labelZh: { en: "中文站名", "zh-Hans": "英文名", pinyin: "汉字" },
  // scorebar
  remaining: { en: "TIME", "zh-Hans": "剩余", pinyin: "shengyu" },
  elapsed: { en: "ELAPSED", "zh-Hans": "经过", pinyin: "jingguo" },
  arrived: { en: "STOPS", "zh-Hans": "到站", pinyin: "daozhan" },
  speed: { en: "SPEED", "zh-Hans": "速度", pinyin: "sudu" },
  accuracy: { en: "ACC", "zh-Hans": "正确率", pinyin: "zhengquelu" },
  seconds: { en: "s", "zh-Hans": "秒", pinyin: "s" },
  // 打字状态
  composing: { en: "Composing", "zh-Hans": "选字中", pinyin: "xuanzi zhong" },
  useIme: { en: "Use IME", "zh-Hans": "使用输入法选字", pinyin: "shiyong shuru fa xuanzi" },
  typeEnglish: {
    en: "Type the station name",
    "zh-Hans": "直接输入画面上的站名",
    pinyin: "zhijie shuru pinyin",
  },
  station: { en: "stops", "zh-Hans": "站", pinyin: "zhan" },
  langLabel: { en: "Station name", "zh-Hans": "站名", pinyin: "zhanming" },
  modeLabel: { en: "Mode", "zh-Hans": "玩法", pinyin: "wanfa" },
  modeTimed: { en: "30 s", "zh-Hans": "30 秒", pinyin: "30 miao" },
  modeLine: { en: "Full Line", "zh-Hans": "全线", pinyin: "quanxian" },
  startRoute: {
    en: "Start This Route",
    "zh-Hans": "开始这条路线",
    pinyin: "kaishi zhe tiao luxian",
  },
  recenter: { en: "Recenter", "zh-Hans": "归位", pinyin: "guiwei" },
  mapA11y: {
    en: "Route map. Drag to pan, pinch to zoom, double tap to reset.",
    "zh-Hans": "路线图，单指拖动，双指缩放，双击归位。",
    pinyin: "luxian tu. tuo dong ping yi, shuang zhi suo fang, shuang ji gui wei.",
  },
  nowArriving: {
    en: "Now arriving",
    "zh-Hans": "目前车站",
    pinyin: "muqian chezhan",
  },
  pleaseType: {
    en: "please type",
    "zh-Hans": "请输入",
    pinyin: "qing shuru",
  },
  heroLine1: {
    en: "Station by station. ",
    "zh-Hans": "一站接一站，",
    pinyin: "yi zhan jie yi zhan, ",
  },
  heroLine2: {
    en: "Type your way through.",
    "zh-Hans": "越打越顺。",
    pinyin: "yue da yue shun.",
  },
  heroDesc: {
    en: "Pick a line on the real Fuzhou map and type each station name in English, Chinese, or Pinyin along the actual route. Each correct character moves the train one hop.",
    "zh-Hans":
      "在真实福州地图上选一条地铁线路，用英文、中文或拼音打完每一站的名字。每打对一个字，列车就往下一站前进一段。",
    pinyin:
      "zai zhen shi fu zhou di tu shang xuan yi tiao di tie xian lu, yong ying wen, zhong wen huo pin yin da wan mei yi zhan de ming zi.",
  },
  homeEyebrow: {
    en: "6 lines · 117 stations · Wikidata + Wikipedia",
    "zh-Hans": "6 条线路 · 117 站 · 维基数据",
    pinyin: "6 tiao xianlu · 117 zhan · wei ji shu ju",
  },
  selectedRouteLabel: {
    en: "Selected route",
    "zh-Hans": "已选路线",
    pinyin: "yi xuan luxian",
  },
  resultKicker: {
    en: "Route complete",
    "zh-Hans": "旅程完成",
    pinyin: "lucheng wancheng",
  },
  resultTitle: {
    en: "That was a smooth ride.",
    "zh-Hans": "这班车，跑得很顺。",
    pinyin: "zhe ban che, pao de hen shun.",
  },
  resultSummary: {
    en: "You passed {completed} stations in {elapsed} seconds.",
    "zh-Hans": "你用 {elapsed} 秒跑完 {completed} 站。",
    pinyin: "ni yong {elapsed} miao pao wan {completed} zhan.",
  },
  resultStationsLabel: {
    en: "Stations cleared",
    "zh-Hans": "通过站数",
    pinyin: "tongguo zhanshu",
  },
  resultSpeedPrefix: { en: "Avg", "zh-Hans": "平均", pinyin: "pingjun" },
  resultAccuracyLabel: {
    en: "Accuracy",
    "zh-Hans": "正确率",
    pinyin: "zhengquelu",
  },
  resultRestart: {
    en: "Pick another route",
    "zh-Hans": "重新选线",
    pinyin: "chongxin xuanxian",
  },
  resultRetry: { en: "Run it again", "zh-Hans": "再跑一次", pinyin: "zai pao yi ci" },
  heroCallout: {
    en: "Pick a line from the map or the list below",
    "zh-Hans": "从地图或下方线路列表选择",
    pinyin: "cong ditu huo xiafang luxian liebiao xuanze",
  },
  routesCount: {
    en: "lines",
    "zh-Hans": "条线路",
    pinyin: "tiao xianlu",
  },
  stationsSuffix: {
    en: "station coordinates",
    "zh-Hans": "笔站点坐标",
    pinyin: "bi zhandian zuobiao",
  },
  backToTaiwan: {
    en: "Back to Fuzhou Map",
    "zh-Hans": "返回福州全图",
    pinyin: "fanhui fuzhou quantu",
  },
  routeListLabel: {
    en: "Selectable metro lines",
    "zh-Hans": "可选择的地铁线路",
    pinyin: "kexuan de ditie xianlu",
  },
  runPickerLabel: { en: "Segment", "zh-Hans": "区间", pinyin: "qujian" },
  runPickerAria: {
    en: "Choose the operating segment",
    "zh-Hans": "选择行驶区间",
    pinyin: "xuanze xingshi qujian",
  },
  directionLabel: { en: "Direction", "zh-Hans": "方向", pinyin: "fangxiang" },
  directionAria: {
    en: "Travel direction",
    "zh-Hans": "行驶方向",
    pinyin: "xingshi fangxiang",
  },
  // 语言选项 label
  langEn: { en: "English", "zh-Hans": "English", pinyin: "English" },
  langHans: { en: "简体", "zh-Hans": "简体", pinyin: "简体" },
  langPy: { en: "拼音", "zh-Hans": "拼音", pinyin: "拼音" },
  themeToggle: {
    en: "Toggle theme",
    "zh-Hans": "切换深色模式",
    pinyin: "qiehuan shense moshi",
  },
  brandBack: {
    en: "Back to home",
    "zh-Hans": "回到首页",
    pinyin: "huidao shouye",
  },
  loading: {
    en: "Loading Fuzhou metro network…",
    "zh-Hans": "正在载入福州路网…",
    pinyin: "zheng zai zairu fuzhou luwang…",
  },
};

/** 取 UI 文案. t('back', 'pinyin') → 'fanhui xuanxian' */
export function t(key, language) {
  const entry = UI_STRINGS[key];
  if (!entry) return key;
  return entry[language] ?? entry.en ?? key;
}
