import { getReadableTextColor } from "@/lib/contrast";
import type { CtaFontSize, CtaHeight, CtaVariant, CtaWidth } from "@/lib/pages/types";

const HEIGHT_CLASSES: Record<CtaHeight, string> = {
  sm: "px-5 py-2.5",
  md: "px-6 py-4",
  lg: "px-8 py-5",
};

const WIDTH_CLASSES: Record<CtaWidth, string> = {
  auto: "w-auto",
  wide: "w-4/5",
  full: "w-full",
};

const FONT_SIZE_CLASSES: Record<CtaFontSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

type Props = {
  label: string;
  href: string;
  color: string;
  variant?: CtaVariant;
  height?: CtaHeight;
  width?: CtaWidth;
  fontSize?: CtaFontSize;
  hasBorderAfter: boolean;
};

export default function CtaButton({
  label,
  href,
  color,
  variant,
  height,
  width,
  fontSize,
  hasBorderAfter,
}: Props) {
  if (!label || !href) return null;

  const isOutline = variant === "outline";
  const classes = [
    "inline-block rounded-full font-bold",
    HEIGHT_CLASSES[height ?? "md"],
    WIDTH_CLASSES[width ?? "full"],
    FONT_SIZE_CLASSES[fontSize ?? "md"],
    isOutline ? "border-2 bg-transparent" : "",
  ].join(" ");

  return (
    <div className={`mx-auto max-w-xl px-6 py-10 text-center ${hasBorderAfter ? "border-b border-gray-100" : ""}`}>
      <a
        href={href}
        className={classes}
        style={
          isOutline
            ? { borderColor: color, color }
            : { backgroundColor: color, color: getReadableTextColor(color) }
        }
      >
        {label}
      </a>
    </div>
  );
}
