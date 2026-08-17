"use client";

import type { Block } from "@/lib/pages/types";
import BannerBlockEditor from "./BannerBlockEditor";
import TextBlockEditor from "./TextBlockEditor";
import CtaBlockEditor from "./CtaBlockEditor";
import DividerBlockEditor from "./DividerBlockEditor";

export type EditableBlock = Block & { _key: string };

function createDefaultBlock(type: Block["type"]): Block {
  if (type === "banner") return { type: "banner", imageUrl: "", title: "", subtitle: "" };
  if (type === "text") return { type: "text", heading: "", bodyHtml: "<p></p>" };
  if (type === "cta") return { type: "cta", label: "상담 신청하기", href: "", color: "#FEE500" };
  return { type: "divider" };
}

type Props = {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
};

export default function BlockList({ blocks, onChange }: Props) {
  function updateBlock(index: number, block: Block) {
    onChange(blocks.map((b, i) => (i === index ? { ...block, _key: b._key } : b)));
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addBlock(type: Block["type"]) {
    onChange([...blocks, { ...createDefaultBlock(type), _key: crypto.randomUUID() }]);
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={block._key} className="relative">
          <div className="mb-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => moveBlock(index, -1)}
              disabled={index === 0}
              className="text-xs disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveBlock(index, 1)}
              disabled={index === blocks.length - 1}
              className="text-xs disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeBlock(index)}
              className="text-xs text-red-600"
            >
              블록 삭제
            </button>
          </div>
          {block.type === "banner" && (
            <BannerBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
          )}
          {block.type === "text" && (
            <TextBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
          )}
          {block.type === "cta" && (
            <CtaBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
          )}
          {block.type === "divider" && (
            <DividerBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => addBlock("banner")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 배너 이미지
        </button>
        <button
          type="button"
          onClick={() => addBlock("text")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 본문 텍스트
        </button>
        <button
          type="button"
          onClick={() => addBlock("cta")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + CTA 버튼
        </button>
        <button
          type="button"
          onClick={() => addBlock("divider")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 구분선
        </button>
      </div>
    </div>
  );
}
