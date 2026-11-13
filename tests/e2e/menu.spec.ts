import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEFAULT_FOODS, MAX_FOOD_NAME_LENGTH } from "../../lib/foods";

async function seed(page: Page, value: string) {
  await page.goto("/");
  await page.evaluate((raw) => localStorage.setItem("foods", raw), value);
  await page.reload();
}

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "编辑菜单" }).click();
  await expect(page.getByRole("dialog", { name: /我的菜单/ })).toBeVisible();
}

async function addFood(page: Page, food: string) {
  await page.getByRole("textbox", { name: "新增菜品" }).fill(food);
  await page.getByRole("button", { name: "添加菜品", exact: true }).click();
}

async function resetMenu(page: Page) {
  await page.getByRole("button", { name: "重置菜单", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "重置菜单？" })).toBeVisible();
  await page.getByRole("button", { name: "确认重置", exact: true }).click();
}

async function savedFoods(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("foods") ?? "null"));
}

async function contrastRatio(text: Locator) {
  return text.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const surface = element.closest('[data-slot="alert"], [role="dialog"]') ?? document.body;
    context.fillStyle = getComputedStyle(surface).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const background = context.getImageData(0, 0, 1, 1).data;
    // Let the browser convert modern CSS colours and composite text opacity.
    context.fillStyle = getComputedStyle(element).color;
    context.fillRect(0, 0, 1, 1);
    const foreground = context.getImageData(0, 0, 1, 1).data;
    const luminance = (rgba: Uint8ClampedArray) => Array.from(rgba).slice(0, 3)
      .map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((total, value, i) => total + value * [0.2126, 0.7152, 0.0722][i], 0);
    const front = luminance(foreground);
    const back = luminance(background);
    return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
  });
}

async function expectNamedButtons(page: Page) {
  for (const button of await page.getByRole("button").all()) {
    await expect(button).toHaveAccessibleName(/\S/);
  }
}

async function posterSnapshot(page: Page) {
  return page.locator(".menu-poster .paper-foods > li").evaluateAll((nodes) => nodes.map((node) => ({
    text: node.firstElementChild?.textContent,
  })));
}

const startName = "开始选";
const stopName = "停，就吃这个";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => { throw error; });
  page.on("console", (message) => {
    if (message.type() === "error") throw new Error(message.text());
  });
});

for (const foods of [[], ["自定义菜品"]]) {
  test(`initial load waits for storage without showing a default menu (${foods.length} dishes)`, async ({ page }) => {
    await seed(page, JSON.stringify(foods));
    let release!: () => void;
    const scriptsReady = new Promise<void>((resolve) => { release = resolve; });
    await page.route(/\.js(?:\?|$)/, async (route) => {
      await scriptsReady;
      await route.continue();
    });
    try {
      await page.reload({ waitUntil: "commit" });
      await expect(page.getByRole("status")).toHaveText("正在读取菜单…");
      await expect(page.getByRole("button")).toHaveCount(0);
      await expect(page.locator(".paper-foods > li")).toHaveCount(0);
      expect(await savedFoods(page)).toEqual(foods);
    } finally {
      release();
    }
    await expect(page.getByText("正在读取菜单…")).toHaveCount(0);
    await expect(page.locator(".menu-poster .paper-foods > li")).toHaveText(foods);
    await expect(page.getByRole("button", { name: foods.length ? startName : "添加菜品", exact: true })).toBeVisible();
    expect(await savedFoods(page)).toEqual(foods);
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("explains why the menu cannot be used instead of showing unusable buttons", async ({ page }) => {
    await page.goto("/");
    // Playwright's text query skips noscript subtrees even when JavaScript is disabled.
    const notice = page.locator("noscript p");
    await expect(notice).toHaveText("请启用 JavaScript 后使用抽签和菜单编辑功能。");
    await expect(notice).toBeVisible();
    await expect(page.getByText("正在读取菜单…")).toBeHidden();
    await expect(page.getByRole("button")).toHaveCount(0);
  });
});

test("the Apple icon loads, the list has a name, and the overlay keeps its animation in a light-only UI", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/meal-icon.png");
  const icon = await page.request.get("/meal-icon.png");
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toContain("image/png");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await openMenu(page);
  await expect(page.getByRole("list", { name: "当前菜品" })).toBeVisible();
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCSS("animation-name", "enter");
});

test("new names reject over 200 characters without truncating existing saved names", async ({ page }) => {
  const legacyName = "旧".repeat(MAX_FOOD_NAME_LENGTH + 1);
  const boundaryName = "新".repeat(MAX_FOOD_NAME_LENGTH);
  const tooLong = "长".repeat(MAX_FOOD_NAME_LENGTH + 1);
  await seed(page, JSON.stringify([legacyName]));
  await openMenu(page);
  const input = page.getByRole("textbox", { name: "新增菜品" });
  await addFood(page, tooLong);
  await expect(page.getByText(`菜名不能超过 ${MAX_FOOD_NAME_LENGTH} 个字符，请缩短后重试。`)).toBeVisible();
  await expect(input).toHaveValue(tooLong);
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  expect(await savedFoods(page)).toEqual([legacyName]);
  await addFood(page, ` ${boundaryName} `);
  await expect.poll(() => savedFoods(page)).toEqual([legacyName, boundaryName]);
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("aria-invalid", "false");
  await page.reload();
  await openMenu(page);
  await expect(page.getByRole("list", { name: "当前菜品" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: `删除${legacyName}`, exact: true }).click();
  await expect.poll(() => savedFoods(page)).toEqual([boundaryName]);
});

test("default menu draws a visible result, remains clickable and does not poll storage", async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    let reads = 0;
    Storage.prototype.getItem = function (key) { reads++; return getItem.call(this, key); };
    Object.defineProperty(window, "storageReads", { get: () => reads });
  });
  await page.goto("/");
  await openMenu(page);
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(DEFAULT_FOODS.length);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  const before = await page.evaluate(() => Reflect.get(window, "storageReads") as number);
  await page.getByRole("button", { name: startName, exact: true }).click();
  const stop = page.getByRole("button", { name: stopName, exact: true });
  await expect(stop).toBeVisible();
  for (let i = 0; i < 5; i++) {
    expect(await stop.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
    await page.waitForTimeout(40);
  }
  await stop.click();
  expect(DEFAULT_FOODS).toContain(await page.getByRole("status").innerText());
  expect(await page.evaluate(() => Reflect.get(window, "storageReads"))).toBe(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("adding trims names, persists across reload and ignores duplicate names", async ({ page }) => {
  await seed(page, '["饺子"]');
  await openMenu(page);
  await addFood(page, "  拉面  ");
  await expect.poll(() => savedFoods(page)).toEqual(["饺子", "拉面"]);
  await expect(page.getByRole("textbox", { name: "新增菜品" })).toHaveValue("");
  await addFood(page, "拉面");
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(2);
  await page.reload();
  await openMenu(page);
  await expect(page.getByRole("button", { name: "删除拉面", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(1);
});

test("blank input is rejected, empty menu offers direct adding, and reset recovers", async ({ page }) => {
  await seed(page, '["饺子"]');
  await openMenu(page);
  await addFood(page, "   ");
  await expect(page.getByText("请输入菜名，不能只填写空格。")).toBeVisible();
  expect(await savedFoods(page)).toEqual(["饺子"]);
  await page.getByRole("button", { name: "删除饺子", exact: true }).click();
  await expect.poll(() => savedFoods(page)).toEqual([]);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("button", { name: startName, exact: true })).toHaveCount(0);
  await expect(page.getByText("先加几道喜欢的菜。")).toBeVisible();
  await page.getByRole("button", { name: "添加菜品", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /我的菜单/ })).toBeVisible();
  await resetMenu(page);
  await expect.poll(() => savedFoods(page)).toEqual(DEFAULT_FOODS);
});

for (const raw of ["{broken", "null", "{}", "[1]"]) {
  test(`invalid storage ${raw} falls back without crashing and can be reset`, async ({ page }) => {
    await seed(page, raw);
    await expect(page.getByText(/无法读取本地菜单/)).toBeVisible();
    await openMenu(page);
    await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(DEFAULT_FOODS.length);
    await resetMenu(page);
    await expect(page.getByRole("dialog", { name: /我的菜单/ })).toBeVisible();
    await expect.poll(() => savedFoods(page)).toEqual(DEFAULT_FOODS);
    await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
  });
}

test("blocked storage leaves the default menu usable and shows a save error", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await page.goto("/");
  await expect(page.getByText(/无法读取本地菜单/)).toBeVisible();
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.getByRole("button", { name: stopName, exact: true }).click();
  expect(DEFAULT_FOODS).toContain(await page.getByRole("status").innerText());
  await openMenu(page);
  await addFood(page, "测试菜品");
  await expect(page.getByRole("dialog").getByText(/菜单保存失败/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "新增菜品" })).toHaveValue("测试菜品");
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(DEFAULT_FOODS.length);
});

test("quota failures never publish unsaved data and retain the draft for retry", async ({ page }) => {
  await seed(page, '["饺子"]');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  });
  await openMenu(page);
  await addFood(page, "拉面");
  await expect(page.getByRole("dialog").getByText(/菜单保存失败/)).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "新增菜品" })).toHaveValue("拉面");
  expect(await savedFoods(page)).toEqual(["饺子"]);
  await page.getByRole("button", { name: "删除饺子", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(1);
  await resetMenu(page);
  await expect(page.getByRole("dialog").getByText(/菜单保存失败/)).toBeVisible();
  await page.getByRole("button", { name: "保留菜单", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(1);
  expect(await savedFoods(page)).toEqual(["饺子"]);
});

test("missing Web Locks refuses unsafe writes without breaking drawing", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
  await seed(page, '["饺子"]');
  await openMenu(page);
  await addFood(page, "拉面");
  await expect(page.getByRole("dialog").getByText(/请通过 HTTPS 或 localhost/)).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(1);
  expect(await savedFoods(page)).toEqual(["饺子"]);
});

test("tabs synchronize deletes and serialize simultaneous additions", async ({ page, context }) => {
  await seed(page, '["饺子","拉面"]');
  const second = await context.newPage();
  await second.goto("/");
  await openMenu(page);
  await openMenu(second);
  await page.getByRole("button", { name: "删除饺子", exact: true }).click();
  await expect(second.getByRole("button", { name: "删除饺子", exact: true })).toHaveCount(0);
  await second.getByRole("button", { name: "删除拉面", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(0);
  await Promise.all([addFood(page, "米饭"), addFood(second, "面条")]);
  await expect.poll(async () => (await savedFoods(page) as string[]).sort()).toEqual(["米饭", "面条"].sort());
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(2);
  await expect(second.getByRole("dialog").getByRole("listitem")).toHaveCount(2);
  await second.close();
});

test("external menu changes stop a running draw and clear a removed result", async ({ page, context }) => {
  await seed(page, '["饺子"]');
  const second = await context.newPage();
  await second.goto("/");
  await page.getByRole("button", { name: startName, exact: true }).click();
  await openMenu(second);
  await second.getByRole("button", { name: "删除饺子", exact: true }).click();
  await expect(page.getByRole("button", { name: "添加菜品", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toBeEmpty();
  await addFood(second, "米饭");
  await expect(page.getByRole("button", { name: startName, exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: stopName, exact: true })).toHaveCount(0);
  await second.close();
});

test("result contrast, button names, long names and reduced motion remain accessible", async ({ page }) => {
  await seed(page, JSON.stringify(["很长的菜名".repeat(40)]));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: startName, exact: true }).click();
  await expect(page.getByRole("region", { name: "我的菜单", exact: true })).toBeVisible();
  await page.getByRole("button", { name: stopName, exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await contrastRatio(page.getByRole("status"))).toBeGreaterThanOrEqual(4.5);
  await expect(page.getByRole("status")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expectNamedButtons(page);
  await openMenu(page);
  await expectNamedButtons(page);
  await expect(page.getByRole("textbox", { name: "新增菜品" })).toBeVisible();
});

test("mixed-length names keep the stop button fixed on a narrow screen", async ({ page }) => {
  const longName = "重庆招牌酸菜肥牛米线套餐加煎蛋不要香菜";
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page, JSON.stringify(["面", longName]));
  await page.evaluate(() => {
    let i = 0;
    Math.random = () => i++ % 2 ? 0 : 0.999999;
  });
  await page.getByRole("button", { name: startName, exact: true }).click();
  const stop = page.getByRole("button", { name: stopName, exact: true });
  await expect(stop).toBeVisible();
  const samples = await stop.evaluate(async (button) => {
    const rect = button.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const samples = [];
    for (let i = 0; i < 30; i++) {
      samples.push({
        top: button.getBoundingClientRect().top,
        hit: button.contains(document.elementFromPoint(x, y)),
        food: document.querySelector('[role="status"]')!.textContent,
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return samples;
  });
  expect(new Set(samples.map((sample) => sample.food)).size).toBe(2);
  expect(Math.max(...samples.map((sample) => sample.top)) - Math.min(...samples.map((sample) => sample.top))).toBeLessThan(1);
  expect(samples.every((sample) => sample.hit)).toBe(true);
  await page.evaluate(() => { Math.random = () => 0.999999; });
  await expect(page.getByRole("status")).toHaveText(longName);
  await stop.click();
  await expect(page.getByRole("status")).toHaveCSS("white-space", "normal");
  expect((await page.getByRole("status").boundingBox())!.height).toBeGreaterThan(40);
});

test("keyboard submission preserves focus during saving and allows continuous entry", async ({ page }) => {
  await seed(page, '["饺子"]');
  await openMenu(page);
  await page.evaluate(() => {
    void navigator.locks.request("foods", () => new Promise<void>((resolve) => { Reflect.set(window, "releaseFoodLock", resolve); }));
  });
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseFoodLock"))).toBe("function");
  const input = page.getByRole("textbox", { name: "新增菜品" });
  await input.fill("拉面");
  await input.press("Enter");
  await expect(input).toHaveAttribute("readonly");
  await expect(input).toBeFocused();
  await expect(page.getByRole("button", { name: "添加菜品", exact: true })).toBeDisabled();
  await page.keyboard.press("Enter");
  await expect(page.getByText("正在保存…", { exact: true })).toBeVisible();
  await page.evaluate(() => { Reflect.get(window, "releaseFoodLock")(); });
  await expect(page.getByText("正在保存…", { exact: true })).toHaveCount(0);
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await page.keyboard.type("米饭");
  await page.keyboard.press("Enter");
  await expect.poll(() => savedFoods(page)).toEqual(["饺子", "拉面", "米饭"]);
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  });
  await page.keyboard.type("米线");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByText(/菜单保存失败/)).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("米线");
  await expect(input).not.toHaveAttribute("readonly");
});

test("keyboard deletion focuses the next food, previous food or empty-menu input", async ({ page }) => {
  await seed(page, '["饺子","拉面","米饭"]');
  await openMenu(page);
  await page.getByRole("button", { name: "删除拉面", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "删除拉面", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "删除米饭", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "删除米饭", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "删除饺子", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "新增菜品" })).toBeFocused();
});

test("failed keyboard deletion keeps the food and restores its button focus", async ({ page }) => {
  await seed(page, '["饺子","拉面"]');
  await openMenu(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  });
  const remove = page.getByRole("button", { name: "删除拉面", exact: true });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByText(/菜单保存失败/)).toBeVisible();
  await expect(remove).toBeFocused();
  expect(await savedFoods(page)).toEqual(["饺子", "拉面"]);
});

test("closing the menu during deletion preserves focus on its trigger", async ({ page }) => {
  await seed(page, '["饺子","拉面"]');
  await openMenu(page);
  await page.evaluate(() => {
    void navigator.locks.request("foods", () => new Promise<void>((resolve) => { Reflect.set(window, "releaseDeleteLock", resolve); }));
  });
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseDeleteLock"))).toBe("function");
  const remove = page.getByRole("button", { name: "删除拉面", exact: true });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(remove).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => { Reflect.get(window, "releaseDeleteLock")(); });
  await expect.poll(() => savedFoods(page)).toEqual(["饺子"]);
  await expect(page.getByRole("button", { name: "编辑菜单" })).toBeFocused();
});

test("readding a deleted food does not resurrect the previous result", async ({ page }) => {
  await seed(page, '["饺子"]');
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.getByRole("button", { name: stopName, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("饺子");
  await openMenu(page);
  await page.getByRole("button", { name: "删除饺子", exact: true }).click();
  await expect.poll(() => savedFoods(page)).toEqual([]);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("status")).toBeEmpty();
  await openMenu(page);
  await addFood(page, "饺子");
  await expect.poll(() => savedFoods(page)).toEqual(["饺子"]);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("吃什么");
});

for (const fallback of ["missing", "corrupt"]) {
  test(`${fallback} storage cannot restart a draw when the default menu returns`, async ({ page, context }) => {
    await page.goto("/");
    const second = await context.newPage();
    await second.goto("/");
    await page.getByRole("button", { name: startName, exact: true }).click();
    await second.evaluate(() => localStorage.setItem("foods", '["米饭"]'));
    await expect(page.getByRole("button", { name: startName, exact: true })).toBeVisible();
    await page.evaluate(() => window.addEventListener("storage", (event) => {
      if (event.key === "foods" && (event.newValue === null || event.newValue === "{broken")) {
        document.body.dataset.fallbackReceived = "true";
      }
    }));
    await second.evaluate((kind) => {
      if (kind === "missing") localStorage.removeItem("foods");
      else localStorage.setItem("foods", "{broken");
    }, fallback);
    await expect(page.locator("body")).toHaveAttribute("data-fallback-received", "true");
    await expect(page.getByRole("button", { name: startName, exact: true })).toBeVisible();
    if (fallback === "corrupt") await expect(page.locator("main").getByText(/无法读取本地菜单/)).toBeVisible();
    await openMenu(page);
    await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(DEFAULT_FOODS.length);
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(page.getByRole("button", { name: startName, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: stopName, exact: true })).toHaveCount(0);
    await second.close();
  });
}

test("primary hover, validation and storage errors have readable contrast", async ({ page }) => {
  await seed(page, '["饺子"]');
  const primary = page.getByRole("button", { name: startName, exact: true });
  await primary.hover();
  await primary.evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((animation) => animation.finished));
  });
  expect(await contrastRatio(primary)).toBeGreaterThanOrEqual(4.5);
  await openMenu(page);
  await addFood(page, "   ");
  const inputError = page.locator('[data-slot="field-error"]');
  await expect(inputError).toBeVisible();
  expect(await contrastRatio(inputError)).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  });
  await addFood(page, "拉面");
  const saveError = page.getByRole("dialog").locator('[data-slot="alert-description"]');
  await expect(saveError).toBeVisible();
  expect(await contrastRatio(saveError)).toBeGreaterThanOrEqual(4.5);
});

test("storage errors do not overlap the selector on a short landscape screen", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await seed(page, "{broken");
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toBeVisible();
  const alertBox = (await alert.boundingBox())!;
  const selectorBox = (await page.getByRole("region", { name: "吃饭抽签" }).boundingBox())!;
  expect(alertBox.y + alertBox.height).toBeLessThanOrEqual(selectorBox.y);
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.getByRole("button", { name: stopName, exact: true }).click();
});

test("menu stays unchanged through starting, stopping and restarting the full draw pool", async ({ page }) => {
  await page.goto("/");
  const rows = page.locator(".menu-poster .paper-foods > li");
  await expect(rows).toHaveCount(6);
  const idle = await posterSnapshot(page);
  expect(new Set(idle.map((row) => row.text)).size).toBe(6);
  for (const row of idle) expect(DEFAULT_FOODS).toContain(row.text);
  await page.waitForTimeout(350);
  expect(await posterSnapshot(page)).toEqual(idle);
  // Deliberately choose a dish outside the visible preview.
  const index = DEFAULT_FOODS.findIndex((food) => !idle.some((row) => row.text === food));
  await page.evaluate((value) => { Math.random = () => value; }, (index + 0.5) / DEFAULT_FOODS.length);
  await page.getByRole("button", { name: startName, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(DEFAULT_FOODS[index]);
  await page.waitForTimeout(350);
  expect(await posterSnapshot(page)).toEqual(idle);
  await expect(page.locator("main header, main footer")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "我的菜单", exact: true }).getByRole("button", { name: "编辑菜单" })).toBeVisible();
  await page.getByRole("button", { name: stopName, exact: true }).click();
  expect(await posterSnapshot(page)).toEqual(idle);
  const stopped = await posterSnapshot(page);
  await page.waitForTimeout(400);
  expect(await posterSnapshot(page)).toEqual(stopped);
  await expect(page.getByRole("status")).toHaveText(DEFAULT_FOODS[index]);
  await page.evaluate(() => { Math.random = () => 0; });
  await page.getByRole("button", { name: "再选一次", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(DEFAULT_FOODS[0]);
  expect(await posterSnapshot(page)).toEqual(idle);
  await page.getByRole("button", { name: stopName, exact: true }).click();
  expect(await posterSnapshot(page)).toEqual(idle);
  expect(new Set((await posterSnapshot(page)).map((row) => row.text)).size).toBe(6);
});

test("reduced motion changes the candidate cadence live without changing the draw", async ({ page }) => {
  await seed(page, '["饺子","拉面"]');
  await page.evaluate(() => {
    let i = 0;
    Math.random = () => i++ % 2 ? 0 : 0.999999;
  });
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  // MediaQueryList change events follow real rendering, not Playwright's mocked clock.
  const sampleChanges = (duration: number) => page.getByRole("status").evaluate(async (node, duration) => {
    const changes: number[] = [];
    const observer = new MutationObserver(() => changes.push(performance.now()));
    observer.observe(node, { childList: true, subtree: true, characterData: true });
    await new Promise((resolve) => setTimeout(resolve, duration));
    observer.disconnect();
    return changes;
  }, duration);
  const reduced = await sampleChanges(1150);
  expect(reduced.length).toBeGreaterThanOrEqual(2);
  expect(reduced.length).toBeLessThanOrEqual(3);
  for (let i = 1; i < reduced.length; i++) expect(reduced[i] - reduced[i - 1]).toBeGreaterThan(350);
  expect(await page.locator(".menu-poster").evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect((await sampleChanges(450)).length).toBeGreaterThanOrEqual(3);
  await page.getByRole("button", { name: stopName, exact: true }).click();
});

test("one dish and an empty menu do not invent preview entries", async ({ page }) => {
  await seed(page, '["饺子"]');
  await expect(page.locator(".menu-poster .paper-foods > li")).toHaveCount(1);
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.getByRole("button", { name: stopName, exact: true }).click();
  await expect(page.locator(".menu-poster .paper-foods > li > span")).toHaveText("饺子");
  await openMenu(page);
  await page.getByRole("button", { name: "删除饺子", exact: true }).click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator(".menu-poster .paper-foods > li")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加菜品", exact: true })).toBeVisible();
});

test("opening the menu interrupts drawing and closing restores focus without restarting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: startName, exact: true }).click();
  await openMenu(page);
  await expect(page.getByRole("heading", { name: /我的菜单/ })).toBeFocused();
  const stopped = await posterSnapshot(page);
  await page.waitForTimeout(400);
  expect(await posterSnapshot(page)).toEqual(stopped);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "编辑菜单" })).toBeFocused();
  await expect(page.getByRole("button", { name: "再选一次", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: stopName, exact: true })).toHaveCount(0);
});

test("closing an empty menu restores focus to its actual opener", async ({ page }) => {
  await seed(page, "[]");
  const opener = page.getByRole("button", { name: "添加菜品", exact: true });
  for (const close of ["escape", "button"]) {
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: /我的菜单/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /我的菜单/ })).toBeFocused();
    if (close === "escape") await page.keyboard.press("Escape");
    else await page.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("reset confirmation is cancellable, keeps data and restores focus", async ({ page }) => {
  await seed(page, '["饺子","酸菜鱼"]');
  await openMenu(page);
  await page.getByRole("button", { name: "重置菜单", exact: true }).click();
  await expect(page.getByRole("button", { name: "保留菜单", exact: true })).toBeFocused();
  expect(await savedFoods(page)).toEqual(["饺子", "酸菜鱼"]);
  await page.getByRole("button", { name: "保留菜单", exact: true }).click();
  await expect(page.getByRole("button", { name: "重置菜单", exact: true })).toBeFocused();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(2);
  expect(await savedFoods(page)).toEqual(["饺子", "酸菜鱼"]);
});

test("menu opens as a centered paper with keyboard focus contained", async ({ page }) => {
  await page.goto("/");
  await openMenu(page);
  const viewport = page.viewportSize()!;
  await expect.poll(async () => {
    const box = (await page.getByRole("dialog").boundingBox())!;
    return Math.max(Math.abs(box.x + box.width / 2 - viewport.width / 2), Math.abs(box.y + box.height / 2 - viewport.height / 2));
  }).toBeLessThan(1);
  const dialogBox = (await page.getByRole("dialog").boundingBox())!;
  expect(dialogBox.x).toBeGreaterThan(0);
  expect(dialogBox.y).toBeGreaterThan(0);
  expect(dialogBox.y + dialogBox.height).toBeLessThan(viewport.height);
  const input = page.getByRole("textbox", { name: "新增菜品" });
  await expect(input).toBeVisible();
  expect(await input.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "关闭", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await expectNamedButtons(page);
});

test("desktop composition fits one screen without hiding content or repeating counts", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 }, { width: 1366, height: 768 },
    { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 1024, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    expect(await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > innerWidth,
      vertical: document.documentElement.scrollHeight > innerHeight,
    }))).toEqual({ horizontal: false, vertical: false });
    for (const selector of [".menu-stack", ".food-selector"]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    await expect(page.getByText(/展示.*道|道菜，随你选/)).toHaveCount(0);
    await page.getByRole("button", { name: startName, exact: true }).click();
    await page.getByRole("button", { name: stopName, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height);
  }
});

test("200 percent text sizing retains the main action and full result without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page, '["重庆招牌酸菜肥牛米线套餐加煎蛋不要香菜"]');
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  for (const button of await page.getByRole("button").all()) {
    expect(await button.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    })).toBe(true);
  }
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.getByRole("button", { name: stopName, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("重庆招牌酸菜肥牛米线套餐加煎蛋不要香菜");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "再选一次", exact: true })).toBeVisible();
  await openMenu(page);
  await expect(page.getByRole("textbox", { name: "新增菜品" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("large menus remain intact while the menu preview stays bounded", async ({ page }) => {
  const foods = Array.from({ length: 500 }, (_, i) => `第${i + 1}道家常菜`);
  await seed(page, JSON.stringify(foods));
  await page.getByRole("button", { name: startName, exact: true }).click();
  await expect(page.locator(".menu-poster .paper-foods > li")).toHaveCount(6);
  await page.getByRole("button", { name: stopName, exact: true }).click();
  expect(foods).toContain(await page.getByRole("status").innerText());
  await openMenu(page);
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(500);
  await page.getByRole("button", { name: "删除第500道家常菜", exact: true }).click();
  await expect.poll(async () => (await savedFoods(page) as string[]).length).toBe(499);
  await expect(page.getByRole("button", { name: "删除第1道家常菜", exact: true })).toHaveCount(1);
});

test("reset waits for the storage lock before leaving confirmation or replacing corrupt data", async ({ page }) => {
  await seed(page, "{broken");
  await openMenu(page);
  await page.evaluate(() => {
    void navigator.locks.request("foods", () => new Promise<void>((resolve) => { Reflect.set(window, "releaseResetLock", resolve); }));
  });
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseResetLock"))).toBe("function");
  await resetMenu(page);
  await expect(page.getByRole("button", { name: "确认重置", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("foods"))).toBe("{broken");
  await expect(page.getByRole("dialog", { name: "重置菜单？" })).toBeVisible();
  await expect(page.getByText("正在保存…", { exact: true })).toBeVisible();
  await page.evaluate(() => { Reflect.get(window, "releaseResetLock")(); });
  await expect(page.getByText("正在保存…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /我的菜单/ })).toBeVisible();
  expect(await savedFoods(page)).toEqual(DEFAULT_FOODS);
});

test("a pending reset saves without stealing focus from a reopened menu", async ({ page }) => {
  await seed(page, '["饺子"]');
  await openMenu(page);
  await page.evaluate(() => {
    void navigator.locks.request("foods", () => new Promise<void>((resolve) => { Reflect.set(window, "releaseResetLock", resolve); }));
  });
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseResetLock"))).toBe("function");
  await resetMenu(page);
  await expect(page.getByRole("button", { name: "确认重置", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openMenu(page);
  const input = page.getByRole("textbox", { name: "新增菜品" });
  await input.focus();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("readonly");
  await page.evaluate(() => { Reflect.get(window, "releaseResetLock")(); });
  await expect(input).not.toHaveAttribute("readonly");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(input).toBeFocused();
  expect(await savedFoods(page)).toEqual(DEFAULT_FOODS);
});

test("visibility changes pause drawing work and cannot revive a stopped draw", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const paused = await posterSnapshot(page);
  const candidate = await page.getByRole("status").innerText();
  await page.waitForTimeout(400);
  expect(await posterSnapshot(page)).toEqual(paused);
  await expect(page.getByRole("status")).toHaveText(candidate);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.getByRole("status").innerText()).not.toBe(candidate);
  expect(await posterSnapshot(page)).toEqual(paused);
  await page.getByRole("button", { name: stopName, exact: true }).click();
  const stopped = await posterSnapshot(page);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(350);
  expect(await posterSnapshot(page)).toEqual(stopped);
  await expect(page.getByRole("button", { name: stopName, exact: true })).toHaveCount(0);
});

test("rapid keyboard stop and restart leaves no old selection timers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: startName, exact: true }).click();
  await page.getByRole("button", { name: stopName, exact: true }).focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "再选一次", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: stopName, exact: true })).toBeFocused();
  }
  await page.keyboard.press("Enter");
  const stopped = await posterSnapshot(page);
  const result = await page.getByRole("status").innerText();
  await page.waitForTimeout(450);
  expect(await posterSnapshot(page)).toEqual(stopped);
  await expect(page.getByRole("status")).toHaveText(result);

});
