import {
  TYPING_LANGUAGES as I18N_LANGUAGES,
  isChineseLanguage,
  localizeStationName,
} from "./i18n.js";

// 三档: en / zh-Hans (中文 IME) / pinyin (拉丁, 空格分词)
export const TYPING_LANGUAGES = Object.freeze({
  ENGLISH: I18N_LANGUAGES.ENGLISH,
  CHINESE: I18N_LANGUAGES.SIMPLIFIED, // 向后兼容
  SIMPLIFIED: I18N_LANGUAGES.SIMPLIFIED,
  PINYIN: I18N_LANGUAGES.PINYIN,
});

const NON_WORD_CHARACTERS = /[^\p{Letter}\p{Number}]/gu;

/** 打字目标: 中文档 = 简体站名剥标点, 英文/拼音档 = 对应 latin 串 lowercased */
export function getTypingTarget(station, language) {
  if (!station) return "";
  if (isChineseLanguage(language)) {
    return localizeStationName(station, language)
      .normalize("NFKC")
      .replace(NON_WORD_CHARACTERS, "");
  }
  if (language === TYPING_LANGUAGES.PINYIN) {
    // 拼音比对: 剥空格, 让 "xiangfeng" == "xiang feng" (用户连续打字也能过)
    return (station.target ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  }
  return (station.nameEn ?? station.target ?? "").normalize("NFKC").toLowerCase();
}

/** IME 提交后的输入: 中文档剥标点; latin 档 NFKC 归一化 + 拼音档剥空格 */
export function normalizeCommittedText(value, language) {
  const normalized = value.normalize("NFKC");
  if (!isChineseLanguage(language)) {
    // 英文/拼音: 去空格, 让 "xiangfeng" 与 "xiang feng" 等价
    return normalized.replace(/\s+/g, "");
  }
  return normalized.replace(NON_WORD_CHARACTERS, "");
}

/** 单字符匹配 (拼音档调用前已剥空格, 此处直接比) */
export function isTypingCharacterMatch(typed, expected, language) {
  if (!typed || !expected) return false;
  if (isChineseLanguage(language)) return typed === expected;
  return typed.toLowerCase() === expected.toLowerCase();
}
