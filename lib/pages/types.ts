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
  ctaHref: z.string(),
  ctaColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요"),
});
export type PageInput = z.infer<typeof pageInputSchema>;

export type PageRecord = PageInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
