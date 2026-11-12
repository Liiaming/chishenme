import { Button } from "@/components/ui/button";

export function FoodSelector({ food, running, empty, onToggle, onAdd }: {
  food: string;
  running: boolean;
  empty: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <section className="food-selector" aria-label="吃饭抽签">
      <p className="selection-label">{running ? "正在选" : food ? "选好了" : ""}</p>
      <div className="selection-stage" data-settled={!!food && !running}>
        {!food && (
          <p className="selection-question">
            {empty ? <>菜单<br />还是空的</> : <>今天<br />吃什么？</>}
          </p>
        )}
        <p
          className="selection-result"
          data-running={running}
          role="status"
          aria-label={food && !running ? "选中的菜品" : undefined}
          aria-live={running ? "off" : "polite"}
          aria-atomic="true"
          tabIndex={food && !running ? 0 : undefined}
        >
          {food}
        </p>
      </div>
      <p className="selection-hint">{empty ? "先加几道喜欢的菜。" : ""}</p>
      <Button size="draw" onClick={empty ? onAdd : onToggle}>
        {empty ? "添加菜品" : running ? "停，就吃这个" : food ? "再选一次" : "开始选"}
      </Button>
    </section>
  );
}
