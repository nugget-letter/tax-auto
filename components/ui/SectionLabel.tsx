type Props = { as?: "h2" | "p"; children: React.ReactNode };

/**
 * 세일즈 랜딩의 eyebrow를 어드민 그룹 제목에 그대로 쓴다.
 * 한글 라벨에는 uppercase가 영향을 주지 않으므로 그대로 걸어 둔다.
 *
 * 실제로 화면의 구획 제목 역할을 하는 곳(예: 페이지 목록의 발행됨/임시저장/보관,
 * 체험 종료 임박 목록)에서는 as="h2"를 넘겨 문서 개요·스크린리더 탐색에
 * 잡히게 한다. 기본값은 순수 라벨(p)로, 시각 스타일은 둘 다 동일하다.
 */
export default function SectionLabel({ as = "p", children }: Props) {
  const Tag = as;
  return (
    <Tag className="mb-3 flex items-center gap-2.5 font-num text-[11px] tracking-[0.14em] text-ink-muted uppercase">
      <span aria-hidden="true" className="flame-bar inline-block h-0.5 w-[22px] rounded-sm" />
      {children}
    </Tag>
  );
}
