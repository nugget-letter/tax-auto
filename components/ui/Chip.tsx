import { toneClass, type Tone } from "@/lib/ui/tones";

type Props = { tone: Tone; children: React.ReactNode };

/** 상태 뱃지·태그·달력 칩·D-day를 전부 대신한다. */
export default function Chip({ tone, children }: Props) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClass(tone)}`}
    >
      {children}
    </span>
  );
}
