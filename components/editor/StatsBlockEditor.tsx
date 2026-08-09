"use client";

import type { StatsBlock } from "@/lib/pages/types";

type Props = {
  block: StatsBlock;
  onChange: (block: StatsBlock) => void;
};

export default function StatsBlockEditor({ block, onChange }: Props) {
  function updateItem(index: number, field: "number" | "label", value: string) {
    const items = block.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange({ ...block, items });
  }

  function addItem() {
    if (block.items.length >= 4) return;
    onChange({ ...block, items: [...block.items, { number: "", label: "" }] });
  }

  function removeItem(index: number) {
    if (block.items.length <= 2) return;
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">숫자 카드</p>
      {block.items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder="숫자 (예: 6가지)"
            value={item.number}
            onChange={(e) => updateItem(index, "number", e.target.value)}
            className="w-1/3 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="설명"
            value={item.label}
            onChange={(e) => updateItem(index, "label", e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            disabled={block.items.length <= 2}
            className="rounded px-2 text-xs text-red-600 disabled:opacity-30"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        disabled={block.items.length >= 4}
        className="text-xs text-blue-600 disabled:opacity-30"
      >
        + 카드 추가
      </button>
    </div>
  );
}
