import { DIVIDER_STYLE_PRESETS, DEFAULT_DIVIDER_STYLE } from "@/lib/pages/dividerStyle";
import type { DividerStyle } from "@/lib/pages/types";

export default function DividerBlock({ style = DEFAULT_DIVIDER_STYLE }: { style?: DividerStyle }) {
  const preset = DIVIDER_STYLE_PRESETS[style];

  if (preset.kind === "dots") {
    return (
      <div className="mx-auto max-w-xl px-6 py-6 text-center text-sm tracking-widest text-gray-400">
        • • •
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <div style={{ borderTop: preset.borderTop }} />
    </div>
  );
}
