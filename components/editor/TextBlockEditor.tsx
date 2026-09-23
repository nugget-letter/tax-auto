"use client";

import type { HeadingFont, HeadingSize, TextBlock } from "@/lib/pages/types";
import RichTextEditor from "./RichTextEditor";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
};

const HEADING_FONT_LABELS: Record<HeadingFont, string> = {
  "noto-serif-kr": "노토세리프 KR (기본)",
  "noto-sans-kr": "노토산스 KR",
  "nanum-gothic": "나눔고딕",
  "nanum-myeongjo": "나눔명조",
  "gothic-a1": "고딕 A1",
  pretendard: "프리텐다드",
};

const HEADING_SIZE_LABELS: Record<HeadingSize, string> = {
  sm: "작게",
  md: "보통",
  lg: "크게",
  xl: "아주 크게",
};

export default function TextBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-500">본문 텍스트</p>
      <input
        type="text"
        placeholder="소제목 (선택)"
        value={block.heading ?? ""}
        onChange={(e) => onChange({ ...block, heading: e.target.value })}
        className="glass-field focus-flame w-full px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">소제목 글꼴</label>
          <select
            value={block.headingFont ?? "noto-serif-kr"}
            onChange={(e) => onChange({ ...block, headingFont: e.target.value as HeadingFont })}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {Object.entries(HEADING_FONT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">크기</label>
          <select
            value={block.headingSize ?? "md"}
            onChange={(e) => onChange({ ...block, headingSize: e.target.value as HeadingSize })}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {Object.entries(HEADING_SIZE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">색상</label>
          <input
            type="color"
            value={block.headingColor ?? "#111827"}
            onChange={(e) => onChange({ ...block, headingColor: e.target.value })}
            className="glass-field focus-flame h-8 w-12"
          />
        </div>
      </div>
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
