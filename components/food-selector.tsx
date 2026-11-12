import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FoodSelector({ food, running, empty, onToggle }: {
  food: string;
  running: boolean;
  empty: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="relative flex w-full max-w-lg flex-col items-center gap-4 text-center" aria-label="吃饭抽签">
      <h1 className="text-5xl">{running || !food ? "吃什么?" : "吃这个!"}</h1>
      <p
        className={cn("min-h-10 w-full text-3xl font-bold text-foreground", running ? "h-10 truncate" : "wrap-anywhere")}
        role="status"
        aria-live={running ? "off" : "polite"}
        aria-atomic="true"
      >
        {food}
      </p>
      {empty && <p className="text-sm text-muted-foreground">菜单为空，请先在设置中添加菜品。</p>}
      <Button size="lg" disabled={empty} onClick={onToggle}>
        {running ? "结束" : "开始"}
      </Button>
    </section>
  );
}
