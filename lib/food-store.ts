"use client";

import { DEFAULT_FOODS, normalizeFoods, parseFoods, STORAGE_KEY } from "./foods";

type Snapshot = { foods: readonly string[]; error: string; loaded: boolean };
const initialSnapshot: Snapshot = { foods: DEFAULT_FOODS, error: "", loaded: false };
let snapshot = initialSnapshot;
const listeners = new Set<() => void>();

function readFoods(): Snapshot {
  try {
    return { foods: parseFoods(localStorage.getItem(STORAGE_KEY)), error: "", loaded: true };
  } catch {
    return {
      foods: DEFAULT_FOODS,
      loaded: true,
      error: "无法读取本地菜单，已使用默认菜单。请检查浏览器存储权限，或重置损坏的菜单。",
    };
  }
}

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function subscribeFoods(listener: () => void) {
  listeners.add(listener);
  const refresh = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) publish(readFoods());
  };
  window.addEventListener("storage", refresh);
  publish(readFoods());
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", refresh);
  };
}

export const getFoodsSnapshot = () => snapshot;
export const getInitialFoodsSnapshot = () => initialSnapshot;

export async function updateFoods(
  update: readonly string[] | ((foods: readonly string[]) => readonly string[]),
): Promise<boolean> {
  if (!navigator.locks) {
    publish({ ...snapshot, error: "请通过 HTTPS 或 localhost 打开网站，以安全保存菜单。" });
    return false;
  }
  try {
    // Serialize read-modify-write across tabs; storage events alone cannot prevent lost updates.
    await navigator.locks.request(STORAGE_KEY, () => {
      const foods = normalizeFoods(typeof update === "function"
        ? update(parseFoods(localStorage.getItem(STORAGE_KEY)))
        : update);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
      publish({ foods, error: "", loaded: true });
    });
    return true;
  } catch {
    publish({ ...snapshot, error: "菜单保存失败，修改尚未保存。请检查浏览器存储权限、可用空间，或重置损坏的菜单后重试。" });
    return false;
  }
}
