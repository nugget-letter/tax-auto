"use client";

import { useEffect, useRef, useState } from "react";
import type { ScrollEffect } from "@/lib/pages/types";

type Props = {
  effect: ScrollEffect | undefined;
  children: React.ReactNode;
};

// "idle"은 JS가 아직 개입하지 않은 초기 상태 — 서버 렌더링 그대로 보이는 상태다.
// 마운트 후에만 "hidden"으로 전환해 애니메이션을 준비하므로, JS가 늦게 로드되거나
// 실행되지 않아도 콘텐츠가 안 보이는 사고가 나지 않는다(progressive enhancement).
type State = "idle" | "hidden" | "revealed";

export default function ScrollReveal({ effect, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (!effect || effect === "none") return;

    const node = ref.current;
    if (!node) return;

    setState("hidden");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("revealed");
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [effect]);

  if (!effect || effect === "none") return <>{children}</>;

  return (
    <div ref={ref} className="scroll-reveal" data-effect={effect} data-state={state}>
      {children}
    </div>
  );
}
