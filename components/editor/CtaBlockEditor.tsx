"use client";

import type { CtaBlock } from "@/lib/pages/types";

type Props = {
  block: CtaBlock;
  onChange: (block: CtaBlock) => void;
};

export default function CtaBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">CTA 버튼</p>
      <input
        type="text"
        placeholder="버튼 텍스트 (예: 상담 신청하기)"
        value={block.label}
        onChange={(e) => onChange({ ...block, label: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <input
        type="text"
        placeholder="링크 (https://... 또는 tel:01012345678)"
        value={block.href}
        onChange={(e) => onChange({ ...block, href: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">버튼 색상</label>
        <input
          type="color"
          value={block.color}
          onChange={(e) => onChange({ ...block, color: e.target.value })}
          className="h-8 w-12"
        />
      </div>
    </div>
  );
}
