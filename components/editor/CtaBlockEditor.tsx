"use client";

import type { CtaBlock } from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: CtaBlock;
  onChange: (block: CtaBlock) => void;
};

export default function CtaBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-500">CTA 버튼</p>
      <input
        type="text"
        placeholder="버튼 텍스트 (예: 상담 신청하기)"
        value={block.label}
        onChange={(e) => onChange({ ...block, label: e.target.value })}
        className="glass-field focus-flame w-full px-3 py-2 text-sm"
      />
      <input
        type="text"
        placeholder="링크 (https://... 또는 tel:01012345678)"
        value={block.href}
        onChange={(e) => onChange({ ...block, href: e.target.value })}
        className="glass-field focus-flame w-full px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">버튼 색상</label>
        <input
          type="color"
          value={block.color}
          onChange={(e) => onChange({ ...block, color: e.target.value })}
          className="glass-field focus-flame h-8 w-12"
        />
      </div>
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
