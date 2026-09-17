import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { submissionSchema } from "@/lib/customers/types";
import { createCustomer } from "@/lib/customers/repository";
import { getPageBySlug } from "@/lib/pages/repository";

const TOKEN_HEADER = "x-submission-token";

/**
 * 외부 사이트(tax-sales의 Apps Script)가 보낸 요청인지 확인한다.
 * 길이가 다르면 timingSafeEqual이 던지므로 먼저 걸러낸다.
 */
function hasValidToken(request: NextRequest): boolean {
  const expected = process.env.SUBMISSION_TOKEN;
  if (!expected) return false;

  const provided = request.headers.get(TOKEN_HEADER);
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// 공개 엔드포인트. 우리 랜딩페이지 폼은 pageSlug로, 외부 사이트는 공유 토큰으로 들어온다.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // honeypot에 값이 있으면 봇. 저장하지 않고 성공한 척 응답해서 봇이 재시도하지 않게 한다.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const { pageSlug } = parsed.data;

  // 슬러그가 없으면 외부 유입이다. 토큰 없이 아무나 쓰는 통로가 되지 않도록 막는다.
  if (!pageSlug && !hasValidToken(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const page = pageSlug ? await getPageBySlug(pageSlug) : null;
  // 발행되지 않은(임시저장/보관) 페이지는 존재를 노출하지 않고 404로 응답한다.
  if (pageSlug && (!page || page.status !== "published")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await createCustomer({
      name: parsed.data.name,
      office: parsed.data.office,
      phone: parsed.data.phone,
      email: parsed.data.email,
      consented: parsed.data.consented,
      // 우리 페이지에서 왔으면 페이지 제목이 곧 유입경로다. 외부 유입은 보낸 쪽이
      // 알려준 값을 쓰되, 비어 있으면 어디서 왔는지 모르는 채로 남기지 않는다.
      source: page ? page.title : parsed.data.source || "외부 신청",
      status: "new",
      trialStartedOn: null,
      kakaoAdminSetOn: null,
      reminded1On: null,
      reminded2On: null,
      memo: "",
      sourcePageId: page ? page.id : null,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[submissions] 저장 실패", error);
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }
}
