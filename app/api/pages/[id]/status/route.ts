import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { pageStatusSchema } from "@/lib/pages/types";
import { updatePageStatus } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";

const bodySchema = z.object({ status: pageStatusSchema });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const page = await updatePageStatus(id, parsed.data.status);
    return NextResponse.json(page);
  } catch (error) {
    console.error("[pages] 상태 변경 실패", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
