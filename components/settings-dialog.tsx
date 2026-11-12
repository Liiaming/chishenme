"use client";

import { useRef, useState } from "react";
import { Plus, Settings, X } from "lucide-react";
import { DEFAULT_FOODS } from "@/lib/foods";
import { updateFoods } from "@/lib/food-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SettingsDialog({ foods, error, onOpen }: {
  foods: readonly string[];
  error: string;
  onOpen: () => void;
}) {
  const [newFood, setNewFood] = useState("");
  const [inputError, setInputError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save(update: Parameters<typeof updateFoods>[0]) {
    setSaving(true);
    const saved = await updateFoods(update);
    setSaving(false);
    return saved;
  }

  return (
    <Dialog onOpenChange={(open) => { if (open) onOpen(); }}>
      <DialogTrigger asChild>
        <Button size="icon-lg" variant="outline" className="fixed right-4 bottom-4" aria-label="打开菜单设置">
          <Settings aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>菜单</DialogTitle>
          <DialogDescription>菜单仅保存在当前浏览器，可添加、删除或重置菜品。</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" aria-live="polite">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <ScrollArea className="h-[min(40svh,24rem)] rounded-lg border" aria-label="当前菜品">
          <ul className="flex flex-col gap-2 p-3">
            {foods.map((food) => (
              <li key={food} className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 wrap-anywhere">{food}</span>
                <Button
                  size="icon" variant="ghost" disabled={saving} aria-label={`删除${food}`}
                  onClick={() => void save((current) => current.filter((item) => item !== food))}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <form onSubmit={async (event) => {
          event.preventDefault();
          if (saving) return;
          const name = newFood.trim();
          if (!name) {
            setInputError("请输入菜名，不能只填写空格。");
            inputRef.current?.focus();
            return;
          }
          if (await save((current) => [...current, name])) {
            setNewFood("");
            setInputError("");
          }
        }}>
          <FieldGroup>
            <Field data-invalid={!!inputError}>
              <FieldLabel htmlFor="new-food">新增菜品</FieldLabel>
              <Input
                ref={inputRef} id="new-food" name="food" autoComplete="off" placeholder="例如：饺子…"
                value={newFood} readOnly={saving} aria-invalid={!!inputError}
                aria-describedby={inputError ? "food-input-error" : undefined}
                onChange={(event) => { setNewFood(event.target.value); setInputError(""); }}
              />
              {inputError && <FieldError id="food-input-error">{inputError}</FieldError>}
            </Field>
          </FieldGroup>
          <Button type="submit" className="mt-3 w-full" disabled={saving}>
            <Plus data-icon="inline-start" aria-hidden="true" />添加菜品
          </Button>
        </form>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => {
            if (window.confirm("重置将替换当前菜单，是否继续？")) void save(DEFAULT_FOODS);
          }}>重置菜单</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
