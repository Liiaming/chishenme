"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { random } from "@/lib/foods";
import { getFoodsSnapshot, getInitialFoodsSnapshot, subscribeFoods } from "@/lib/food-store";
import { FoodSelector } from "@/components/food-selector";
import { SettingsDialog } from "@/components/settings-dialog";
import { RandomizedBackground } from "@/components/randomized-background";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Home() {
  const { foods, error } = useSyncExternalStore(subscribeFoods, getFoodsSnapshot, getInitialFoodsSnapshot);
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
      <header className="app-header">
        <h1 className="wordmark">吃什么<span aria-hidden="true">？</span></h1>
        <SettingsDialog foods={foods} error={error} open={menuOpen} onOpenChange={changeMenu} />
      </header>
      {error && (
        <Alert variant="destructive" className="storage-notice" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="drawing-stage">
        <RandomizedBackground foods={foods} running={running} settled={!!food && !running} paused={menuOpen} />
        <FoodSelector food={food} running={running} empty={!foods.length} onToggle={toggleSelection} onAdd={() => changeMenu(true)} />
      </div>
    </main>
  );
}
