"use client";

import { memo, useRef, useState } from "react";
import { List, Plus, X } from "lucide-react";
import { DEFAULT_FOODS } from "@/lib/foods";
import { updateFoods } from "@/lib/food-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export const SettingsDialog = memo(function SettingsDialog({ foods, error, open, onOpenChange }: {
  foods: readonly string[];
  error: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [newFood, setNewFood] = useState("");
  const [inputError, setInputError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  async function save(update: Parameters<typeof updateFoods>[0]) {
    setSaving(true);
    const saved = await updateFoods(update);
    setSaving(false);
    return saved;
  }

  function returnToMenu() {
    setConfirmReset(false);
    requestAnimationFrame(() => resetRef.current?.focus());
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) setConfirmReset(false);
      onOpenChange(next);
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="ml-auto" aria-label="打开菜单设置">
          <List data-icon="inline-start" aria-hidden="true" />菜单
          <span className="menu-count" aria-hidden="true">{foods.length}</span>
        </Button>
      </DialogTrigger>
      <DialogContent variant="menu" onOpenAutoFocus={(event) => {
        event.preventDefault();
        titleRef.current?.focus();
      }}>
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1}>
            {confirmReset ? "重置菜单？" : <>我的菜单<span className="menu-count">{foods.length} 道</span></>}
          </DialogTitle>
          <DialogDescription>
            {confirmReset ? "重置将替换当前菜单，此操作不能撤销。" : "只保存在当前浏览器。"}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" aria-live="polite">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {confirmReset ? (
          <div className="reset-confirmation">
            <p>用默认的 {DEFAULT_FOODS.length} 道菜替换当前菜单？自己添加的菜品也会被移除。</p>
            <div className="reset-actions">
              <Button ref={cancelRef} variant="outline" disabled={saving} onClick={returnToMenu}>保留菜单</Button>
              <Button disabled={saving} onClick={async () => {
                if (await save(DEFAULT_FOODS)) returnToMenu();
              }}>确认重置</Button>
            </div>
          </div>
        ) : (
          <>
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
                  <div className="new-food-row">
                    <Input
                      ref={inputRef} id="new-food" name="food" autoComplete="off" placeholder="例如：酸菜鱼…"
                      value={newFood} readOnly={saving} aria-invalid={!!inputError}
                      aria-describedby={inputError ? "food-input-error" : undefined}
                      onChange={(event) => { setNewFood(event.target.value); setInputError(""); }}
                    />
                    <Button type="submit" disabled={saving} aria-label="添加菜品">
                      <Plus data-icon="inline-start" aria-hidden="true" />添加
                    </Button>
                  </div>
                  {inputError && <FieldError id="food-input-error">{inputError}</FieldError>}
                </Field>
              </FieldGroup>
            </form>
            <ScrollArea className="menu-list" aria-label="当前菜品">
              <ul className="menu-foods">
                {foods.map((food) => (
                  <li key={food}>
                    <span>{food}</span>
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
            <Button ref={resetRef} variant="ghost" className="menu-reset" disabled={saving} onClick={() => {
              setConfirmReset(true);
              requestAnimationFrame(() => cancelRef.current?.focus());
            }}>重置菜单</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
