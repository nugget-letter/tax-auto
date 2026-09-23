import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { trackSchema } from "@/lib/analytics/types";
import { recordPageView } from "@/lib/analytics/repository";
import { getPageBySlug } from "@/lib/pages/repository";

/**
 * 공개 페이지의 열람 기록을 받는다.
 *
 * 인증을 붙일 수 없다 — 공개 페이지에서 호출하므로 /api/submissions의 공유 토큰
 * 방식을 쓰면 클라이언트에 그대로 노출된다. 방어선은 "발행된 슬러그만 허용"과
 * 스키마의 값 범위 제한까지이고, 작정하고 숫자를 부풀리는 것은 막지 못한다.
 * 내부 지표용이라 이 수준을 적정선으로 본다.
 *
 * 응답은 전부 본문 없이 보낸다 — sendBeacon은 응답을 읽지 않는다.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = trackSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(null, { status: 400 });
  }

  const page = await getPageBySlug(parsed.data.slug);

  // 미발행 페이지(어드민 미리보기)는 집계에 섞지 않는다.
  if (!page || page.status !== "published") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    await recordPageView(page.id, parsed.data);
  } catch (error) {
    // 클라이언트가 할 수 있는 일이 없고 beacon은 재시도하지 않는다.
    // 로그만 남기고 성공으로 응답한다.
    console.error("[track] 저장 실패", error);
  }

  return new NextResponse(null, { status: 204 });
}
