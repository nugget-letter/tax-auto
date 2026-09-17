/**
 * 어드민 상태 색 한 벌. 상태 뱃지·태그 칩·달력 칩·D-day가 전부 여기서 색을 받는다.
 * 브랜드 플레임과 섞지 않는다 — 플레임은 액센트고 이쪽은 데이터 구분용이다.
 * 여섯 톤 모두 WCAG AA를 통과한다. 가장 낮은 것은 green 4.57:1로 기준(4.5:1)에
 * 아슬아슬하다 — green의 두 색은 더 흐리게 바꾸지 말 것. 가장 높은 것은 indigo 8.06:1.
 */
export const TONES = ["indigo", "blue", "green", "red", "amber", "gray"] as const;

export type Tone = (typeof TONES)[number];

const CLASSES: Record<Tone, string> = {
  indigo: "bg-[#e0e7ff] text-[#3730a3]",
  blue: "bg-[#dbeafe] text-[#1d4ed8]",
  green: "bg-[#dcfce7] text-[#15803d]",
  red: "bg-[#fee2e2] text-[#b91c1c]",
  amber: "bg-[#fef3c7] text-[#92400e]",
  gray: "bg-[#f3f4f6] text-[#4b5563]",
};

export function toneClass(tone: Tone): string {
  return CLASSES[tone];
}
