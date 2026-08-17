"use client";

import type { TextBlock } from "@/lib/pages/types";
import RichTextEditor from "./RichTextEditor";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
};

export default function TextBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">본문 텍스트</p>
      <input
        type="text"
        placeholder="소제목 (선택)"
        value={block.heading ?? ""}
        onChange={(e) => onChange({ ...block, heading: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <RichTextEditor
        value={block.bodyHtml}
        onChange={(bodyHtml) => onChange({ ...block, bodyHtml })}
      />
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
