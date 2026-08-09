import { getReadableTextColor } from "@/lib/contrast";

type Props = { label: string; href: string; color: string };

export default function CtaButton({ label, href, color }: Props) {
  if (!label || !href) return null;

  return (
    <div className="mx-auto max-w-xl px-6 py-10 text-center">
      <a
        href={href}
        className="inline-block w-full rounded-full px-6 py-4 text-base font-bold"
        style={{ backgroundColor: color, color: getReadableTextColor(color) }}
      >
        {label}
      </a>
    </div>
  );
}
