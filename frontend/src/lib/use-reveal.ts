"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll reveal for the landing page (see the [data-reveal] rules in globals.css). A block that is
 * already on screen at load is left alone, so reloading never blinks; one that starts below the
 * fold is hidden while off screen and shown once it scrolls in. `onShow` runs when it is shown,
 * or right away with `false` (no animation) when it was on screen from the start.
 */
export function useReveal<T extends HTMLElement>(onShow?: (animate: boolean) => void) {
  const ref = useRef<T>(null);
  const callback = useRef(onShow);
  useEffect(() => {
    callback.current = onShow;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      callback.current?.(false);
      return;
    }
    el.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        callback.current?.(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
