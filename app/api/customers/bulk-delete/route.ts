import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { bulkDeleteSchema } from "@/lib/customers/types";
import { deleteCustomers } from "@/lib/customers/repository";
import { requireAdminSession } from "@/lib/auth/session";

// DELETE는 본문을 실어 보내는 게 표준적이지 않아서, 여러 id를 받는 이 엔드포인트만 POST로 둔다.
export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteCustomers(parsed.data.ids);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[customers] 일괄 삭제 실패", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
