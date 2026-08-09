import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pageInputSchema } from "@/lib/pages/types";
import { createPage } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizePageInputHtml } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pageInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const page = await createPage(sanitizePageInputHtml(parsed.data));
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("[pages] 생성 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
