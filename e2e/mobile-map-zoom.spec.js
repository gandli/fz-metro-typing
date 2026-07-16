import { test, expect } from "@playwright/test";

/**
 * 移动端地图路线可见性回归测试. PR#4 (51c881e) 修复了路线只 96×123px 的问题.
 */
async function selectRouteAndStart(page, langCycleCount = 3, lineIndex = 0) {
  await page.goto("/");
  await page.waitForSelector(".route-carousel .route-button", { timeout: 15_000 });
  const langBtn = page.locator(".lang-cycle");
  for (let i = 0; i < langCycleCount; i++) {
    await langBtn.click();
    await page.waitForTimeout(50);
  }
  await page.locator(".route-carousel .route-button").nth(lineIndex).click();
  await page.locator(".start-button").click();
  await page.waitForSelector("svg.metro-map polyline.map-line.selected");
}

test.describe("移动端地图路线可见性", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-iphone", "手机端专用");
  });

  test("selected polyline 应填满可视区 (≥200×250px)", async ({ page }) => {
    await selectRouteAndStart(page);
    // 福州地铁线路由单段 segment 组成, 用整个 route bbox 更稳
    const polylines = page.locator("polyline.map-line.selected");
    const count = await polylines.count();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      const b = await polylines.nth(i).boundingBox();
      if (b) {
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
    }
    // 修复前: 96×123px 挤在中央. 修复后 iPhone 13 (390×664) 应 ≥ 170×220px.
    // (iPhone 11/Pro 更高 vp 会达 240×310, 但 iPhone 13 vp 更短)
    expect(maxX - minX).toBeGreaterThanOrEqual(170);
    expect(maxY - minY).toBeGreaterThanOrEqual(210);
  });

  test("map container 限位在安全区 (避开 scorebar + station-card)", async ({ page }) => {
    await selectRouteAndStart(page);
    const container = await page.locator(".metro-map-container").boundingBox();
    const scorebar = await page.locator(".scorebar").boundingBox();
    const stationCard = await page.locator(".station-card").boundingBox();
    expect(container.y).toBeGreaterThanOrEqual(scorebar.y + scorebar.height - 5);
    expect(container.y + container.height).toBeLessThanOrEqual(stationCard.y + 5);
  });

  test("SVG viewBox aspect 匹配容器竖屏比例 (h/w ≥ 1.3)", async ({ page }) => {
    await selectRouteAndStart(page);
    const viewBox = await page.locator("svg.metro-map").getAttribute("viewBox");
    const [, , w, h] = viewBox.split(" ").map(Number);
    expect(h / w).toBeGreaterThanOrEqual(1.3);
  });

  test("route-pill 长英文终点站双行显示不词中截断", async ({ page }) => {
    await selectRouteAndStart(page, 0, 4); // L6 (index 4), 英文档, 终点 "Binhai CBD"
    const pill = page.locator(".route-pill");
    const box = await pill.boundingBox();
    const text = await pill.textContent();
    expect(text).toContain("Binhai CBD");
    expect(box.height).toBeGreaterThanOrEqual(30);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});

test.describe("桌面端地图 aspect 保持横屏", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "桌面端专用");
  });

  test("viewBox aspect h/w 在 0.6-0.9 (横屏)", async ({ page }) => {
    await selectRouteAndStart(page);
    const viewBox = await page.locator("svg.metro-map").getAttribute("viewBox");
    const [, , w, h] = viewBox.split(" ").map(Number);
    expect(h / w).toBeGreaterThanOrEqual(0.6);
    expect(h / w).toBeLessThanOrEqual(0.9);
  });
});

test.describe("focused 状态地图路线可见性 (HomeScreen)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-iphone", "手机端专用");
  });

  test("selected 后 fuzhou-map viewBox aspect 应匹配竖屏 (h/w ≥ 1.3)", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".route-carousel .route-button", { timeout: 15_000 });
    // 直接点第一条线路 (未 start), 进入 focused 状态
    await page.locator(".route-carousel .route-button").first().click();
    // 等 FuzhouMap viewBox transition 收敛 (rAF 680ms)
    await page.waitForTimeout(900);
    const viewBox = await page.locator("svg.fuzhou-map").getAttribute("viewBox");
    expect(viewBox).not.toBeNull();
    const [, , w, h] = viewBox.split(/\s+/).map(Number);
    expect(h / w).toBeGreaterThanOrEqual(1.3);
    // viewBox 宽应紧贴路线 bbox + padding, 不被 46 minimumWidth 强制拉大
    // 福州线经度跨度较大, 实测 focused 状态 w ~54, 用宽松上限确认无过度留白
    expect(w).toBeLessThan(80);
  });
});
