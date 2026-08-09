import type { StatsBlock as StatsBlockType } from "@/lib/pages/types";

export default function StatsBlock({ block }: { block: StatsBlockType }) {
  // 항목은 2~4개. 3개일 때 2열로 깔면 빈 칸이 회색 덩어리로 남으므로 3열로 채운다.
  const columnClass = block.items.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div
      className={`mx-auto grid max-w-xl ${columnClass} gap-px border border-gray-200 bg-gray-200 px-6`}
    >
      {block.items.map((item, index) => (
        <div key={index} className="bg-white px-4 py-6 text-center">
          <p className="font-serif text-2xl font-bold text-gray-900">{item.number}</p>
          <p className="mt-1 text-xs text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
