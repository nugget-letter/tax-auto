"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { LetterSpacing } from "@/lib/tiptap/letterSpacing";
import { TextAlign } from "@/lib/tiptap/textAlign";
import { DividerNode } from "@/lib/tiptap/dividerNode";
import { DIVIDER_STYLE_PRESETS } from "@/lib/pages/dividerStyle";
import type { DividerStyle } from "@/lib/pages/types";

const FONT_SIZES = ["14px", "16px", "20px", "24px"];

const FONT_FAMILIES = [
  { label: "노토산스 KR (기본)", value: "var(--font-noto-sans-kr)" },
  { label: "노토세리프 KR (세리프)", value: "var(--font-noto-serif-kr)" },
  { label: "나눔고딕", value: "var(--font-nanum-gothic)" },
  { label: "나눔명조", value: "var(--font-nanum-myeongjo)" },
  { label: "고딕 A1", value: "var(--font-gothic-a1)" },
];

const LETTER_SPACINGS = [
  { label: "좁게", value: "-0.05em" },
  { label: "약간 좁게", value: "-0.02em" },
  { label: "약간 넓게", value: "0.05em" },
  { label: "넓게", value: "0.1em" },
];

const LINE_HEIGHTS = [
  { label: "좁게 (1)", value: "1" },
  { label: "보통 (1.5)", value: "1.5" },
  { label: "넓게 (1.8)", value: "1.8" },
  { label: "아주 넓게 (2.2)", value: "2.2" },
];

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    // 저장 시 sanitizer(lib/sanitize.ts)가 허용하는 태그는 p/br/strong/em/span/mark 뿐이라
    // 그 외 노드는 마크다운/단축키로 입력해도 저장 때 래퍼가 벗겨져 내용이 조용히 뭉개진다.
    // 그래서 툴바가 실제로 노출하는 기능만 남기고 비활성화한다. 글꼴/색상/자간/행간은 모두
    // textStyle 마크가 span style=""로 렌더링하므로 별도 태그 허용이 필요 없다.
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: false,
      }),
      TextStyleKit.configure({
        backgroundColor: false,
      }),
      LetterSpacing,
      TextAlign,
      Highlight,
      DividerNode,
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
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-1">
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
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`rounded px-2 py-1 text-sm underline ${editor.isActive("underline") ? "bg-gray-200" : ""}`}
        >
          U
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`rounded px-2 py-1 text-sm line-through ${editor.isActive("strike") ? "bg-gray-200" : ""}`}
        >
          S
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
        <select
          className="rounded border border-gray-200 px-1 text-sm"
          defaultValue="default"
          onChange={(e) => {
            const value = e.target.value;
            if (value === "default") {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
        >
          <option value="default">글꼴</option>
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-gray-200 px-1 text-sm"
          defaultValue="default"
          onChange={(e) => {
            const value = e.target.value;
            if (value === "default") {
              editor.chain().focus().unsetLetterSpacing().run();
            } else {
              editor.chain().focus().setLetterSpacing(value).run();
            }
          }}
        >
          <option value="default">자간</option>
          {LETTER_SPACINGS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-gray-200 px-1 text-sm"
          defaultValue="default"
          onChange={(e) => {
            const value = e.target.value;
            if (value === "default") {
              editor.chain().focus().unsetLineHeight().run();
            } else {
              editor.chain().focus().setLineHeight(value).run();
            }
          }}
        >
          <option value="default">행간</option>
          {LINE_HEIGHTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-gray-600">
          색상
          <input
            type="color"
            defaultValue="#111111"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="h-6 w-8 cursor-pointer rounded border border-gray-200"
          />
        </label>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
        >
          색상 지우기
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#FFF3A3" }).run()}
          className={`rounded px-2 py-1 text-sm ${editor.isActive("highlight") ? "bg-gray-200" : ""}`}
        >
          강조
        </button>
        <select
          className="rounded border border-gray-200 px-1 text-sm"
          defaultValue="placeholder"
          onChange={(e) => {
            const variant = e.target.value as DividerStyle;
            const preset = DIVIDER_STYLE_PRESETS[variant];
            if (preset.kind === "dots") {
              editor.chain().focus().insertContent('<p style="text-align:center">• • •</p>').run();
            } else {
              editor.chain().focus().insertContent({ type: "divider", attrs: { variant } }).run();
            }
            e.target.value = "placeholder";
          }}
        >
          <option value="placeholder">구분선 삽입</option>
          {Object.entries(DIVIDER_STYLE_PRESETS).map(([id, preset]) => (
            <option key={id} value={id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      <EditorContent editor={editor} className="rich-text p-3 text-sm" />
    </div>
  );
}
