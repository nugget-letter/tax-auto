import { z } from "zod";

export const scrollEffectSchema = z.enum([
  "none",
  "fade",
  "fade-up",
  "slide-left",
  "slide-right",
  "scale",
]);
export type ScrollEffect = z.infer<typeof scrollEffectSchema>;

export const dividerStyleSchema = z.enum(["solid-light", "solid-dark", "dotted", "dashed", "dots"]);
export type DividerStyle = z.infer<typeof dividerStyleSchema>;

export const ctaVariantSchema = z.enum(["filled", "outline"]);
export type CtaVariant = z.infer<typeof ctaVariantSchema>;

// 높이(상하 여백) · 너비 · 글씨 크기는 따로 고른다 — 셋을 한 "크기"로 묶으면
// "글씨만 키우고 싶다" 같은 요구를 못 받는다.
export const ctaHeightSchema = z.enum(["sm", "md", "lg"]);
export type CtaHeight = z.infer<typeof ctaHeightSchema>;

export const ctaWidthSchema = z.enum(["auto", "wide", "full"]);
export type CtaWidth = z.infer<typeof ctaWidthSchema>;

export const ctaFontSizeSchema = z.enum(["sm", "md", "lg", "xl"]);
export type CtaFontSize = z.infer<typeof ctaFontSizeSchema>;

export const bannerBlockSchema = z.object({
  type: z.literal("banner"),
  imageUrl: z.string().min(1),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  scrollEffect: scrollEffectSchema.optional(),
});

// 소제목 글꼴은 app/layout.tsx가 로드하는 --font-<키> 변수 이름과 같다.
// 기존에 저장된 블록에는 없는 필드라 모두 optional — 없으면 예전 모양(노토세리프, 보통, 진회색)으로 읽는다.
export const headingFontSchema = z.enum([
  "noto-serif-kr",
  "noto-sans-kr",
  "nanum-gothic",
  "nanum-myeongjo",
  "gothic-a1",
  "pretendard",
]);
export type HeadingFont = z.infer<typeof headingFontSchema>;

export const headingSizeSchema = z.enum(["sm", "md", "lg", "xl"]);
export type HeadingSize = z.infer<typeof headingSizeSchema>;

export const textBlockSchema = z.object({
  type: z.literal("text"),
  heading: z.string().optional(),
  headingFont: headingFontSchema.optional(),
  headingSize: headingSizeSchema.optional(),
  headingColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요").optional(),
  bodyHtml: z.string(),
  scrollEffect: scrollEffectSchema.optional(),
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
  // filled = 배경 채우기(기존 동작), outline = 투명 배경 + 테두리. 두 경우 모두 color를 쓴다.
  // 기존에 저장된 블록에는 없는 필드라 모두 optional이다 — 없으면 예전 모양(filled, 꽉 찬 너비)으로 읽는다.
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요"),
  variant: ctaVariantSchema.optional(),
  height: ctaHeightSchema.optional(),
  width: ctaWidthSchema.optional(),
  fontSize: ctaFontSizeSchema.optional(),
  scrollEffect: scrollEffectSchema.optional(),
});

export const dividerBlockSchema = z.object({
  type: z.literal("divider"),
  style: dividerStyleSchema.optional(),
  scrollEffect: scrollEffectSchema.optional(),
});
export type DividerBlock = z.infer<typeof dividerBlockSchema>;

export const FORM_BLOCK_DEFAULTS = {
  title: "",
  buttonLabel: "신청하기",
  buttonColor: "#FEE500",
  consentText: "개인정보 수집·이용에 동의합니다",
  successMessage: "신청이 접수됐어요. 곧 연락드릴게요!",
};

export const formBlockSchema = z.object({
  type: z.literal("form"),
  title: z.string().optional(),
  buttonLabel: z.string().min(1, "버튼 문구를 입력해주세요"),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요"),
  consentText: z.string().min(1, "동의 문구를 입력해주세요"),
  successMessage: z.string().min(1, "완료 메시지를 입력해주세요"),
  scrollEffect: scrollEffectSchema.optional(),
});
export type FormBlock = z.infer<typeof formBlockSchema>;

export const blockSchema = z.discriminatedUnion("type", [
  bannerBlockSchema,
  textBlockSchema,
  ctaBlockSchema,
  dividerBlockSchema,
  formBlockSchema,
]);

export type BannerBlock = z.infer<typeof bannerBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type CtaBlock = z.infer<typeof ctaBlockSchema>;
export type Block = z.infer<typeof blockSchema>;

export const pageStatusSchema = z.enum(["draft", "published", "archived"]);
export type PageStatus = z.infer<typeof pageStatusSchema>;

export const pageInputSchema = z
  .object({
    title: z.string().min(1, "제목을 입력해주세요"),
    slug: z
      .string()
      .min(1, "슬러그를 입력해주세요")
      .regex(/^[a-z0-9-]+$/, "영문 소문자, 숫자, 하이픈만 사용할 수 있어요"),
    status: pageStatusSchema,
    blocks: z.array(blockSchema),
  })
  // 한 페이지에 폼이 둘이면 어느 폼으로 신청했는지가 의미 없어진다.
  .refine((page) => page.blocks.filter((block) => block.type === "form").length <= 1, {
    message: "신청 폼은 페이지당 하나만 넣을 수 있어요",
    path: ["blocks"],
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
  // 실제로 고객에게 링크를 보낸 날짜와 수신 대상 태그. 발행일과 별개로 관리자가 직접 적는다.
  sentOn: string | null;
  sendTags: string[];
};

export const MAX_SEND_TAGS = 20;

/** 앞뒤 공백을 버리고, 빈 값과 중복을 제거한다(입력 순서 유지). */
export function normalizeSendTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

const sentOnSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 해요")
  .nullable();

// 전송 기록은 에디터 저장(pageInputSchema)과 분리해 둔다 — 에디터가 블록 전체를
// 덮어쓰기 때문에 같은 요청에 실으면 두 화면이 서로의 변경을 지울 수 있다.
export const pageSendSchema = z.object({
  sentOn: sentOnSchema,
  // 길이 검사는 정규화 전에 한다 — 공백만 잔뜩 든 값이 통과한 뒤 사라지면 사용자가
  // 무엇이 거부됐는지 알 수 없다. 개수 제한은 정규화 후 기준이다.
  sendTags: z
    .array(z.string().max(50, "태그는 50자까지 쓸 수 있어요"))
    .transform(normalizeSendTags)
    .refine((tags) => tags.length <= MAX_SEND_TAGS, {
      message: `태그는 ${MAX_SEND_TAGS}개까지 붙일 수 있어요`,
    }),
});
export type PageSendInput = z.infer<typeof pageSendSchema>;
