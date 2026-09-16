import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { submissionSchema } from "@/lib/customers/types";
import { createCustomer } from "@/lib/customers/repository";
import { getPageBySlug } from "@/lib/pages/repository";

// 공개 엔드포인트 — 인증 없음. 발행된 페이지의 폼에서만 받는다.
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

  const page = await getPageBySlug(parsed.data.pageSlug);
  // 발행되지 않은(임시저장/보관) 페이지는 존재를 노출하지 않고 404로 응답한다.
  if (!page || page.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await createCustomer({
      name: parsed.data.name,
      office: parsed.data.office,
      phone: parsed.data.phone,
      email: parsed.data.email,
      consented: parsed.data.consented,
      source: page.title,
      status: "new",
      trialStartedOn: null,
      kakaoAdminSetOn: null,
      reminded1On: null,
      reminded2On: null,
      memo: "",
      sourcePageId: page.id,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[submissions] 저장 실패", error);
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }
}
