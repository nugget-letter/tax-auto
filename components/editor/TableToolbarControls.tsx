"use client";

import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
};

export default function TableToolbarControls({ editor }: Props) {
  return (
    <>
      <button
        type="button"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200"
      >
        표 삽입
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!editor.can().addRowAfter()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        행 추가
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!editor.can().deleteRow()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        행 삭제
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!editor.can().addColumnAfter()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        열 추가
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!editor.can().deleteColumn()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        열 삭제
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        disabled={!editor.can().deleteTable()}
        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        표 삭제
      </button>
    </>
  );
}
