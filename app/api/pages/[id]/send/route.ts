import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pageSendSchema } from "@/lib/pages/types";
import { updatePageSend } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";

// 전송 기록만 따로 저장한다. 에디터 저장(PATCH /api/pages/[id])은 블록 전체를
// 덮어쓰므로, 두 화면이 서로의 변경을 지우지 않도록 엔드포인트를 분리한다.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = pageSendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const page = await updatePageSend(id, parsed.data);
    if (!page) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    console.error("[pages] 전송 기록 저장 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
