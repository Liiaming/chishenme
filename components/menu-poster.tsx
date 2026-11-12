import type { ReactNode } from "react";

function MenuPaperContent({ foods, children }: { foods: readonly string[]; children?: ReactNode }) {
  return (
    <>
      <div className="paper-heading">
        <h2>我的菜单</h2>
        {children ?? <span className="paper-heading-spacer" />}
      </div>
      <ul className="paper-foods">
        {foods.map((name) => <li key={name}><span>{name}</span></li>)}
      </ul>
      {!foods.length && <p className="paper-empty">你喜欢的菜，<br />都可以写进来。</p>}
    </>
  );
}

export function MenuPoster({ foods, children }: { foods: readonly string[]; children: ReactNode }) {
  const count = Math.min(6, foods.length);
  const preview = Array.from({ length: count }, (_, index) =>
    foods[count === 1 ? 0 : Math.floor(index * (foods.length - 1) / (count - 1))]);
  const backFoods = foods.filter((name) => !preview.includes(name)).slice(0, 12);
  return (
    <div className="menu-stack">
      <div className="menu-paper menu-back menu-back-far" aria-hidden="true">
        {!!backFoods.length && <MenuPaperContent foods={backFoods.slice(0, 6)} />}
      </div>
      <div className="menu-paper menu-back menu-back-near" aria-hidden="true">
        {backFoods.length > 6 && <MenuPaperContent foods={backFoods.slice(6, 12)} />}
      </div>
      <section className="menu-paper menu-poster" aria-label="我的菜单">
        <MenuPaperContent foods={preview}>{children}</MenuPaperContent>
      </section>
    </div>
  );
}
