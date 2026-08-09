import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/session";

// 파일명은 신뢰할 수 없다(경로 조각이 스토리지 키에 섞여 들어갈 수 있음).
// MIME 타입에서 확장자를 유도하고, 모르는 타입은 png로 떨어뜨린다.
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const DEFAULT_EXTENSION = "png";

export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const extension = EXTENSION_BY_MIME[file.type] ?? DEFAULT_EXTENSION;
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("banner-images")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("[upload] Supabase Storage 업로드 실패", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from("banner-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
