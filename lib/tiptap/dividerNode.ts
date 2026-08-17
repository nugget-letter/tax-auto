import { Node } from "@tiptap/core";
import { DIVIDER_STYLE_PRESETS, DEFAULT_DIVIDER_STYLE } from "@/lib/pages/dividerStyle";
import type { DividerStyle } from "@/lib/pages/types";

function parseBorderTop(borderTop: string): { width: string; style: string; color: string } | null {
  const match = borderTop.match(/^(\d+px)\s+(solid|dashed|dotted)\s+(#[0-9a-fA-F]{3,8})$/);
  if (!match) return null;
  return { width: match[1], style: match[2], color: match[3] };
}

// sanitizer(lib/sanitize.ts)가 border-top 축약형이 아니라 border-top-width/style/color
// 개별 속성만 허용하므로, 반드시 longhand로 렌더링해야 저장 시 스타일이 살아남는다.
function styleAttrFor(variant: DividerStyle): string {
  const preset = DIVIDER_STYLE_PRESETS[variant];
  if (preset.kind !== "line") return "";
  const parsed = parseBorderTop(preset.borderTop);
  if (!parsed) return "";
  return `border-top-width: ${parsed.width}; border-top-style: ${parsed.style}; border-top-color: ${parsed.color}`;
}

function variantFromStyleAttr(styleAttr: string | null): DividerStyle {
  if (!styleAttr) return DEFAULT_DIVIDER_STYLE;
  const normalized = styleAttr.replace(/\s+/g, "");
  for (const [id, preset] of Object.entries(DIVIDER_STYLE_PRESETS)) {
    if (preset.kind !== "line") continue;
    const parsed = parseBorderTop(preset.borderTop);
    if (!parsed) continue;
    const expected = `border-top-width:${parsed.width};border-top-style:${parsed.style};border-top-color:${parsed.color}`;
    if (normalized === expected) return id as DividerStyle;
  }
  return DEFAULT_DIVIDER_STYLE;
}

export const DividerNode = Node.create({
  name: "divider",
  group: "block",

  addAttributes() {
    return {
      variant: { default: DEFAULT_DIVIDER_STYLE },
    };
  },

  parseHTML() {
    return [
      {
        tag: "hr",
        getAttrs: (element) => ({
          variant: variantFromStyleAttr((element as HTMLElement).getAttribute("style")),
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const variant = node.attrs.variant as DividerStyle;
    return ["hr", { style: styleAttrFor(variant) }];
  },
});
