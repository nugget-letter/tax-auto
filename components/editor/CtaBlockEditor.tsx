"use client";

import type {
  CtaBlock,
  CtaFontSize,
  CtaHeight,
  CtaVariant,
  CtaWidth,
} from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: CtaBlock;
  onChange: (block: CtaBlock) => void;
};

const VARIANT_LABELS: Record<CtaVariant, string> = {
  filled: "배경 채우기",
  outline: "투명 배경 + 테두리",
};

const HEIGHT_LABELS: Record<CtaHeight, string> = { sm: "낮게", md: "보통", lg: "높게" };

const WIDTH_LABELS: Record<CtaWidth, string> = {
  auto: "글자 맞춤",
  wide: "넓게 (80%)",
  full: "꽉 채우기",
};

const FONT_SIZE_LABELS: Record<CtaFontSize, string> = {
  sm: "작게",
  md: "보통",
  lg: "크게",
  xl: "아주 크게",
};

export default function CtaBlockEditor({ block, onChange }: Props) {
  const variant = block.variant ?? "filled";

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
        <label className="text-xs font-medium text-gray-500">버튼 스타일</label>
        <select
          value={variant}
          onChange={(e) => onChange({ ...block, variant: e.target.value as CtaVariant })}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {Object.entries(VARIANT_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">
          {variant === "outline" ? "테두리 색상" : "버튼 색상"}
        </label>
        <input
          type="color"
          value={block.color}
          onChange={(e) => onChange({ ...block, color: e.target.value })}
          className="h-8 w-12"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">높이</label>
          <select
            value={block.height ?? "md"}
            onChange={(e) => onChange({ ...block, height: e.target.value as CtaHeight })}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {Object.entries(HEIGHT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">너비</label>
          <select
            value={block.width ?? "full"}
            onChange={(e) => onChange({ ...block, width: e.target.value as CtaWidth })}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {Object.entries(WIDTH_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">글씨 크기</label>
          <select
            value={block.fontSize ?? "md"}
            onChange={(e) => onChange({ ...block, fontSize: e.target.value as CtaFontSize })}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {Object.entries(FONT_SIZE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
