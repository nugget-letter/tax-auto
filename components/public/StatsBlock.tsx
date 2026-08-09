import type { StatsBlock as StatsBlockType } from "@/lib/pages/types";

export default function StatsBlock({ block }: { block: StatsBlockType }) {
  return (
    <div className="mx-auto grid max-w-xl grid-cols-2 gap-px border border-gray-200 bg-gray-200 px-6">
      {block.items.map((item, index) => (
        <div key={index} className="bg-white px-4 py-6 text-center">
          <p className="font-serif text-2xl font-bold text-gray-900">{item.number}</p>
          <p className="mt-1 text-xs text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
