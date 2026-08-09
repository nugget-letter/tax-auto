"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";

const FONT_SIZES = ["14px", "16px", "20px", "24px"];

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    // 저장 시 sanitizer(lib/sanitize.ts)가 허용하는 태그는 p/br/strong/em/span/mark 뿐이라
    // 그 외 노드는 마크다운/단축키로 입력해도 저장 때 래퍼가 벗겨져 내용이 조용히 뭉개진다.
    // 그래서 툴바가 실제로 노출하는 기능(굵게/기울임/글자 크기/강조)만 남기고 비활성화한다.
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      TextStyleKit,
      Highlight,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded border border-gray-300">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 text-sm font-bold ${editor.isActive("bold") ? "bg-gray-200" : ""}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 text-sm italic ${editor.isActive("italic") ? "bg-gray-200" : ""}`}
        >
          I
        </button>
        <select
          className="rounded border border-gray-200 px-1 text-sm"
          defaultValue="default"
          onChange={(e) => {
            const size = e.target.value;
            if (size === "default") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(size).run();
            }
          }}
        >
          <option value="default">글자 크기</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#FFF3A3" }).run()}
          className={`rounded px-2 py-1 text-sm ${editor.isActive("highlight") ? "bg-gray-200" : ""}`}
        >
          강조
        </button>
      </div>
      <EditorContent editor={editor} className="rich-text p-3 text-sm" />
    </div>
  );
}
