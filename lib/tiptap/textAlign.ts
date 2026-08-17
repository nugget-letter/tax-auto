import { Extension } from "@tiptap/core";

// Tiptap의 공식 확장(FontSize/Color/LineHeight)과 동일한 패턴으로 만든 문단 정렬 확장.
// @tiptap/extension-text-align은 이 프로젝트의 의존성이 아니므로 필요한 만큼만 직접 만든다.
export type TextAlignOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (textAlign: string) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

export const TextAlign = Extension.create<TextAlignOptions>({
  name: "textAlign",

  addOptions() {
    return {
      types: ["paragraph"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.textAlign || null,
            renderHTML: (attributes: { textAlign?: string | null }) => {
              if (!attributes.textAlign) return {};
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (textAlign: string) =>
        ({ chain }) => {
          return chain().updateAttributes("paragraph", { textAlign }).run();
        },
      unsetTextAlign:
        () =>
        ({ chain }) => {
          return chain().updateAttributes("paragraph", { textAlign: null }).run();
        },
    };
  },
});
