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
      <p className="selection-label">{running ? "正在选…" : food ? "今天就吃" : "到饭点了。"}</p>
      <div className="selection-stage" data-settled={!!food && !running}>
        {!food && (
          <p className="selection-question">
            {empty ? <>菜单<br />还是空的</> : <>今天<br />吃什么。</>}
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
      <Button variant="poster" size="draw" onClick={empty ? onAdd : onToggle}>
        {empty ? "添加菜品" : running ? "停，就吃这个" : food ? "再选一次" : "开始选"}
      </Button>
      <p className="selection-hint">{empty ? "先加几道喜欢的菜。" : running ? "随时喊停，看看吃什么。" : food ? "不合胃口？再选一次。" : "选一会儿，亲手停下来。"}</p>
    </section>
  );
}
