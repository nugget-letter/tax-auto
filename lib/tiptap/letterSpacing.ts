import { Extension } from "@tiptap/core";

// Tiptap의 공식 확장(FontSize/Color/LineHeight)과 동일한 패턴으로 만든 자간 확장.
// @tiptap/extension-text-style에는 자간(letter-spacing) 확장이 기본 포함되어 있지 않아 직접 만든다.
export type LetterSpacingOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    letterSpacing: {
      setLetterSpacing: (letterSpacing: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
  }
}

export const LetterSpacing = Extension.create<LetterSpacingOptions>({
  name: "letterSpacing",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.letterSpacing || null,
            renderHTML: (attributes: { letterSpacing?: string | null }) => {
              if (!attributes.letterSpacing) return {};
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { letterSpacing }).run();
        },
      unsetLetterSpacing:
        () =>
        ({ chain }) => {
          return chain()
            .setMark("textStyle", { letterSpacing: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});
