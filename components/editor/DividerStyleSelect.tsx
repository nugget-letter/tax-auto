"use client";

import type { DividerStyle } from "@/lib/pages/types";
import { DIVIDER_STYLE_PRESETS, DEFAULT_DIVIDER_STYLE } from "@/lib/pages/dividerStyle";

type Props = {
  value: DividerStyle | undefined;
  onChange: (value: DividerStyle) => void;
};

export default function DividerStyleSelect({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500">구분선 스타일</label>
      <select
        value={value ?? DEFAULT_DIVIDER_STYLE}
        onChange={(e) => onChange(e.target.value as DividerStyle)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {Object.entries(DIVIDER_STYLE_PRESETS).map(([id, preset]) => (
          <option key={id} value={id}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
