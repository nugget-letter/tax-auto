type Props = { children: React.ReactNode };

/**
 * 세일즈 랜딩의 eyebrow를 어드민 그룹 제목에 그대로 쓴다.
 * 한글 라벨에는 uppercase가 영향을 주지 않으므로 그대로 걸어 둔다.
 */
export default function SectionLabel({ children }: Props) {
  return (
    <p className="mb-3 flex items-center gap-2.5 font-num text-[11px] tracking-[0.14em] text-ink-muted uppercase">
      <span aria-hidden="true" className="flame-bar inline-block h-0.5 w-[22px] rounded-sm" />
      {children}
    </p>
  );
}
