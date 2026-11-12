import { memo, useEffect, useRef } from "react";

type Spot = { x: number; y: number; width: number; height: number };

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const RandomizedBackground = memo(function RandomizedBackground({ foods, running, settled, paused }: {
  foods: readonly string[];
  running: boolean;
  settled: boolean;
  paused: boolean;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current!;
    if (paused || (settled && !running) || !foods.length) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nodes = Array.from(field.children) as HTMLElement[];
    const selector = field.parentElement!.querySelector<HTMLElement>(".food-selector")!;
    const positions = new Map<HTMLElement, Spot>();
    let spots: Spot[] = [];
    let active: HTMLElement[] = [];
    let timer: ReturnType<typeof setTimeout>;
    let geometry = "";

    function place(node: HTMLElement, spot: Spot, animated: boolean) {
      const index = nodes.indexOf(node);
      const word = node.firstElementChild as HTMLElement;
      const letters = Math.min(Array.from(word.textContent ?? "").length, 5) || 1;
      const jitter = animated ? Math.random() : 0.5;
      const size = Math.min([26, 36, 48][index % 3], spot.height * 0.68, (spot.width - 32) / letters);
      const inset = 6 + jitter * Math.min(20, spot.width * 0.12);
      node.style.left = `${spot.x + inset}px`;
      node.style.top = `${spot.y + Math.max(0, (spot.height - size * 1.2) / 2)}px`;
      node.style.maxWidth = `${spot.width - 32}px`;
      node.style.fontSize = `${size}px`;
      node.style.opacity = `${[0.24, 0.36, 0.5][index % 3]}`;
      positions.set(node, spot);
      word.getAnimations().forEach((animation) => animation.cancel());
      if (animated) {
        word.animate([
          { opacity: 0, transform: `translateY(${index % 2 ? -12 : 12}px)` },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 140, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      }
    }

    function layout() {
      if (preference.matches || document.hidden) return;
      const bounds = field.getBoundingClientRect();
      const center = selector.getBoundingClientRect();
      const top = center.top - bounds.top;
      const bottom = center.bottom - bounds.top;
      const left = center.left - bounds.left;
      const right = center.right - bounds.left;
      const nextGeometry = [bounds.width, bounds.height, top, bottom, left, right].join(":");
      if (geometry === nextGeometry) return;
      geometry = nextGeometry;
      const regions: Spot[] = [
        { x: 8, y: 8, width: bounds.width - 16, height: top - 24 },
        { x: 8, y: bottom + 16, width: bounds.width - 16, height: bounds.height - bottom - 24 },
        { x: 8, y: top, width: left - 24, height: bottom - top },
        { x: right + 16, y: top, width: bounds.width - right - 24, height: bottom - top },
      ];
      const groups = regions.filter((region) => region.width >= 88 && region.height >= 36).map((region) => {
        const columns = Math.max(1, Math.floor(region.width / 180));
        const rows = Math.max(1, Math.floor(region.height / 68));
        return shuffle(Array.from({ length: columns * rows }, (_, i) => ({
          x: region.x + (i % columns) * region.width / columns,
          y: region.y + Math.floor(i / columns) * region.height / rows,
          width: region.width / columns,
          height: region.height / rows,
        })));
      });
      // Interleave the perimeter regions so a small menu cannot all land in one corner.
      spots = Array.from({ length: Math.max(0, ...groups.map((group) => group.length)) }, (_, i) =>
        groups.flatMap((group) => group[i] ? [group[i]] : [])).flat();
      const limit = bounds.width < 640 ? 9 : 18;
      const count = Math.min(nodes.length, spots.length, running ? limit : Math.ceil(limit / 2));
      active = nodes.slice(0, count);
      nodes.forEach((node, i) => { node.hidden = i >= count; });
      positions.clear();
      const targets = running ? shuffle(spots.slice(0, count)) : spots;
      const names = shuffle(foods).slice(0, count);
      active.forEach((node, i) => {
        node.firstElementChild!.textContent = names[i];
        place(node, targets[i], running);
      });
    }

    function schedule() {
      timer = setTimeout(() => {
        const batch = shuffle(active).slice(0, 2 + Math.floor(Math.random() * 3));
        const occupied = new Set(active.filter((node) => !batch.includes(node)).map((node) => positions.get(node)));
        const targets = shuffle(spots.filter((spot) => !occupied.has(spot)));
        if (targets.length > 1) batch.forEach((node, i) => {
          if (positions.get(node) === targets[i]) {
            const next = (i + 1) % targets.length;
            [targets[i], targets[next]] = [targets[next], targets[i]];
          }
        });
        const names = new Set(active.map((node) => node.textContent));
        batch.forEach((node, i) => {
          names.delete(node.textContent);
          const candidates = foods.filter((name) => !names.has(name));
          const name = candidates[Math.floor(Math.random() * candidates.length)];
          node.firstElementChild!.textContent = name;
          names.add(name);
          place(node, targets[i], true);
        });
        schedule();
      }, 160 + Math.random() * 120);
    }

    function synchronize() {
      clearTimeout(timer);
      if (preference.matches || document.hidden) {
        nodes.forEach((node) => node.firstElementChild!.getAnimations().forEach((animation) => animation.cancel()));
        return;
      }
      layout();
      if (running) schedule();
    }

    const observer = new ResizeObserver(layout);
    observer.observe(field);
    observer.observe(selector);
    preference.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    synchronize();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      preference.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
      nodes.forEach((node) => node.firstElementChild!.getAnimations().forEach((animation) => animation.cancel()));
    };
  }, [foods, running, settled, paused]);

  return (
    <div
      ref={fieldRef}
      className="food-field"
      data-state={paused ? "paused" : running ? "running" : settled ? "settled" : "idle"}
      aria-hidden="true"
    >
      {foods.slice(0, 18).map((food) => (
        <span key={food} className="food-word"><span>{food}</span></span>
      ))}
    </div>
  );
});
