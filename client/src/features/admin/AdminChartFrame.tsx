import { cloneElement, useLayoutEffect, useRef, useState, type ReactElement } from "react";

export function AdminChartFrame({ children, height = 288 }: { children: ReactElement; height?: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const next = Math.floor(element.getBoundingClientRect().width);
      // Animated/hidden panels can report zero temporarily. Retain the last usable canvas.
      if (next > 0) setWidth((previous) => previous === next ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return <div ref={frame} className="w-full min-w-0 overflow-hidden" style={{ height, minWidth: 0 }}>
    {cloneElement(children as ReactElement<{ width: number; height: number }>, { width, height })}
  </div>;
}

export function AdminChartEmpty({ message = "No dated spreadsheet records are available for this chart." }: { message?: string }) {
  return <div role="status" className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-forest-100 px-5 text-center text-sm text-charcoal/70 dark:border-white/15 dark:text-white/70">{message}</div>;
}
