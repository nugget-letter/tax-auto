import sanitizeHtml from "sanitize-html";
import type { PageInput } from "./pages/types";

// isomorphic-dompurify(jsdom 기반)는 Vercel 서버리스 번들에서
// "require() of ES Module ... not supported" 크래시가 나서(로컬 next dev/build에서는
// 우연히 재현되지 않았다) htmlparser2 기반의 sanitize-html로 교체했다 — jsdom 의존성이 없다.
const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "span", "mark", "hr", "table", "colgroup", "col", "tbody", "tr", "td", "th"];

const COLOR_PATTERNS = [
  /^#[0-9a-fA-F]{3,8}$/,
  /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,
  /^rgba\([\d.,\s%]+\)$/,
];

export function sanitizeBodyHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["style"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    // 리치 에디터(components/editor/RichTextEditor.tsx)가 실제로 생성하는 인라인
    // 스타일만 허용한다 — 굵게/기울임/밑줄/취소선/강조는 태그 자체로 표현되고,
    // 글꼴/글자크기/자간/행간/색상만 style 속성을 쓴다.
    // 구분선(hr)의 테두리 스타일과 문단 정렬(text-align)도 같은 방식으로 허용한다.
    allowedStyles: {
      "*": {
        color: COLOR_PATTERNS,
        "background-color": COLOR_PATTERNS,
        "font-family": [/^var\(--font-[a-z0-9-]+\)$/],
        "font-size": [/^\d+(\.\d+)?px$/],
        "letter-spacing": [/^-?\d+(\.\d+)?em$/],
        "line-height": [/^\d+(\.\d+)?$/],
        "border-top-style": [/^(solid|dashed|dotted)$/],
        "border-top-color": COLOR_PATTERNS,
        "border-top-width": [/^[12]px$/],
        "text-align": [/^(left|center|right)$/],
        width: [/^\d+px$/],
        "min-width": [/^\d+px$/],
      },
    },
  });
}

export function sanitizePageInputHtml(input: PageInput): PageInput {
  return {
    ...input,
    blocks: input.blocks.map((block) =>
      block.type === "text" ? { ...block, bodyHtml: sanitizeBodyHtml(block.bodyHtml) } : block
    ),
  };
}
