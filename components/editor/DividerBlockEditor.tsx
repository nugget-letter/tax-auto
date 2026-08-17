"use client";

import type { DividerBlock } from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";
import DividerStyleSelect from "./DividerStyleSelect";

type Props = {
  block: DividerBlock;
  onChange: (block: DividerBlock) => void;
};

export default function DividerBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">구분선</p>
      <DividerStyleSelect
        value={block.style}
        onChange={(style) => onChange({ ...block, style })}
      />
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
