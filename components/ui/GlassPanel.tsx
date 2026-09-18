type Props = {
  tone?: "default" | "warning";
  className?: string;
  children: React.ReactNode;
};

/** 어드민의 모든 표면. 회색 테두리 상자를 전부 이걸로 바꾼다. */
export default function GlassPanel({ tone = "default", className = "", children }: Props) {
  const toneClass = tone === "warning" ? "glass-panel glass-panel-warn" : "glass-panel";
  return <div className={`${toneClass} ${className}`}>{children}</div>;
}
