import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPage, getPageById, SlugConflictError } from "@/lib/pages/repository";
import { generateSlug } from "@/lib/pages/slug";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const original = await getPageById(id);

  if (!original) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const duplicate = await createPage({
      title: `${original.title} (사본)`,
      slug: generateSlug(),
      status: "draft",
      blocks: original.blocks,
    });
    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    if (error instanceof SlugConflictError) {
      console.error("[pages] 복제 중 슬러그 중복", error);
      return NextResponse.json(
        { error: "slug_conflict", message: "슬러그 생성 중 충돌이 발생했어요. 다시 시도해주세요." },
        { status: 409 }
      );
    }
    console.error("[pages] 복제 실패", error);
    return NextResponse.json({ error: "duplicate_failed" }, { status: 500 });
  }
}
