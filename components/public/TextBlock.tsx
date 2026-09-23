import type { HeadingSize, TextBlock as TextBlockType } from "@/lib/pages/types";

const HEADING_SIZE_CLASSES: Record<HeadingSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
};

// 본문 텍스트 아래에는 자동 구분선을 그리지 않는다 — 선이 필요하면 구분선 블록을 쓴다.
export default function TextBlock({ block }: { block: TextBlockType }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      {block.heading && (
        <h2
          className={`mb-3 font-bold ${HEADING_SIZE_CLASSES[block.headingSize ?? "md"]}`}
          style={{
            fontFamily: `var(--font-${block.headingFont ?? "noto-serif-kr"})`,
            color: block.headingColor ?? "#111827",
          }}
        >
          {block.heading}
        </h2>
      )}
      <div
        className="rich-text text-[15px] leading-relaxed text-gray-700"
        dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
      />
    </div>
  );
}
