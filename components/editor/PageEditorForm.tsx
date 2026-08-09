"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Block, PageRecord, PageStatus } from "@/lib/pages/types";
import BlockList, { type EditableBlock } from "./BlockList";

function withKeys(blocks: Block[]): EditableBlock[] {
  return blocks.map((block) => ({ ...block, _key: crypto.randomUUID() }));
}

function stripKeys(blocks: EditableBlock[]): Block[] {
  return blocks.map((block) => {
    const clone: Record<string, unknown> = { ...block };
    delete clone._key;
    return clone as Block;
  });
}

type Props = {
  mode: "create" | "edit";
  initialSlug: string;
  initialPage?: PageRecord;
};

export default function PageEditorForm({ mode, initialSlug, initialPage }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPage?.title ?? "");
  const [slug, setSlug] = useState(initialPage?.slug ?? initialSlug);
  const [ctaLabel, setCtaLabel] = useState(initialPage?.ctaLabel ?? "상담 신청하기");
  const [ctaHref, setCtaHref] = useState(initialPage?.ctaHref ?? "");
  const [ctaColor, setCtaColor] = useState(initialPage?.ctaColor ?? "#FEE500");
  const [blocks, setBlocks] = useState<EditableBlock[]>(withKeys(initialPage?.blocks ?? []));
  const [saving, setSaving] = useState<PageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(status: PageStatus) {
    setSaving(status);
    setError(null);

    const payload = {
      title,
      slug,
      status,
      blocks: stripKeys(blocks),
      ctaLabel,
      ctaHref,
      ctaColor,
    };

    const url = mode === "create" ? "/api/pages" : `/api/pages/${initialPage!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError("저장에 실패했어요. 값을 확인하고 다시 시도해주세요.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("저장에 실패했어요. 값을 확인하고 다시 시도해주세요.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">URL 슬러그 (/c/{slug})</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {initialPage?.status === "published" && (
          <p className="text-xs text-amber-600">
            이미 발행된 페이지예요. 슬러그를 바꾸면 이미 발송된 카카오 메시지의 링크가 깨져요.
          </p>
        )}
      </div>

      <BlockList blocks={blocks} onChange={setBlocks} />

      <div className="space-y-2 border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700">CTA 버튼</label>
        <input
          type="text"
          placeholder="버튼 텍스트 (예: 상담 신청하기)"
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="링크 (https://... 또는 tel:01012345678)"
          value={ctaHref}
          onChange={(e) => setCtaHref(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">버튼 색상</label>
          <input
            type="color"
            value={ctaColor}
            onChange={(e) => setCtaColor(e.target.value)}
            className="h-8 w-12"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={saving !== null}
          className="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving === "draft" ? "저장 중..." : "임시저장"}
        </button>
        <button
          type="button"
          onClick={() => save("published")}
          disabled={saving !== null}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving === "published" ? "발행 중..." : "발행"}
        </button>
      </div>
    </div>
  );
}
