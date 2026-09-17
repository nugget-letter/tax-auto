"use client";

import { todayInSeoul } from "@/lib/customers/trial";

type Props = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
};

export default function DateField({ label, value, onChange, hint }: Props) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="glass-field focus-flame px-3 py-2 text-sm text-[#111827]"
        />
        <button
          type="button"
          onClick={() => onChange(todayInSeoul())}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          오늘
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`${label} 지우기`}
            className="px-1 text-xs text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
