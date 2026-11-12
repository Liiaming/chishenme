import { memo } from "react";

export const RandomizedBackground = memo(function RandomizedBackground({ foods }: { foods: readonly string[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {foods.map((food, i) => (
        <span
          key={food}
          className="absolute animate-[food-drift_6s_ease-in-out_infinite_alternate] text-2xl whitespace-nowrap text-muted-foreground/40 blur-[2px]"
          style={{ top: `${(i * 37) % 95}%`, left: `${(i * 61) % 95}%`, animationDelay: `${-i % 6}s` }}
        >
          {food}
        </span>
      ))}
    </div>
  );
});
