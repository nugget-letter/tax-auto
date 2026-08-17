"use client";

import { useState } from "react";
import type { BannerBlock } from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: BannerBlock;
  onChange: (block: BannerBlock) => void;
};

export default function BannerBlockEditor({ block, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });

      if (!response.ok) {
        setError(
          response.status === 401
            ? "세션이 만료되었어요. 다시 로그인해주세요."
            : "업로드에 실패했어요. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      const result = (await response.json()) as { url?: string };

      if (!result.url) {
        setError("업로드에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      onChange({ ...block, imageUrl: result.url });
    } catch {
      setError("업로드에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">배너 이미지</p>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
      {uploading && <p className="text-xs text-gray-400">업로드 중...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {block.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.imageUrl} alt="" className="h-32 w-full rounded object-cover" />
      )}
      <input
        type="text"
        placeholder="오버레이 제목 (선택)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <input
        type="text"
        placeholder="부제 (선택)"
        value={block.subtitle ?? ""}
        onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
