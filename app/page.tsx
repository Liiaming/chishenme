"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { random } from "@/lib/foods";
import { getFoodsSnapshot, getInitialFoodsSnapshot, subscribeFoods } from "@/lib/food-store";
import { FoodSelector } from "@/components/food-selector";
import { SettingsDialog } from "@/components/settings-dialog";
import { MenuPoster } from "@/components/menu-poster";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Home() {
  const { foods, error, loaded } = useSyncExternalStore(subscribeFoods, getFoodsSnapshot, getInitialFoodsSnapshot);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selection, setSelection] = useState({ foods, food: "", running: false });
  if (selection.foods !== foods) {
    setSelection({ foods, running: false, food: foods.includes(selection.food) ? selection.food : "" });
  }
  const { food, running } = selection;

  useEffect(() => {
    if (!running) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval>;
    function startTimer() {
      clearInterval(timer);
      if (document.hidden) return;
      timer = setInterval(() => {
        if (document.hidden) return;
        const food = random(foods) ?? "";
        setSelection((current) => current.running && current.foods === foods ? { ...current, food } : current);
      }, preference.matches ? 500 : 80);
    }
    startTimer();
    preference.addEventListener("change", startTimer);
    document.addEventListener("visibilitychange", startTimer);
    return () => {
      clearInterval(timer);
      preference.removeEventListener("change", startTimer);
      document.removeEventListener("visibilitychange", startTimer);
    };
  }, [running, foods]);

  function toggleSelection() {
    if (running) setSelection({ ...selection, running: false });
    else if (foods.length) setSelection({ foods, food: random(foods) ?? "", running: true });
  }

  const changeMenu = useCallback((open: boolean) => {
    if (open) setSelection((current) => ({ ...current, running: false }));
    setMenuOpen(open);
  }, []);

  return (
    <main className="app-shell">
      <h1 className="sr-only">吃什么</h1>
      <noscript>
        <style>{".menu-loading { display: none; }"}</style>
        <p className="m-auto p-8 text-center">请启用 JavaScript 后使用抽签和菜单编辑功能。</p>
      </noscript>
      {error && (
        <Alert variant="destructive" className="storage-notice" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loaded ? <div className="drawing-stage">
        <FoodSelector food={food} running={running} empty={!foods.length} onToggle={toggleSelection} onAdd={() => changeMenu(true)} />
        <MenuPoster foods={foods}>
          <SettingsDialog foods={foods} error={error} open={menuOpen} onOpenChange={changeMenu} />
        </MenuPoster>
      </div> : <p className="menu-loading m-auto p-8 text-center" role="status">正在读取菜单…</p>}
    </main>
  );
}
