import { z } from "zod";

export const bannerBlockSchema = z.object({
  type: z.literal("banner"),
  imageUrl: z.string().min(1),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

export const textBlockSchema = z.object({
  type: z.literal("text"),
  heading: z.string().optional(),
  bodyHtml: z.string(),
});

export const statsBlockSchema = z.object({
  type: z.literal("stats"),
  items: z
    .array(
      z.object({
        number: z.string().min(1),
        label: z.string().min(1),
      })
    )
    .min(2)
    .max(4),
});

export const blockSchema = z.discriminatedUnion("type", [
  bannerBlockSchema,
  textBlockSchema,
  statsBlockSchema,
]);

export type BannerBlock = z.infer<typeof bannerBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type StatsBlock = z.infer<typeof statsBlockSchema>;
export type Block = z.infer<typeof blockSchema>;

export const pageStatusSchema = z.enum(["draft", "published", "archived"]);
export type PageStatus = z.infer<typeof pageStatusSchema>;

export const pageInputSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  slug: z
    .string()
    .min(1, "슬러그를 입력해주세요")
    .regex(/^[a-z0-9-]+$/, "영문 소문자, 숫자, 하이픈만 사용할 수 있어요"),
  status: pageStatusSchema,
  blocks: z.array(blockSchema),
  ctaLabel: z.string(),
  // 빈 값은 "CTA 없음"으로 허용한다(CtaButton이 렌더링을 건너뜀).
  // 값이 있다면 스킴이 있어야 한다. www.example.com 처럼 적으면 상대 경로가 되어 링크가 깨진다.
  ctaHref: z
    .string()
    .refine((value) => value === "" || /^(https?:\/\/|tel:)/.test(value), {
      message: "링크는 https:// 또는 tel:로 시작해야 해요.",
    }),
  ctaColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요"),
});
export type PageInput = z.infer<typeof pageInputSchema>;

export type PageRecord = PageInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
