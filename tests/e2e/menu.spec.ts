import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEFAULT_FOODS } from "../../lib/foods";

async function seed(page: Page, value: string) {
  await page.goto("/");
  await page.evaluate((raw) => localStorage.setItem("foods", raw), value);
  await page.reload();
}

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "打开菜单设置" }).click();
  await expect(page.getByRole("dialog", { name: "菜单" })).toBeVisible();
}

async function addFood(page: Page, food: string) {
  await page.getByRole("textbox", { name: "新增菜品" }).fill(food);
  await page.getByRole("button", { name: "添加菜品", exact: true }).click();
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

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => { throw error; });
  page.on("console", (message) => {
    if (message.type() === "error") throw new Error(message.text());
  });
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
  await page.getByRole("button", { name: "开始", exact: true }).click();
  const stop = page.getByRole("button", { name: "结束", exact: true });
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

test("blank input is rejected, deleting the last item disables drawing, and reset recovers", async ({ page }) => {
  await seed(page, '["饺子"]');
  await openMenu(page);
  await addFood(page, "   ");
  await expect(page.getByText("请输入菜名，不能只填写空格。")).toBeVisible();
  expect(await savedFoods(page)).toEqual(["饺子"]);
  await page.getByRole("button", { name: "删除饺子", exact: true }).click();
  await expect.poll(() => savedFoods(page)).toEqual([]);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("button", { name: "开始", exact: true })).toBeDisabled();
  await expect(page.getByText("菜单为空，请先在设置中添加菜品。")).toBeVisible();
  await openMenu(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "重置菜单", exact: true }).click();
  await expect.poll(() => savedFoods(page)).toEqual(DEFAULT_FOODS);
});

for (const raw of ["{broken", "null", "{}", "[1]"]) {
  test(`invalid storage ${raw} falls back without crashing and can be reset`, async ({ page }) => {
    await seed(page, raw);
    await expect(page.getByText(/无法读取本地菜单/)).toBeVisible();
    await openMenu(page);
    await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(DEFAULT_FOODS.length);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "重置菜单", exact: true }).click();
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
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await page.getByRole("button", { name: "结束", exact: true }).click();
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
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "重置菜单", exact: true }).click();
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
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await openMenu(second);
  await second.getByRole("button", { name: "删除饺子", exact: true }).click();
  await expect(page.getByRole("button", { name: "开始", exact: true })).toBeDisabled();
  await expect(page.getByRole("status")).toBeEmpty();
  await addFood(second, "米饭");
  await expect(page.getByRole("button", { name: "开始", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "结束", exact: true })).toHaveCount(0);
  await second.close();
});

test("result contrast, button names, long names and reduced motion remain accessible", async ({ page }) => {
  await seed(page, JSON.stringify(["很长的菜名".repeat(40)]));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await expect(page.locator('main > [aria-hidden="true"]')).toBeHidden();
  await page.getByRole("button", { name: "结束", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await contrastRatio(page.getByRole("status"))).toBeGreaterThanOrEqual(3);
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
  await page.getByRole("button", { name: "开始", exact: true }).click();
  const stop = page.getByRole("button", { name: "结束", exact: true });
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
  await page.evaluate(() => { Reflect.get(window, "releaseFoodLock")(); });
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

test("readding a deleted food does not resurrect the previous result", async ({ page }) => {
  await seed(page, '["饺子"]');
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await page.getByRole("button", { name: "结束", exact: true }).click();
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("吃什么?");
});

for (const fallback of ["missing", "corrupt"]) {
  test(`${fallback} storage cannot restart a draw when the default menu returns`, async ({ page, context }) => {
    await page.goto("/");
    const second = await context.newPage();
    await second.goto("/");
    await page.getByRole("button", { name: "开始", exact: true }).click();
    await second.evaluate(() => localStorage.setItem("foods", '["米饭"]'));
    await expect(page.getByRole("button", { name: "开始", exact: true })).toBeVisible();
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
    await expect(page.getByRole("button", { name: "开始", exact: true })).toBeVisible();
    if (fallback === "corrupt") await expect(page.locator("main").getByText(/无法读取本地菜单/)).toBeVisible();
    await openMenu(page);
    await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(DEFAULT_FOODS.length);
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(page.getByRole("button", { name: "开始", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "结束", exact: true })).toHaveCount(0);
    await second.close();
  });
}

for (const dark of [false, true]) {
  test(`${dark ? "dark" : "light"} validation and storage errors have readable contrast`, async ({ page }) => {
    await seed(page, '["饺子"]');
    await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
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
}

test("storage errors do not overlap the selector on a short landscape screen", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await seed(page, "{broken");
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toBeVisible();
  const alertBox = (await alert.boundingBox())!;
  const selectorBox = (await page.getByRole("region", { name: "吃饭抽签" }).boundingBox())!;
  expect(alertBox.y + alertBox.height).toBeLessThanOrEqual(selectorBox.y);
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await page.getByRole("button", { name: "结束", exact: true }).click();
});
