"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { random } from "@/lib/foods";
import { getFoodsSnapshot, getInitialFoodsSnapshot, subscribeFoods } from "@/lib/food-store";
import { FoodSelector } from "@/components/food-selector";
import { SettingsDialog } from "@/components/settings-dialog";
import { RandomizedBackground } from "@/components/randomized-background";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Home() {
  const { foods, error } = useSyncExternalStore(subscribeFoods, getFoodsSnapshot, getInitialFoodsSnapshot);
  const [selection, setSelection] = useState({ foods, food: "", running: false });
  if (selection.foods !== foods) {
    setSelection({ foods, running: false, food: foods.includes(selection.food) ? selection.food : "" });
  }
  const { food, running } = selection;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const food = random(foods) ?? "";
      setSelection((current) => current.running && current.foods === foods ? { ...current, food } : current);
    }, 30);
    return () => clearInterval(timer);
  }, [running, foods]);

  function toggleSelection() {
    if (running) {
      setSelection({ ...selection, running: false });
    } else if (foods.length) {
      setSelection({ foods, food: random(foods) ?? "", running: true });
    }
  }

  return (
    <main className="relative isolate flex min-h-svh w-full flex-col items-center justify-center gap-6 overflow-hidden p-6">
      {running && <RandomizedBackground foods={foods} />}
      {error && (
        <Alert variant="destructive" className="max-w-sm" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FoodSelector food={food} running={running} empty={!foods.length} onToggle={toggleSelection} />
      <SettingsDialog foods={foods} error={error} onOpen={() => setSelection((current) => ({ ...current, running: false }))} />
    </main>
  );
}
