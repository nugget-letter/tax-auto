import { z } from "zod";

export const customerStatusSchema = z.enum(["new", "trial", "converted", "churned"]);
export type CustomerStatus = z.infer<typeof customerStatusSchema>;

export const CUSTOMER_STATUSES: CustomerStatus[] = ["new", "trial", "converted", "churned"];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  new: "신규",
  trial: "체험중",
  converted: "전환",
  churned: "이탈",
};

// 공백·괄호·플러스 등은 버리고 숫자와 하이픈만 남긴다. 하이픈은 사람이 읽기
// 좋게 남겨두되, 검색은 ilike라 "0101234"로도 "010-1234-5678"을 못 찾는 건 감수한다.
export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d-]/g, "");
}

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 해요");
const nullableDateSchema = dateStringSchema.nullable();

const emailOrEmptySchema = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "이메일 형식이 올바르지 않아요",
  });

const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().min(1, "연락처를 입력해주세요"));

// 공개 폼 제출. consented는 true여야만 통과한다.
//
// pageSlug는 우리 랜딩페이지(/c/[slug])의 폼에서 올 때만 붙는다. 외부 사이트
// (tax-sales.vercel.app의 Apps Script)가 서버끼리 보낼 때는 슬러그가 없는 대신
// 공유 토큰으로 인증하고, source에 어디서 왔는지를 직접 담아 보낸다.
export const submissionSchema = z.object({
  pageSlug: z.string().min(1).optional(),
  source: z.string().trim().max(100).optional(),
  name: z.string().trim().min(1, "이름을 입력해주세요"),
  office: z.string().trim().default(""),
  phone: phoneSchema,
  email: emailOrEmptySchema,
  consented: z.literal(true, "개인정보 수집에 동의해주세요"),
  // honeypot — 사람은 못 보는 필드. 값이 있으면 봇으로 본다.
  website: z.string().optional(),
});
export type Submission = z.infer<typeof submissionSchema>;

// 관리자 생성/수정 body.
export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요"),
  office: z.string().trim().default(""),
  phone: phoneSchema,
  email: emailOrEmptySchema,
  consented: z.boolean(),
  source: z.string().trim().default(""),
  status: customerStatusSchema,
  trialStartedOn: nullableDateSchema,
  kakaoAdminSetOn: nullableDateSchema,
  reminded1On: nullableDateSchema,
  reminded2On: nullableDateSchema,
  memo: z.string().default(""),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export type CustomerRecord = CustomerInput & {
  id: string;
  submittedAt: string;
  sourcePageId: string | null;
  createdAt: string;
  updatedAt: string;
};
