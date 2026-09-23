"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollTracking } from "./useScrollTracking";

export default function ReadingProgressBar({ slug }: { slug: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [visible, setVisible] = useState(false);
  // 스크롤 진행률은 여기서만 계산한다. 트래킹은 리스너를 새로 걸지 않고
  // 아래 update()에서 이 콜백으로 같은 값을 넘겨받는다.
  const report = useScrollTracking(slug);

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
        // 화면에 다 들어오는 페이지는 스크롤이 없어 진행률이 영원히 0이다.
        // 그대로 두면 짧은 페이지가 전부 "0% 이탈"로 집계되므로 완독으로 본다.
        report(1);
        return;
      }

      setVisible(true);

      // The progress denominator still uses innerHeight so the bar reaches
      // exactly 1.0 at the true bottom once the toolbar has collapsed.
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressRef.current = progress;
      report(progress);
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
  }, [report]);

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
