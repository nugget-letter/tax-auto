import type { TextBlock as TextBlockType } from "@/lib/pages/types";

export default function TextBlock({
  block,
  isFirst,
}: {
  block: TextBlockType;
  isFirst: boolean;
}) {
  return (
    <div className={`mx-auto max-w-xl px-6 py-6 ${isFirst ? "" : "border-t border-gray-100"}`}>
      {block.heading && (
        <h2 className="mb-3 font-serif text-lg font-bold text-gray-900">{block.heading}</h2>
      )}
      <div
        className="rich-text text-[15px] leading-relaxed text-gray-700"
        dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
      />
    </div>
  );
}
