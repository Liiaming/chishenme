import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_FOODS, normalizeFoods, parseFoods, random } from "../lib/foods.ts";

test("missing storage uses the default menu without requiring a browser", () => {
  assert.equal(parseFoods(null), DEFAULT_FOODS);
});

test("saved menus trim names, discard blanks and remove duplicates", () => {
  assert.deepEqual(parseFoods('[" 饺子 ","","  ","拉面","饺子"]'), ["饺子", "拉面"]);
  assert.deepEqual(parseFoods("[]"), []);
});

test("malformed JSON and values other than string arrays are rejected", () => {
  for (const value of ["{broken", "null", "{}", '"饺子"', "[1]", '["饺子",null]']) {
    assert.throws(() => parseFoods(value), value);
  }
  assert.throws(() => normalizeFoods(undefined));
});

test("random selection includes both ends and handles an empty menu", (context) => {
  const foods = ["饺子", "拉面"];
  context.mock.method(Math, "random", () => 0);
  assert.equal(random(foods), "饺子");
  assert.equal(random([]), undefined);
  context.mock.method(Math, "random", () => 0.9999999999999999);
  assert.equal(random(foods), "拉面");
});
