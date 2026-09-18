"use client";

import { FORM_BLOCK_DEFAULTS, type Block } from "@/lib/pages/types";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableBlockItem, { type EditableBlock } from "./SortableBlockItem";

export type { EditableBlock };

function createDefaultBlock(type: Block["type"]): Block {
  if (type === "banner") return { type: "banner", imageUrl: "", title: "", subtitle: "" };
  if (type === "text") return { type: "text", heading: "", bodyHtml: "<p></p>" };
  if (type === "cta") return { type: "cta", label: "상담 신청하기", href: "", color: "#FEE500" };
  if (type === "form") return { type: "form", ...FORM_BLOCK_DEFAULTS };
  return { type: "divider" };
}

type Props = {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
};

export default function BlockList({ blocks, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hasFormBlock = blocks.some((b) => b.type === "form");

  function updateBlock(index: number, block: Block) {
    onChange(blocks.map((b, i) => (i === index ? { ...block, _key: b._key } : b)));
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function addBlock(type: Block["type"]) {
    onChange([...blocks, { ...createDefaultBlock(type), _key: crypto.randomUUID() }]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b._key === active.id);
    const newIndex = blocks.findIndex((b) => b._key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <DndContext id="block-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b._key)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => (
            <SortableBlockItem
              key={block._key}
              block={block}
              onChange={(b) => updateBlock(index, b)}
              onRemove={() => removeBlock(index)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2 border-t border-black/8 pt-3">
        <button
          type="button"
          onClick={() => addBlock("banner")}
          className="btn-quiet focus-flame px-3 py-1 text-sm"
        >
          + 배너 이미지
        </button>
        <button
          type="button"
          onClick={() => addBlock("text")}
          className="btn-quiet focus-flame px-3 py-1 text-sm"
        >
          + 본문 텍스트
        </button>
        <button
          type="button"
          onClick={() => addBlock("cta")}
          className="btn-quiet focus-flame px-3 py-1 text-sm"
        >
          + CTA 버튼
        </button>
        <button
          type="button"
          onClick={() => addBlock("divider")}
          className="btn-quiet focus-flame px-3 py-1 text-sm"
        >
          + 구분선
        </button>
        <button
          type="button"
          onClick={() => addBlock("form")}
          disabled={hasFormBlock}
          title={hasFormBlock ? "신청 폼은 페이지당 하나만 넣을 수 있어요" : undefined}
          className="btn-quiet focus-flame px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          + 신청 폼
        </button>
      </div>
    </div>
  );
}
