import test from "node:test";
import assert from "node:assert/strict";
import {
  getTypingTarget,
  isTypingCharacterMatch,
  normalizeCommittedText,
  TYPING_LANGUAGES,
} from "./typing.js";

test("Chinese target keeps words/numbers, drops punctuation", () => {
  assert.equal(
    getTypingTarget({ nameZh: "东街口/福州" }, TYPING_LANGUAGES.CHINESE),
    "东街口福州",
  );
  assert.equal(
    getTypingTarget({ nameZh: "董屿·福建师大" }, TYPING_LANGUAGES.CHINESE),
    "董屿福建师大",
  );
});

test("committed Chinese input strips punctuation and NFKC-normalizes", () => {
  assert.equal(
    normalizeCommittedText("福州１号／地铁", TYPING_LANGUAGES.CHINESE),
    "福州1号地铁",
  );
});

test("Chinese char match is exact (simplified only)", () => {
  assert.equal(isTypingCharacterMatch("东", "东", TYPING_LANGUAGES.CHINESE), true);
  assert.equal(isTypingCharacterMatch("东", "南", TYPING_LANGUAGES.CHINESE), false);
});

test("English typing is case-insensitive against target", () => {
  assert.equal(
    getTypingTarget(
      { nameEn: "Fuzhou Railway", target: "fuzhou railway" },
      TYPING_LANGUAGES.ENGLISH,
    ),
    "fuzhou railway",
  );
  assert.equal(isTypingCharacterMatch("F", "f", TYPING_LANGUAGES.ENGLISH), true);
});

test("Pinyin target is lowercased pinyin string, spaces stripped for comparison", () => {
  assert.equal(
    getTypingTarget(
      { nameZh: "东街口", target: "dong jie kou" },
      TYPING_LANGUAGES.PINYIN,
    ),
    "dongjiekou",
  );
});

test("Pinyin match is case-insensitive", () => {
  assert.equal(isTypingCharacterMatch("D", "d", TYPING_LANGUAGES.PINYIN), true);
  assert.equal(isTypingCharacterMatch(" ", " ", TYPING_LANGUAGES.PINYIN), true);
});
