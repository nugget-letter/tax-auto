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

export const ctaBlockSchema = z.object({
  type: z.literal("cta"),
  label: z.string(),
  // 빈 값은 "CTA 없음"으로 허용한다(CtaButton이 렌더링을 건너뜀).
  // 값이 있다면 스킴이 있어야 한다. www.example.com 처럼 적으면 상대 경로가 되어 링크가 깨진다.
  href: z
    .string()
    .refine((value) => value === "" || /^(https?:\/\/|tel:)/.test(value), {
      message: "링크는 https:// 또는 tel:로 시작해야 해요.",
    }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요"),
});

export const blockSchema = z.discriminatedUnion("type", [
  bannerBlockSchema,
  textBlockSchema,
  ctaBlockSchema,
]);

export type BannerBlock = z.infer<typeof bannerBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type CtaBlock = z.infer<typeof ctaBlockSchema>;
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
});
export type PageInput = z.infer<typeof pageInputSchema>;

export type PageRecord = PageInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  // 처음 발행(published)으로 바뀐 시각. 서버가 자동으로 채우며, 한 번 채워지면
  // 이후 다시 임시저장/보관으로 바뀌어도 지우지 않는다 — "이 페이지가 언제
  // 처음 발행됐는가"를 남겨두기 위해서다.
  publishedAt: string | null;
};
