import type { BannerBlock as BannerBlockType } from "@/lib/pages/types";

export default function BannerBlock({
  block,
  hasBorderAfter,
}: {
  block: BannerBlockType;
  hasBorderAfter: boolean;
}) {
  return (
    <figure className={`w-full ${hasBorderAfter ? "border-b border-gray-100" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.imageUrl} alt={block.title ?? ""} className="w-full object-cover" />
      {(block.title || block.subtitle) && (
        <figcaption className="mx-auto max-w-xl px-6 py-6 text-center">
          {block.title && (
            <p className="font-serif text-xl font-bold text-gray-900">{block.title}</p>
          )}
          {block.subtitle && <p className="mt-1 text-sm text-gray-500">{block.subtitle}</p>}
        </figcaption>
      )}
    </figure>
  );
}
