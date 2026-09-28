import { useCallback, useRef } from "react";

const SPEED = 2.2; // wheel delta multiplier
const EASE = 0.22; // per-frame catch-up fraction — higher = snappier

/**
 * Lets the mouse wheel drive a horizontal scroller. Returns a callback ref,
 * so the listener attaches whenever the element actually mounts — a
 * useEffect([]) misses rows that first render a loading state.
 *
 * Needs a native listener with passive: false: React's synthetic onWheel is
 * passive, so preventDefault() there is ignored and the page scrolls too.
 * At either end of the row the wheel is released back to the page.
 */
export function useWheelScroll<T extends HTMLElement = HTMLDivElement>() {
  // Scroll position the row is easing towards. Rapid wheel ticks accumulate
  // into one target instead of each restarting a fresh smooth scroll.
  const targetLeft = useRef(0);
  const frame = useRef<number | null>(null);

  return useCallback((el: T | null) => {
    if (!el) return;

    // Tracked as a float: the browser rounds scrollLeft, so sub-pixel steps
    // written to it get dropped and the ease would never reach its target.
    let pos = el.scrollLeft;

    function step() {
      const diff = targetLeft.current - pos;
      if (Math.abs(diff) < 1) {
        el!.scrollLeft = targetLeft.current;
        frame.current = null;
        return;
      }
      pos += diff * EASE;
      el!.scrollLeft = pos;
      frame.current = requestAnimationFrame(step);
    }

    function handleWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el!.scrollWidth - el!.clientWidth;
      if (max <= 0) return;

      const from = frame.current === null ? el!.scrollLeft : targetLeft.current;
      const atStart = from <= 0 && e.deltaY < 0;
      const atEnd = from >= max - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;

      e.preventDefault();
      targetLeft.current = Math.min(Math.max(from + e.deltaY * SPEED, 0), max);
      if (frame.current === null) {
        pos = el!.scrollLeft; // pick up drags / arrow clicks since last run
        frame.current = requestAnimationFrame(step);
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, []);
}
