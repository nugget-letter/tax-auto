"use client";

import { useEffect, useRef, useState } from "react";

export default function ReadingProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    function update() {
      const doc = document.documentElement;
      // Gate visibility on the layout viewport (clientHeight), which doesn't
      // shift when a mobile browser's toolbar collapses/expands. Using
      // window.innerHeight here would make the bar appear on short pages
      // whenever the toolbar retracts.
      const isVisible = doc.scrollHeight > doc.clientHeight;

      if (!isVisible) {
        setVisible(false);
        return;
      }

      setVisible(true);

      // The progress denominator still uses innerHeight so the bar reaches
      // exactly 1.0 at the true bottom once the toolbar has collapsed.
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressRef.current = progress;
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

    // Watch for content-height changes that don't fire a window resize event
    // (late-loading banner images with no intrinsic size, swap-in web fonts).
    const resizeObserver = new ResizeObserver(onScrollOrResize);
    resizeObserver.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Re-apply the last computed progress once the bar mounts, since the
  // update() call that flips `visible` to true runs before barRef is
  // attached, and would otherwise be silently dropped.
  useEffect(() => {
    if (visible && barRef.current) {
      barRef.current.style.transform = `scaleX(${progressRef.current})`;
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 z-50 h-[3px] w-full origin-left bg-navy-950"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
