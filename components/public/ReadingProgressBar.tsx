"use client";

import { useEffect, useRef, useState } from "react";

export default function ReadingProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollable <= 0) {
        setVisible(false);
        return;
      }

      setVisible(true);

      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    }

    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 z-50 h-[3px] w-full origin-left bg-navy-950"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
