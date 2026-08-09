import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pageInputSchema } from "@/lib/pages/types";
import { updatePage, SlugConflictError } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizePageInputHtml } from "@/lib/sanitize";

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
  const parsed = pageInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const page = await updatePage(id, sanitizePageInputHtml(parsed.data));
    return NextResponse.json(page);
  } catch (error) {
    if (error instanceof SlugConflictError) {
      console.error("[pages] 슬러그 중복", error);
      return NextResponse.json(
        { error: "slug_conflict", message: "이미 사용 중인 슬러그예요. 다른 값을 입력해주세요." },
        { status: 409 }
      );
    }
    console.error("[pages] 수정 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
