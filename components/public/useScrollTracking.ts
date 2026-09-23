"use client";

import { useCallback, useEffect, useRef } from "react";
import { crossedMilestones } from "@/lib/analytics/depth";
import { getReaderId, randomId, sendTrack } from "@/lib/analytics/reader";
import { MAX_DWELL_MS } from "@/lib/analytics/types";

/**
 * 스크롤 도달률과 체류시간을 기록한다.
 *
 * 스크롤 계산은 하지 않는다 — ReadingProgressBar가 이미 rAF 루프에서 진행률을
 * 구하고 있어서, 리스너를 하나 더 만드는 대신 그 값을 report()로 받는다.
 *
 * 전송 시점은 세 가지다: 마운트 직후(진입), 마일스톤 최초 통과, 이탈.
 */
export function useScrollTracking(slug: string) {
  const visitIdRef = useRef("");
  const readerIdRef = useRef<string | null>(null);
  const depthRef = useRef(0);

  // 체류시간은 화면이 보이는 동안만 쌓는다. 카카오톡에서 다른 대화방에 갔다가
  // 돌아오는 시간을 읽은 시간으로 치면 평균이 의미를 잃는다.
  const dwellRef = useRef(0);
  const visibleSinceRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const currentDwell = useCallback(() => {
    const open = visibleSinceRef.current === null ? 0 : Date.now() - visibleSinceRef.current;
    return Math.min(MAX_DWELL_MS, dwellRef.current + open);
  }, []);

  const send = useCallback(
    (depth: number) => {
      if (!visitIdRef.current) return;
      sendTrack({
        slug,
        visitId: visitIdRef.current,
        readerId: readerIdRef.current,
        depth: depth as 0 | 25 | 50 | 75 | 100,
        dwellMs: currentDwell(),
      });
    },
    [slug, currentDwell]
  );

  useEffect(() => {
    visitIdRef.current = randomId();
    readerIdRef.current = getReaderId();
    visibleSinceRef.current = Date.now();

    // 진입을 먼저 1행으로 남긴다. 이후 갱신이 유실되더라도 "열어는 봤다"는 사실은
    // 남는다 — 카카오톡 인앱 브라우저는 종료 시점 전송 유실이 잦다.
    send(0);

    function finish() {
      if (finishedRef.current) return;
      finishedRef.current = true;
      send(depthRef.current);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        // 누적을 확정하고 타이머를 멈춘다.
        if (visibleSinceRef.current !== null) {
          dwellRef.current += Date.now() - visibleSinceRef.current;
          visibleSinceRef.current = null;
        }
        finish();
        return;
      }
      // 돌아왔다면 계속 읽을 수 있으므로 타이머와 전송 플래그를 되살린다.
      visibleSinceRef.current = Date.now();
      finishedRef.current = false;
    }

    // 카카오톡 인앱 브라우저의 X 버튼 종료 시 iOS에서는 pagehide만 발생하는
    // 경우가 있어 둘 다 건다. beforeunload는 iOS에서 신뢰할 수 없어 쓰지 않는다.
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", finish);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", finish);
    };
  }, [send]);

  /** ReadingProgressBar의 rAF 루프가 매 프레임 호출한다. 새 마일스톤일 때만 전송한다. */
  return useCallback(
    (progress: number) => {
      const crossed = crossedMilestones(depthRef.current, progress);
      if (crossed.length === 0) return;

      // 한 번에 여러 지점을 지났어도 서버가 greatest()로 최대값만 남기므로
      // 가장 깊은 지점 하나만 보내면 된다.
      depthRef.current = crossed[crossed.length - 1];
      send(depthRef.current);
    },
    [send]
  );
}
