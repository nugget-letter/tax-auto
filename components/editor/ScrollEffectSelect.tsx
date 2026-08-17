"use client";

import type { ScrollEffect } from "@/lib/pages/types";

const OPTIONS: { value: ScrollEffect; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "fade", label: "페이드인" },
  { value: "fade-up", label: "페이드인 + 상승" },
  { value: "slide-left", label: "슬라이드 (왼쪽에서)" },
  { value: "slide-right", label: "슬라이드 (오른쪽에서)" },
  { value: "scale", label: "확대" },
];

type Props = {
  value: ScrollEffect | undefined;
  onChange: (value: ScrollEffect) => void;
};

export default function ScrollEffectSelect({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500">스크롤 효과</label>
      <select
        value={value ?? "none"}
        onChange={(e) => onChange(e.target.value as ScrollEffect)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
