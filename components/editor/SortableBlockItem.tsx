"use client";

import type { Block } from "@/lib/pages/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BannerBlockEditor from "./BannerBlockEditor";
import TextBlockEditor from "./TextBlockEditor";
import CtaBlockEditor from "./CtaBlockEditor";
import DividerBlockEditor from "./DividerBlockEditor";

export type EditableBlock = Block & { _key: string };

type Props = {
  block: EditableBlock;
  onChange: (block: Block) => void;
  onRemove: () => void;
};

export default function SortableBlockItem({ block, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="mb-1 flex items-center justify-end gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mr-auto cursor-grab text-sm text-gray-400 active:cursor-grabbing"
          aria-label="블록 순서 변경 핸들"
        >
          ⠿
        </button>
        <button type="button" onClick={onRemove} className="text-xs text-red-600">
          블록 삭제
        </button>
      </div>
      {block.type === "banner" && <BannerBlockEditor block={block} onChange={onChange} />}
      {block.type === "text" && <TextBlockEditor block={block} onChange={onChange} />}
      {block.type === "cta" && <CtaBlockEditor block={block} onChange={onChange} />}
      {block.type === "divider" && <DividerBlockEditor block={block} onChange={onChange} />}
    </div>
  );
}
