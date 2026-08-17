import type { DividerStyle } from "./types";

type LinePreset = { label: string; kind: "line"; borderTop: string };
type DotsPreset = { label: string; kind: "dots" };

export const DIVIDER_STYLE_PRESETS: Record<DividerStyle, LinePreset | DotsPreset> = {
  "solid-light": { label: "연한 실선", kind: "line", borderTop: "1px solid #E5E7EB" },
  "solid-dark": { label: "진한 실선", kind: "line", borderTop: "2px solid #9CA3AF" },
  dotted: { label: "점선", kind: "line", borderTop: "1px dotted #D1D5DB" },
  dashed: { label: "파선", kind: "line", borderTop: "1px dashed #D1D5DB" },
  dots: { label: "점 3개 장식", kind: "dots" },
};

export const DEFAULT_DIVIDER_STYLE: DividerStyle = "solid-light";
