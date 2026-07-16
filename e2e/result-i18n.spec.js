import { test, expect } from "@playwright/test";

/**
 * ResultScreen i18n 覆盖回归. impeccable polish 补漏:
 * 原 ResultScreen hardcode 中文, 英/繁档下显示错语言.
 */

async function playToResult(page, timeoutMs = 800) {
  await page.goto("/");
  await page.waitForSelector(".route-carousel .route-button", { timeout: 15_000 });
  // 切英文
  const langBtn = page.locator(".lang-cycle");
  for (let i = 0; i < 3; i++) {
    await langBtn.click();
    await page.waitForTimeout(50);
  }
  await page.locator(".route-carousel .route-button").first().click();
  await page.locator(".start-button").click();
  // 直接等 30s 超时结束; 或按 Enter 提前退? — 走定时模式让 timer 自然结束
  // 快捷路径: JS 直接触发 finish (更快)
  await page.waitForSelector(".mobile-typing-input", { timeout: 5_000 }).catch(() => {});
  // 等定时器到 -- 简化用直接超时策略, 时间可配
  await page.waitForSelector(".result-card", { timeout: 35_000 });
}

test.describe("ResultScreen 三档 i18n", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-iphone", "只跑一次即可");
  });

  test("英文档下 ResultScreen 全英文, 无 hardcode 中文", async ({ page }) => {
    test.setTimeout(60_000);
    await playToResult(page);
    const kicker = await page.locator(".result-kicker").textContent();
    const title = await page.locator(".result-card h2").textContent();
    const summary = await page.locator(".result-card p").textContent();
    expect(kicker.trim()).toBe("Route complete");
    expect(title.trim()).toBe("That was a smooth ride.");
    // 应含 stations + seconds; 不应含中文车站/秒
    expect(summary).toMatch(/stations?.*seconds?/i);
    expect(summary).not.toMatch(/车站|秒内/);
    // 按钮文案
    const restart = await page.locator(".result-actions .secondary-button").textContent();
    expect(restart.trim()).toBe("Pick another route");
  });
});
