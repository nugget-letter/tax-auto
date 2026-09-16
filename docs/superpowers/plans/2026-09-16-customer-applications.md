# 고객 신청 관리 (Customer Applications) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩페이지에 "신청 폼" 블록을 추가해 제출이 Supabase `customers`에 저장되게 하고, 어드민에서 고객 목록·상세/수정·추가·체험 종료 임박 표시를 제공하며, 기존 Google Sheet 데이터를 1회성 스크립트로 임포트한다.

**Architecture:** 기존 `pages` 패턴을 그대로 따른다 — zod 스키마(`lib/customers/types.ts`) → repository(`lib/customers/repository.ts`, 서비스 롤 Supabase) → API route(`app/api/customers/*`, `requireAdminSession`) → 서버 컴포넌트 페이지가 repository를 직접 호출해 렌더링, 수정은 client component가 fetch로 API 호출. 폼 블록은 `blockSchema` discriminatedUnion에 `form` 타입을 추가하고 에디터/공개 렌더러 양쪽에 분기를 더한다. 순수 로직(날짜 계산, 파서)은 Vitest로 단위 테스트한다.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), React 19, Supabase (`@supabase/supabase-js`, 서비스 롤), zod 4, seed-design (`@seed-design/react` `Box/HStack/VStack/Text/Badge`, 로컬 래퍼 `seed-design/ui/action-button`), Tailwind 4, Vitest (신규), tsx (신규).

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-09-16-customer-applications-design.md`
- 브랜치 `customer-applications`에서 작업한다 (이미 생성됨).
- Next.js 16은 학습 데이터와 다르다. API 라우트/페이지의 `params`는 `Promise`이며 `await` 해야 한다. 미들웨어 파일은 `proxy.ts`다. 궁금하면 `node_modules/next/dist/docs/`를 본다.
- 인증: 관리자 API는 전부 `requireAdminSession(request)`로 시작하고 실패 시 `401 {error:"unauthorized"}`. `/admin/*` 페이지는 `proxy.ts`가 이미 보호한다.
- 에러 응답 형식은 기존과 동일: `{ error: "invalid_input", fieldErrors }` 400, `{ error: "not_found" }` 404, `{ error: "<verb>_failed" }` 500.
- 날짜 컬럼(`date` 타입)은 앱에서 항상 `"YYYY-MM-DD"` 문자열로 다룬다. "오늘"은 `Asia/Seoul` 기준.
- 체험 기간 30일. 종료 임박 = `status === "trial"` 이고 D-day가 `-3 ~ +7` (즉 종료 7일 전부터 종료 후 3일까지).
- 상태값: `new`(신규) / `trial`(체험중) / `converted`(전환) / `churned`(이탈). Badge tone: new→`informative`, trial→`warning`, converted→`positive`, churned→`neutral`.
- 어드민 UI 스타일: seed-design `Box/HStack/VStack/Text/Badge` + 기존 Tailwind 클래스(`rounded border border-gray-300 px-3 py-2 text-sm` 등). 공개 페이지는 기존 미니멀 스타일(`mx-auto max-w-xl px-6`).
- 주석은 한국어, 기존 코드처럼 "왜"를 설명할 때만 쓴다.
- 커밋 메시지는 `feat:`/`fix:`/`test:`/`chore:` 접두어, 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- 각 태스크 끝에 `npx tsc --noEmit && npm run lint`가 통과해야 한다.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `vitest.config.ts` (신규) | `@/` 별칭 + node 환경 |
| `lib/customers/trial.ts` (신규) | 체험 종료일·D-day·임박 판정·오늘(KST) — 순수 함수 |
| `lib/customers/trial.test.ts` (신규) | 위 테스트 |
| `lib/customers/types.ts` (신규) | `customerStatusSchema`, `customerInputSchema`, `submissionSchema`, `CustomerRecord`, 라벨, `normalizePhone` |
| `lib/customers/types.test.ts` (신규) | 스키마 테스트 |
| `lib/customers/repository.ts` (신규) | Supabase CRUD + trial 자동 전환 |
| `lib/customers/import.ts` (신규) | CSV 파서, 시트 날짜/동의 파서, 행 → 입력 매핑 — 순수 함수 |
| `lib/customers/import.test.ts` (신규) | 위 테스트 |
| `scripts/import-customers.ts` (신규) | CLI: CSV 읽어 insert (`--dry-run`, `--force`) |
| `supabase/schema.sql` (수정) | `customers` 테이블 |
| `lib/pages/types.ts` (수정) | `formBlockSchema`, union 추가, "form 최대 1개" refine |
| `components/editor/FormBlockEditor.tsx` (신규) | 폼 블록 편집 카드 |
| `components/editor/BlockList.tsx` (수정) | 기본값·추가 버튼(1개 제한) |
| `components/editor/SortableBlockItem.tsx` (수정) | form 분기 |
| `components/public/FormBlock.tsx` (신규, client) | 공개 폼 + 제출 |
| `app/api/submissions/route.ts` (신규) | 공개 제출 API |
| `app/c/[slug]/page.tsx` (수정) | form 렌더링 분기 |
| `app/api/customers/route.ts` (신규) | POST |
| `app/api/customers/[id]/route.ts` (신규) | PUT, DELETE |
| `components/admin/Sidebar.tsx` (수정) | "고객 신청" 메뉴, startsWith 활성 |
| `components/customers/CustomerStatusBadge.tsx` (신규) | 상태 뱃지 |
| `components/customers/TrialDDayBadge.tsx` (신규) | D-day 뱃지 |
| `components/customers/StatusFilterChips.tsx` (신규) | 상태 필터 링크 |
| `components/customers/CustomerSearch.tsx` (신규, client) | 검색 입력 |
| `components/customers/EndingSoonSection.tsx` (신규) | 임박 섹션 |
| `components/customers/CustomersTable.tsx` (신규) | 목록 |
| `app/admin/customers/page.tsx` (신규) | 목록 페이지 |
| `components/customers/DateField.tsx` (신규, client) | 날짜 + [오늘] + [×] |
| `components/customers/CustomerForm.tsx` (신규, client) | 상세/수정/추가 폼 |
| `components/customers/DeleteCustomerButton.tsx` (신규, client) | 삭제 |
| `app/admin/customers/[id]/page.tsx` (신규) | 상세/수정 |
| `app/admin/customers/new/page.tsx` (신규) | 추가 |

---

### Task 1: Vitest 설정 + 체험 기간 계산 (`lib/customers/trial.ts`)

**Files:**
- Create: `vitest.config.ts`, `lib/customers/trial.ts`, `lib/customers/trial.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  ```ts
  export const TRIAL_DAYS = 30;
  export function addDays(isoDate: string, days: number): string;          // "YYYY-MM-DD" → "YYYY-MM-DD"
  export function diffDays(from: string, to: string): number;              // to - from (일)
  export function todayInSeoul(now?: Date): string;                        // "YYYY-MM-DD"
  export function getTrialEndsOn(trialStartedOn: string | null): string | null;
  export function getTrialDDay(trialStartedOn: string | null, today: string): number | null; // endsOn - today
  export function formatDDay(dday: number): string;                        // "D-3" | "D-day" | "D+2"
  export function isTrialEndingSoon(c: { status: string; trialStartedOn: string | null }, today: string): boolean;
  ```

- [ ] **Step 1: Vitest, tsx 설치 및 스크립트 추가**

```bash
npm install -D vitest tsx
```

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run"
```

`vitest.config.ts` 생성:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/customers/trial.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatDDay,
  getTrialDDay,
  getTrialEndsOn,
  isTrialEndingSoon,
  todayInSeoul,
} from "./trial";

describe("addDays / diffDays", () => {
  it("월 경계를 넘어 더한다", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-09-01", 30)).toBe("2026-10-01");
  });
  it("차이를 일 단위로 돌려준다", () => {
    expect(diffDays("2026-09-01", "2026-09-04")).toBe(3);
    expect(diffDays("2026-09-04", "2026-09-01")).toBe(-3);
  });
});

describe("todayInSeoul", () => {
  it("UTC 자정 직전은 서울 기준 다음날이다", () => {
    expect(todayInSeoul(new Date("2026-09-15T23:30:00Z"))).toBe("2026-09-16");
  });
});

describe("getTrialEndsOn", () => {
  it("시작일 + 30일", () => {
    expect(getTrialEndsOn("2026-09-01")).toBe("2026-10-01");
  });
  it("시작일 없으면 null", () => {
    expect(getTrialEndsOn(null)).toBeNull();
  });
});

describe("getTrialDDay", () => {
  it("종료일까지 남은 일수(양수), 지났으면 음수", () => {
    expect(getTrialDDay("2026-09-01", "2026-09-28")).toBe(3);
    expect(getTrialDDay("2026-09-01", "2026-10-01")).toBe(0);
    expect(getTrialDDay("2026-09-01", "2026-10-03")).toBe(-2);
  });
  it("시작일 없으면 null", () => {
    expect(getTrialDDay(null, "2026-09-28")).toBeNull();
  });
});

describe("formatDDay", () => {
  it("D-3 / D-day / D+2", () => {
    expect(formatDDay(3)).toBe("D-3");
    expect(formatDDay(0)).toBe("D-day");
    expect(formatDDay(-2)).toBe("D+2");
  });
});

describe("isTrialEndingSoon", () => {
  const start = "2026-09-01"; // 종료 2026-10-01
  it("종료 7일 전부터 true", () => {
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-09-23")).toBe(false); // D-8
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-09-24")).toBe(true); // D-7
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-10-01")).toBe(true); // D-day
  });
  it("종료 후 3일까지 true, 4일째부터 false", () => {
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-10-04")).toBe(true); // D+3
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-10-05")).toBe(false); // D+4
  });
  it("trial 상태가 아니거나 시작일이 없으면 false", () => {
    expect(isTrialEndingSoon({ status: "converted", trialStartedOn: start }, "2026-10-01")).toBe(false);
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: null }, "2026-10-01")).toBe(false);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- lib/customers/trial.test.ts`
Expected: FAIL — `Failed to resolve import "./trial"`

- [ ] **Step 4: 구현**

`lib/customers/trial.ts`:
```ts
export const TRIAL_DAYS = 30;

// 종료 7일 전부터 종료 후 3일까지를 "임박"으로 본다 — 리마인드를 보낼 창과
// 종료 직후 전환 여부를 확인할 창을 같이 덮는다.
const ENDING_SOON_MIN_DDAY = -3;
const ENDING_SOON_MAX_DDAY = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return fromUtcMs(toUtcMs(isoDate) + days * MS_PER_DAY);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

// 서버가 UTC로 떠 있으면 자정 전후로 날짜가 하루 밀린다. en-CA 로케일은 YYYY-MM-DD를 준다.
export function todayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

export function getTrialEndsOn(trialStartedOn: string | null): string | null {
  return trialStartedOn ? addDays(trialStartedOn, TRIAL_DAYS) : null;
}

export function getTrialDDay(trialStartedOn: string | null, today: string): number | null {
  const endsOn = getTrialEndsOn(trialStartedOn);
  return endsOn ? diffDays(today, endsOn) : null;
}

export function formatDDay(dday: number): string {
  if (dday === 0) return "D-day";
  return dday > 0 ? `D-${dday}` : `D+${-dday}`;
}

export function isTrialEndingSoon(
  customer: { status: string; trialStartedOn: string | null },
  today: string
): boolean {
  if (customer.status !== "trial") return false;
  const dday = getTrialDDay(customer.trialStartedOn, today);
  return dday !== null && dday >= ENDING_SOON_MIN_DDAY && dday <= ENDING_SOON_MAX_DDAY;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- lib/customers/trial.test.ts`
Expected: PASS (모든 테스트)

- [ ] **Step 6: 타입·린트 확인 후 커밋**

Run: `npx tsc --noEmit && npm run lint`
Expected: 오류 없음. (eslint가 `vitest.config.ts`의 `__dirname`에 불평하면 `import { fileURLToPath } from "node:url"` 로 `path.dirname(fileURLToPath(import.meta.url))`을 쓴다.)

```bash
git add package.json package-lock.json vitest.config.ts lib/customers/trial.ts lib/customers/trial.test.ts
git commit -m "feat: add vitest and trial period helpers

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 고객 스키마·타입 (`lib/customers/types.ts`)

**Files:**
- Create: `lib/customers/types.ts`, `lib/customers/types.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const customerStatusSchema: z.ZodEnum<...>;                 // "new"|"trial"|"converted"|"churned"
  export type CustomerStatus;
  export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string>; // 신규/체험중/전환/이탈
  export const CUSTOMER_STATUSES: CustomerStatus[];                   // 표시 순서
  export function normalizePhone(raw: string): string;                // 숫자·하이픈만
  export const customerInputSchema;  export type CustomerInput;       // 관리자 생성/수정 body
  export const submissionSchema;     export type Submission;          // 공개 폼 body
  export type CustomerRecord = CustomerInput & { id; submittedAt; sourcePageId: string|null; createdAt; updatedAt };
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/customers/types.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { customerInputSchema, normalizePhone, submissionSchema } from "./types";

describe("normalizePhone", () => {
  it("숫자와 하이픈만 남긴다", () => {
    expect(normalizePhone(" 010 1234 5678 ")).toBe("01012345678");
    expect(normalizePhone("010-1234-5678")).toBe("010-1234-5678");
    expect(normalizePhone("+82 (10) 1234-5678")).toBe("82101234-5678");
  });
});

describe("submissionSchema", () => {
  const valid = {
    pageSlug: "abc123",
    name: " 김세무 ",
    office: "세무법인 A",
    phone: "010 1234 5678",
    email: "kim@a.com",
    consented: true,
  };

  it("정상 입력을 정규화해서 통과시킨다", () => {
    const result = submissionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("김세무");
      expect(result.data.phone).toBe("01012345678");
    }
  });
  it("동의하지 않으면 거부", () => {
    expect(submissionSchema.safeParse({ ...valid, consented: false }).success).toBe(false);
  });
  it("이름·연락처 필수", () => {
    expect(submissionSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
  });
  it("이메일은 비어도 되지만 형식이 틀리면 거부", () => {
    expect(submissionSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
    expect(submissionSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
  it("사무실·이메일 생략 시 빈 문자열", () => {
    const result = submissionSchema.safeParse({ pageSlug: "x", name: "a", phone: "1", consented: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.office).toBe("");
      expect(result.data.email).toBe("");
    }
  });
});

describe("customerInputSchema", () => {
  const valid = {
    name: "김세무",
    office: "",
    phone: "010-1234-5678",
    email: "",
    consented: true,
    source: "직접 추가",
    status: "new",
    trialStartedOn: null,
    kakaoAdminSetOn: null,
    reminded1On: null,
    reminded2On: null,
    memo: "",
  };

  it("정상 입력 통과", () => {
    expect(customerInputSchema.safeParse(valid).success).toBe(true);
  });
  it("날짜는 YYYY-MM-DD 또는 null", () => {
    expect(customerInputSchema.safeParse({ ...valid, trialStartedOn: "2026-09-01" }).success).toBe(true);
    expect(customerInputSchema.safeParse({ ...valid, trialStartedOn: "2026.09.01" }).success).toBe(false);
    expect(customerInputSchema.safeParse({ ...valid, trialStartedOn: "" }).success).toBe(false);
  });
  it("알 수 없는 상태 거부", () => {
    expect(customerInputSchema.safeParse({ ...valid, status: "vip" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/customers/types.test.ts`
Expected: FAIL — `Failed to resolve import "./types"`

- [ ] **Step 3: 구현**

`lib/customers/types.ts`:
```ts
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
export const submissionSchema = z.object({
  pageSlug: z.string().min(1),
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/customers/types.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add lib/customers/types.ts lib/customers/types.test.ts
git commit -m "feat: add customer zod schemas and types

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: DB 스키마 + repository

**Files:**
- Modify: `supabase/schema.sql`
- Create: `lib/customers/repository.ts`

**Interfaces:**
- Consumes: `CustomerInput`, `CustomerRecord`, `CustomerStatus` (Task 2)
- Produces:
  ```ts
  export async function listCustomers(options?: { q?: string }): Promise<CustomerRecord[]>; // submitted_at desc
  export async function getCustomerById(id: string): Promise<CustomerRecord | null>;
  export async function createCustomer(input: CustomerInput & { submittedAt?: string; sourcePageId?: string | null }): Promise<CustomerRecord>;
  export async function updateCustomer(id: string, input: CustomerInput): Promise<CustomerRecord | null>; // null = 없음
  export async function deleteCustomer(id: string): Promise<void>;
  ```

- [ ] **Step 1: 스키마 추가**

`supabase/schema.sql` 끝에 추가:
```sql
-- 2026-09-16 마이그레이션: 고객 신청(customers) 테이블.
-- 랜딩페이지 신청 폼 제출과 관리자 수동 추가가 여기 쌓인다. pages와 같이
-- 서비스 롤로만 접근하므로 RLS는 정책 없이 켠다.
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  name text not null,
  office text not null default '',
  phone text not null,
  email text not null default '',
  consented boolean not null default false,
  source text not null default '',
  source_page_id uuid references pages(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'trial', 'converted', 'churned')),
  trial_started_on date,
  kakao_admin_set_on date,
  reminded_1_on date,
  reminded_2_on date,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers enable row level security;

create index if not exists customers_submitted_at_idx on customers (submitted_at desc);
create index if not exists customers_status_idx on customers (status);
```

- [ ] **Step 2: Supabase에 적용**

Supabase 대시보드 SQL Editor에서 위 블록만 실행한다. (사용자에게 실행을 요청하거나, `.env.local`의 서비스 롤 키로 REST가 DDL을 못 하므로 대시보드가 유일한 경로다.) 확인:
```bash
set -a && source .env.local && set +a
curl -s "$SUPABASE_URL/rest/v1/customers?select=id&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `[]` (테이블 없으면 `{"code":"42P01",...}`)

- [ ] **Step 3: repository 구현**

`lib/customers/repository.ts`:
```ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CustomerInput, CustomerRecord, CustomerStatus } from "./types";

type CustomerRow = {
  id: string;
  submitted_at: string;
  name: string;
  office: string;
  phone: string;
  email: string;
  consented: boolean;
  source: string;
  source_page_id: string | null;
  status: string;
  trial_started_on: string | null;
  kakao_admin_set_on: string | null;
  reminded_1_on: string | null;
  reminded_2_on: string | null;
  memo: string;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    name: row.name,
    office: row.office,
    phone: row.phone,
    email: row.email,
    consented: row.consented,
    source: row.source,
    sourcePageId: row.source_page_id,
    status: row.status as CustomerStatus,
    trialStartedOn: row.trial_started_on,
    kakaoAdminSetOn: row.kakao_admin_set_on,
    reminded1On: row.reminded_1_on,
    reminded2On: row.reminded_2_on,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToRow(input: CustomerInput) {
  return {
    name: input.name,
    office: input.office,
    phone: input.phone,
    email: input.email,
    consented: input.consented,
    source: input.source,
    status: input.status,
    trial_started_on: input.trialStartedOn,
    kakao_admin_set_on: input.kakaoAdminSetOn,
    reminded_1_on: input.reminded1On,
    reminded_2_on: input.reminded2On,
    memo: input.memo,
  };
}

// PostgREST의 or() 필터는 쉼표·괄호로 구문을 나누므로 검색어에서 제거한다.
function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%]/g, "").trim();
}

export async function listCustomers(options: { q?: string } = {}): Promise<CustomerRecord[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("customers").select("*").order("submitted_at", { ascending: false });

  const term = options.q ? sanitizeSearchTerm(options.q) : "";
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `name.ilike.${pattern},office.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as CustomerRow[]).map(rowToRecord);
}

export async function getCustomerById(id: string): Promise<CustomerRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as CustomerRow) : null;
}

export async function createCustomer(
  input: CustomerInput & { submittedAt?: string; sourcePageId?: string | null }
): Promise<CustomerRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...inputToRow(input),
      submitted_at: input.submittedAt ?? new Date().toISOString(),
      source_page_id: input.sourcePageId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as CustomerRow);
}

/**
 * 체험 시작일이 "없음 → 있음"으로 바뀌는 저장에서, 상태가 아직 new이면 trial로
 * 올린다. 이미 다른 상태(전환/이탈)면 관리자가 의도한 것이므로 건드리지 않는다.
 */
function resolveStatus(current: CustomerRow, input: CustomerInput): CustomerStatus {
  const trialJustStarted = current.trial_started_on === null && input.trialStartedOn !== null;
  if (trialJustStarted && input.status === "new") return "trial";
  return input.status;
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<CustomerRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) return null;

  const { data, error } = await supabase
    .from("customers")
    .update({
      ...inputToRow(input),
      status: resolveStatus(current as CustomerRow, input),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as CustomerRow);
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: 스모크 확인 (수동)**

임시 스크립트로 create → update(trial 자동 전환) → delete 흐름 확인:
```bash
cat > /tmp/customers-smoke.ts <<'EOF'
import { createCustomer, updateCustomer, deleteCustomer, listCustomers } from "@/lib/customers/repository";
const base = { name: "스모크", office: "", phone: "010-0000-0000", email: "", consented: true, source: "스모크", status: "new" as const, trialStartedOn: null, kakaoAdminSetOn: null, reminded1On: null, reminded2On: null, memo: "" };
const c = await createCustomer(base);
console.log("created", c.id, c.status);
const u = await updateCustomer(c.id, { ...base, trialStartedOn: "2026-09-01" });
console.log("after trial start:", u?.status); // trial 기대
const found = (await listCustomers({ q: "스모크" })).some((x) => x.id === c.id);
console.log("searchable:", found);
await deleteCustomer(c.id);
console.log("deleted");
EOF
npx tsx --env-file=.env.local --tsconfig tsconfig.json /tmp/customers-smoke.ts
```
Expected: `after trial start: trial`, `searchable: true`, `deleted`. (tsx가 `@/` 별칭을 tsconfig paths로 해석한다.)

- [ ] **Step 5: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add supabase/schema.sql lib/customers/repository.ts
git commit -m "feat: add customers table and repository

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 폼 블록 타입 + 에디터

**Files:**
- Modify: `lib/pages/types.ts`, `components/editor/BlockList.tsx`, `components/editor/SortableBlockItem.tsx`
- Create: `components/editor/FormBlockEditor.tsx`

**Interfaces:**
- Produces:
  ```ts
  export const formBlockSchema; export type FormBlock = { type: "form"; title?: string; buttonLabel: string; buttonColor: string; consentText: string; successMessage: string; scrollEffect?: ScrollEffect };
  export const FORM_BLOCK_DEFAULTS: Omit<FormBlock, "type">;
  ```
  `Block` union에 `FormBlock` 포함. `pageInputSchema`는 form 블록 2개 이상이면 거부.

- [ ] **Step 1: 타입 추가**

`lib/pages/types.ts`의 `dividerBlockSchema` 정의 아래에 추가:
```ts
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
```

`blockSchema`에 `formBlockSchema` 추가:
```ts
export const blockSchema = z.discriminatedUnion("type", [
  bannerBlockSchema,
  textBlockSchema,
  ctaBlockSchema,
  dividerBlockSchema,
  formBlockSchema,
]);
```

`pageInputSchema`에 refine 추가 (기존 `z.object({...})` 뒤에 체이닝):
```ts
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
```

- [ ] **Step 2: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 오류 없음 (`PageInput` 타입은 refine 후에도 동일).

- [ ] **Step 3: 에디터 컴포넌트 작성**

`components/editor/FormBlockEditor.tsx`:
```tsx
"use client";

import type { FormBlock } from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: FormBlock;
  onChange: (block: FormBlock) => void;
};

const inputClass = "w-full rounded border border-gray-300 px-2 py-1 text-sm";

export default function FormBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">신청 폼</p>
      <p className="text-xs text-gray-400">
        방문자가 이름·사무실·연락처·이메일을 남기면 어드민 &ldquo;고객 신청&rdquo;에 쌓여요.
      </p>
      <input
        type="text"
        placeholder="폼 제목 (예: 한 달 무료로 써보기) — 비워도 돼요"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="버튼 문구"
        value={block.buttonLabel}
        onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })}
        className={inputClass}
      />
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">버튼 색상</label>
        <input
          type="color"
          value={block.buttonColor}
          onChange={(e) => onChange({ ...block, buttonColor: e.target.value })}
          className="h-8 w-12"
        />
      </div>
      <input
        type="text"
        placeholder="동의 문구"
        value={block.consentText}
        onChange={(e) => onChange({ ...block, consentText: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="제출 완료 메시지"
        value={block.successMessage}
        onChange={(e) => onChange({ ...block, successMessage: e.target.value })}
        className={inputClass}
      />
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
```

- [ ] **Step 4: SortableBlockItem에 분기 추가**

`components/editor/SortableBlockItem.tsx` — import 추가:
```tsx
import FormBlockEditor from "./FormBlockEditor";
```
divider 분기 아래에:
```tsx
      {block.type === "form" && <FormBlockEditor block={block} onChange={onChange} />}
```

- [ ] **Step 5: BlockList에 기본값과 추가 버튼**

`components/editor/BlockList.tsx` — import에 `FORM_BLOCK_DEFAULTS` 추가:
```tsx
import { FORM_BLOCK_DEFAULTS, type Block } from "@/lib/pages/types";
```
`createDefaultBlock`에 divider 앞 줄 추가:
```tsx
  if (type === "form") return { type: "form", ...FORM_BLOCK_DEFAULTS };
```
`BlockList` 함수 본문 상단(`sensors` 아래)에:
```tsx
  const hasFormBlock = blocks.some((b) => b.type === "form");
```
구분선 버튼 아래에 버튼 추가:
```tsx
        <button
          type="button"
          onClick={() => addBlock("form")}
          disabled={hasFormBlock}
          title={hasFormBlock ? "신청 폼은 페이지당 하나만 넣을 수 있어요" : undefined}
          className="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          + 신청 폼
        </button>
```

- [ ] **Step 6: 에디터에서 수동 확인**

`npm run dev` → `/admin/new` → "+ 신청 폼" 클릭 → 카드가 나타나고 버튼이 비활성화됨 → 필드 수정 → "임시저장" → `/admin/<id>/edit`에서 다시 열어 값 유지 확인. 블록 삭제 후 버튼 다시 활성화 확인.

- [ ] **Step 7: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add lib/pages/types.ts components/editor/FormBlockEditor.tsx components/editor/BlockList.tsx components/editor/SortableBlockItem.tsx
git commit -m "feat: add form block type and editor

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 공개 폼 렌더링 + 제출 API

**Files:**
- Create: `components/public/FormBlock.tsx`, `app/api/submissions/route.ts`
- Modify: `app/c/[slug]/page.tsx`

**Interfaces:**
- Consumes: `FormBlock` 타입(Task 4), `submissionSchema`(Task 2), `createCustomer`(Task 3), `getPageBySlug`, `getReadableTextColor`
- Produces: `POST /api/submissions` — body `{ pageSlug, name, office, phone, email, consented, website }` → `201 {ok:true}` / `400 invalid_input` / `404 not_found` / `500 submit_failed`

- [ ] **Step 1: 제출 API**

`app/api/submissions/route.ts`:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { submissionSchema } from "@/lib/customers/types";
import { createCustomer } from "@/lib/customers/repository";
import { getPageBySlug } from "@/lib/pages/repository";

// 공개 엔드포인트 — 인증 없음. 발행된 페이지의 폼에서만 받는다.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // honeypot에 값이 있으면 봇. 성공한 척 응답하고 저장하지 않는다.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const page = await getPageBySlug(parsed.data.pageSlug);
  if (!page || page.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await createCustomer({
      name: parsed.data.name,
      office: parsed.data.office,
      phone: parsed.data.phone,
      email: parsed.data.email,
      consented: true,
      source: page.title,
      sourcePageId: page.id,
      status: "new",
      trialStartedOn: null,
      kakaoAdminSetOn: null,
      reminded1On: null,
      reminded2On: null,
      memo: "",
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[submissions] 저장 실패", error);
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: API 수동 확인**

dev 서버 켜고, 발행된 페이지 슬러그(예 `nnxno6l7`)로:
```bash
curl -s -X POST localhost:3000/api/submissions -H "Content-Type: application/json" \
  -d '{"pageSlug":"nnxno6l7","name":"API테스트","phone":"010-1111-2222","consented":true}' -w "\n%{http_code}\n"
curl -s -X POST localhost:3000/api/submissions -H "Content-Type: application/json" \
  -d '{"pageSlug":"nnxno6l7","name":"봇","phone":"1","consented":true,"website":"x"}' -w "\n%{http_code}\n"
curl -s -X POST localhost:3000/api/submissions -H "Content-Type: application/json" \
  -d '{"pageSlug":"no-such-page","name":"a","phone":"1","consented":true}' -w "\n%{http_code}\n"
curl -s -X POST localhost:3000/api/submissions -H "Content-Type: application/json" \
  -d '{"pageSlug":"nnxno6l7","name":"a","phone":"1","consented":false}' -w "\n%{http_code}\n"
```
Expected: `201`, `201`(저장 안 됨), `404`, `400`. 첫 번째 행은 Task 3의 curl로 `customers`에 있는지 확인 후 다음 태스크의 어드민에서 삭제한다.

- [ ] **Step 3: 공개 폼 컴포넌트**

`components/public/FormBlock.tsx`:
```tsx
"use client";

import { useState } from "react";
import type { FormBlock as FormBlockType } from "@/lib/pages/types";
import { getReadableTextColor } from "@/lib/contrast";

type Props = {
  block: FormBlockType;
  pageSlug: string;
  isPublished: boolean;
  hasBorderAfter: boolean;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none";

export default function FormBlock({ block, pageSlug, isPublished, hasBorderAfter }: Props) {
  const [name, setName] = useState("");
  const [office, setOffice] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPublished) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug, name, office, phone, email, consented, website }),
      });
      if (!response.ok) {
        setError("잠시 후 다시 시도해주세요.");
        return;
      }
      setDone(true);
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const wrapperClass = `mx-auto max-w-xl px-6 py-10 ${hasBorderAfter ? "border-b border-gray-100" : ""}`;

  if (done) {
    return (
      <div className={wrapperClass}>
        <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-[15px] font-medium text-gray-900">
          {block.successMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {block.title && (
        <h2 className="mb-4 font-serif text-lg font-bold text-gray-900">{block.title}</h2>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          required
          placeholder="이름 *"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          name="office"
          placeholder="사무실 이름"
          autoComplete="organization"
          value={office}
          onChange={(e) => setOffice(e.target.value)}
          className={inputClass}
        />
        <input
          type="tel"
          name="phone"
          required
          placeholder="연락처 *"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
          name="email"
          placeholder="이메일"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        {/* honeypot: 사람 눈에는 안 보이고 자동완성도 막는다 */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            required
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5"
          />
          <span>{block.consentText}</span>
        </label>
        <button
          type="submit"
          disabled={submitting || !isPublished}
          className="inline-block w-full rounded-full px-6 py-4 text-base font-bold disabled:opacity-50"
          style={{ backgroundColor: block.buttonColor, color: getReadableTextColor(block.buttonColor) }}
        >
          {submitting ? "보내는 중..." : block.buttonLabel}
        </button>
        {!isPublished && (
          <p className="text-center text-xs text-amber-600">미리보기에서는 제출되지 않아요. 발행 후 제출할 수 있어요.</p>
        )}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 4: 공개 페이지에 연결**

`app/c/[slug]/page.tsx` — import 추가:
```tsx
import FormBlock from "@/components/public/FormBlock";
```
두 상수에 `"form"` 추가:
```tsx
          const AUTO_BORDER_TYPES = ["banner", "text", "cta", "form"];
          const SUBSTANTIVE_TYPES = ["banner", "text", "cta", "divider", "form"];
```
`cta` 분기 아래, `return null;` 위에:
```tsx
            if (block.type === "form") {
              return (
                <ScrollReveal key={index} effect={block.scrollEffect}>
                  <FormBlock
                    block={block}
                    pageSlug={page.slug}
                    isPublished={page.status === "published"}
                    hasBorderAfter={hasBorderAfter}
                  />
                </ScrollReveal>
              );
            }
```

- [ ] **Step 5: 브라우저 수동 확인**

1. Task 4에서 만든 임시저장 페이지를 "미리보기" → 폼이 보이고 버튼 비활성 + 안내 문구.
2. 같은 페이지 "발행" → `/c/<slug>`에서 이름·연락처 비우고 제출 → 브라우저 검증 막힘. 동의 미체크 → 막힘. 정상 입력 → 완료 메시지로 교체.
3. 네트워크 탭에서 201 확인. (테스트 페이지는 확인 후 보관 처리.)

- [ ] **Step 6: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add components/public/FormBlock.tsx app/api/submissions/route.ts "app/c/[slug]/page.tsx"
git commit -m "feat: render form block on public pages and accept submissions

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 관리자 고객 API

**Files:**
- Create: `app/api/customers/route.ts`, `app/api/customers/[id]/route.ts`

**Interfaces:**
- Consumes: `customerInputSchema`(Task 2), `createCustomer/updateCustomer/deleteCustomer`(Task 3), `requireAdminSession`
- Produces: `POST /api/customers` → 201 `CustomerRecord`; `PUT /api/customers/[id]` → 200 `CustomerRecord` / 404; `DELETE /api/customers/[id]` → 204

- [ ] **Step 1: POST**

`app/api/customers/route.ts`:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { customerInputSchema } from "@/lib/customers/types";
import { createCustomer } from "@/lib/customers/repository";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = customerInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const customer = await createCustomer(parsed.data);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("[customers] 생성 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: PUT / DELETE**

`app/api/customers/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { customerInputSchema } from "@/lib/customers/types";
import { updateCustomer, deleteCustomer } from "@/lib/customers/repository";
import { requireAdminSession } from "@/lib/auth/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = customerInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const customer = await updateCustomer(id, parsed.data);
    if (!customer) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(customer);
  } catch (error) {
    console.error("[customers] 수정 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteCustomer(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[customers] 삭제 실패", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: curl 확인**

브라우저 로그인 후 쿠키 `nugget_admin_session` 값을 복사해 `COOKIE` 변수에 넣는다.
```bash
COOKIE="nugget_admin_session=<값>"
BODY='{"name":"관리자추가","office":"","phone":"010-2222-3333","email":"","consented":true,"source":"직접 추가","status":"new","trialStartedOn":null,"kakaoAdminSetOn":null,"reminded1On":null,"reminded2On":null,"memo":""}'
curl -s -X POST localhost:3000/api/customers -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d "$BODY" -w "\n%{http_code}\n"
# 위 응답의 id로:
curl -s -X PUT localhost:3000/api/customers/<id> -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d "${BODY/\"trialStartedOn\":null/\"trialStartedOn\":\"2026-09-01\"}" -w "\n%{http_code}\n"
curl -s -X DELETE localhost:3000/api/customers/<id> -H "Cookie: $COOKIE" -w "%{http_code}\n"
curl -s -X POST localhost:3000/api/customers -H "Content-Type: application/json" -d "$BODY" -w "\n%{http_code}\n"
```
Expected: `201`, `200`이고 응답의 `"status":"trial"`, `204`, `401`.

- [ ] **Step 4: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add app/api/customers
git commit -m "feat: add admin customers API

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: 사이드바 + 고객 목록 페이지

**Files:**
- Modify: `components/admin/Sidebar.tsx`
- Create: `components/customers/CustomerStatusBadge.tsx`, `components/customers/TrialDDayBadge.tsx`, `components/customers/StatusFilterChips.tsx`, `components/customers/CustomerSearch.tsx`, `components/customers/EndingSoonSection.tsx`, `components/customers/CustomersTable.tsx`, `app/admin/customers/page.tsx`

**Interfaces:**
- Consumes: `listCustomers`(Task 3), `trial.ts`(Task 1), `CUSTOMER_STATUS_LABELS/CUSTOMER_STATUSES`(Task 2), `formatDate`
- Produces: `CustomerStatusBadge({status})`, `TrialDDayBadge({dday})` — Task 8에서 재사용

- [ ] **Step 1: 사이드바**

`components/admin/Sidebar.tsx`의 `NAV_ITEMS`와 활성 판정 교체:
```tsx
const NAV_ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/customers", label: "고객 신청" },
  { href: "/admin/published", label: "발행된 URL" },
  { href: "/admin/new", label: "새 페이지" },
];
```
```tsx
            // /admin/customers/… 하위 화면에서도 메뉴가 켜지게 한다. /admin은
            // 모든 경로의 접두어라 정확히 일치할 때만 활성으로 본다.
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
```

- [ ] **Step 2: 뱃지 두 개**

`components/customers/CustomerStatusBadge.tsx`:
```tsx
import { Badge } from "@seed-design/react";
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from "@/lib/customers/types";

const TONES: Record<CustomerStatus, "informative" | "warning" | "positive" | "neutral"> = {
  new: "informative",
  trial: "warning",
  converted: "positive",
  churned: "neutral",
};

export default function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge tone={TONES[status]} variant="weak">
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}
```

`components/customers/TrialDDayBadge.tsx`:
```tsx
import { Badge } from "@seed-design/react";
import { formatDDay } from "@/lib/customers/trial";

// 아직 남았으면 경고(노랑), 오늘이거나 지났으면 위험(빨강).
export default function TrialDDayBadge({ dday }: { dday: number }) {
  return (
    <Badge tone={dday > 0 ? "warning" : "critical"} variant="solid">
      {formatDDay(dday)}
    </Badge>
  );
}
```

- [ ] **Step 3: 필터 칩 + 검색**

`components/customers/StatusFilterChips.tsx`:
```tsx
import Link from "next/link";
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS, type CustomerStatus } from "@/lib/customers/types";

type Props = {
  current: CustomerStatus | null;
  counts: Record<CustomerStatus, number>;
  total: number;
  q: string;
};

function href(status: CustomerStatus | null, q: string): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/admin/customers?${query}` : "/admin/customers";
}

function Chip({ active, to, children }: { active: boolean; to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default function StatusFilterChips({ current, counts, total, q }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip active={current === null} to={href(null, q)}>
        전체 {total}
      </Chip>
      {CUSTOMER_STATUSES.map((status) => (
        <Chip key={status} active={current === status} to={href(status, q)}>
          {CUSTOMER_STATUS_LABELS[status]} {counts[status]}
        </Chip>
      ))}
    </div>
  );
}
```

`components/customers/CustomerSearch.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { initialQuery: string; status: string | null };

export default function CustomerSearch({ initialQuery, status }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (value.trim()) params.set("q", value.trim());
    const query = params.toString();
    router.push(query ? `/admin/customers?${query}` : "/admin/customers");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="이름 / 사무실 / 연락처 / 이메일"
        className="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm"
      />
      <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
        검색
      </button>
    </form>
  );
}
```

- [ ] **Step 4: 임박 섹션 + 목록**

`components/customers/EndingSoonSection.tsx`:
```tsx
import Link from "next/link";
import { Box, HStack, Text } from "@seed-design/react";
import type { CustomerRecord } from "@/lib/customers/types";
import { getTrialDDay } from "@/lib/customers/trial";
import TrialDDayBadge from "./TrialDDayBadge";

type Props = { customers: CustomerRecord[]; today: string };

function ReminderMark({ label, on }: { label: string; on: string | null }) {
  return (
    <Text as="span" textStyle="t2Regular" color={on ? "fg.neutralSubtle" : "fg.critical"}>
      {label} {on ? "✓" : "✗"}
    </Text>
  );
}

export default function EndingSoonSection({ customers, today }: Props) {
  if (customers.length === 0) return null;

  return (
    <Box>
      <Text as="h2" textStyle="t2Bold" color="fg.critical" className="mb-2">
        ⚠ 체험 종료 임박 ({customers.length})
      </Text>
      <Box as="ul" borderWidth={1} borderColor="stroke.criticalWeak" borderRadius="r2">
        {customers.map((customer, index) => (
          <HStack
            key={customer.id}
            as="li"
            align="center"
            justify="space-between"
            gap="x4"
            px="x4"
            py="x3"
            borderBottomWidth={index === customers.length - 1 ? 0 : 1}
            borderColor="stroke.neutralWeak"
          >
            <HStack align="center" gap="x2" minWidth="0">
              <TrialDDayBadge dday={getTrialDDay(customer.trialStartedOn, today)!} />
              <Text as="span" textStyle="t4Medium" color="fg.neutral" maxLines={1}>
                {customer.name}
                {customer.office && ` · ${customer.office}`}
              </Text>
            </HStack>
            <HStack align="center" gap="x3" flexShrink={0}>
              <ReminderMark label="리마인드 1차" on={customer.reminded1On} />
              <ReminderMark label="2차" on={customer.reminded2On} />
              <Link href={`/admin/customers/${customer.id}`} className="text-xs font-medium text-gray-700 underline">
                열기
              </Link>
            </HStack>
          </HStack>
        ))}
      </Box>
    </Box>
  );
}
```

`components/customers/CustomersTable.tsx`:
```tsx
import Link from "next/link";
import { Box, HStack, Text } from "@seed-design/react";
import type { CustomerRecord } from "@/lib/customers/types";
import { formatDate } from "@/lib/format";
import { getTrialDDay, getTrialEndsOn } from "@/lib/customers/trial";
import CustomerStatusBadge from "./CustomerStatusBadge";
import TrialDDayBadge from "./TrialDDayBadge";

type Props = { customers: CustomerRecord[]; today: string };

function CustomerRow({ customer, isLast, today }: { customer: CustomerRecord; isLast: boolean; today: string }) {
  const dday = customer.status === "trial" ? getTrialDDay(customer.trialStartedOn, today) : null;
  const endsOn = getTrialEndsOn(customer.trialStartedOn);
  const contact = [customer.phone, customer.email].filter(Boolean).join(" · ");

  return (
    <HStack
      as="li"
      align="center"
      justify="space-between"
      gap="x4"
      px="x4"
      py="x4"
      borderBottomWidth={isLast ? 0 : 1}
      borderColor="stroke.neutralWeak"
    >
      <Box minWidth="0" flexGrow={1}>
        <HStack align="center" gap="x2" minWidth="0">
          <CustomerStatusBadge status={customer.status} />
          <Text as="span" textStyle="t4Medium" color="fg.neutral" maxLines={1}>
            {customer.name}
            {customer.office && ` · ${customer.office}`}
          </Text>
        </HStack>
        <Text as="p" textStyle="t2Regular" color="fg.neutralSubtle" className="mt-1">
          {contact}
        </Text>
        <Text as="p" textStyle="t2Regular" color="fg.neutralSubtle" className="mt-0.5">
          접수 {formatDate(customer.submittedAt)}
          {customer.source && ` · 유입: ${customer.source}`}
        </Text>
      </Box>
      <HStack flexShrink={0} align="center" gap="x3">
        {customer.trialStartedOn && endsOn && (
          <HStack align="center" gap="x2">
            <Text as="span" textStyle="t2Regular" color="fg.neutralSubtle">
              체험 {customer.trialStartedOn.slice(5).replace("-", ".")}~{endsOn.slice(5).replace("-", ".")}
            </Text>
            {dday !== null && <TrialDDayBadge dday={dday} />}
          </HStack>
        )}
        <Link href={`/admin/customers/${customer.id}`} className="text-xs font-medium text-gray-700 underline">
          열기
        </Link>
      </HStack>
    </HStack>
  );
}

export default function CustomersTable({ customers, today }: Props) {
  if (customers.length === 0) {
    return (
      <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
        조건에 맞는 고객이 없어요.
      </Text>
    );
  }

  return (
    <Box as="ul" borderWidth={1} borderColor="stroke.neutralWeak" borderRadius="r2">
      {customers.map((customer, index) => (
        <CustomerRow
          key={customer.id}
          customer={customer}
          isLast={index === customers.length - 1}
          today={today}
        />
      ))}
    </Box>
  );
}
```

- [ ] **Step 5: 목록 페이지**

`app/admin/customers/page.tsx`:
```tsx
import Link from "next/link";
import { VStack } from "@seed-design/react";
import { listCustomers } from "@/lib/customers/repository";
import { customerStatusSchema, CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/customers/types";
import { isTrialEndingSoon, todayInSeoul } from "@/lib/customers/trial";
import CustomersTable from "@/components/customers/CustomersTable";
import EndingSoonSection from "@/components/customers/EndingSoonSection";
import StatusFilterChips from "@/components/customers/StatusFilterChips";
import CustomerSearch from "@/components/customers/CustomerSearch";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; q?: string }>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: rawStatus, q: rawQ } = await searchParams;
  const statusFilter: CustomerStatus | null = customerStatusSchema.safeParse(rawStatus).success
    ? (rawStatus as CustomerStatus)
    : null;
  const q = rawQ?.trim() ?? "";

  // 상태 필터는 메모리에서 건다 — 건수 뱃지에 전체 분포가 필요하고, 고객 수가
  // 수백 명 이하라 한 번 다 읽는 편이 쿼리 둘보다 단순하다.
  const all = await listCustomers({ q });
  const today = todayInSeoul();

  const counts = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s, 0])) as Record<CustomerStatus, number>;
  for (const customer of all) counts[customer.status] += 1;

  const filtered = statusFilter ? all.filter((c) => c.status === statusFilter) : all;
  const endingSoon = all.filter((c) => isTrialEndingSoon(c, today));

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">고객 신청</h1>
        <Link
          href="/admin/customers/new"
          className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          + 고객 추가
        </Link>
      </div>

      <VStack gap="x6">
        <EndingSoonSection customers={endingSoon} today={today} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusFilterChips current={statusFilter} counts={counts} total={all.length} q={q} />
          <CustomerSearch initialQuery={q} status={statusFilter} />
        </div>
        <CustomersTable customers={filtered} today={today} />
      </VStack>
    </div>
  );
}
```

- [ ] **Step 6: 브라우저 확인**

`/admin/customers`: 사이드바 "고객 신청" 활성. Task 5·6에서 만든 행이 보임. 칩 클릭 → URL `?status=` 바뀌고 목록 필터됨. 검색 "API" → 매칭 행만. `trial` 상태에 시작일이 23~33일 전인 고객이 있으면(없으면 Task 8에서 만든 뒤 재확인) 임박 섹션 노출.

- [ ] **Step 7: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add components/admin/Sidebar.tsx components/customers app/admin/customers/page.tsx
git commit -m "feat: add customers list page with filters, search, and ending-soon section

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: 고객 상세/수정 + 추가 화면

**Files:**
- Create: `components/customers/DateField.tsx`, `components/customers/CustomerForm.tsx`, `components/customers/DeleteCustomerButton.tsx`, `app/admin/customers/[id]/page.tsx`, `app/admin/customers/new/page.tsx`

**Interfaces:**
- Consumes: `CustomerRecord/CustomerInput/CUSTOMER_STATUSES/CUSTOMER_STATUS_LABELS`(Task 2), `getCustomerById`(Task 3), `getPageById`, `trial.ts`(Task 1), `CustomerStatusBadge`(Task 7), API(Task 6)
- Produces: `CustomerForm({ mode, initial?, sourcePage? })`

- [ ] **Step 1: DateField**

`components/customers/DateField.tsx`:
```tsx
"use client";

import { todayInSeoul } from "@/lib/customers/trial";

type Props = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
};

export default function DateField({ label, value, onChange, hint }: Props) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => onChange(todayInSeoul())}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          오늘
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`${label} 지우기`}
            className="px-1 text-xs text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 2: 삭제 버튼**

`components/customers/DeleteCustomerButton.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

type Props = { id: string; name: string };

export default function DeleteCustomerButton({ id, name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(`"${name}" 고객을 삭제할까요? 되돌릴 수 없어요.`)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }
      router.push("/admin/customers");
      router.refresh();
    } catch {
      setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <ActionButton
        type="button"
        variant="ghost"
        size="xsmall"
        color="fg.critical"
        onClick={handleClick}
        loading={loading}
        disabled={loading}
      >
        삭제
      </ActionButton>
      {error && (
        <Text as="p" textStyle="t2Regular" color="fg.critical" className="mt-1 text-right">
          {error}
        </Text>
      )}
    </div>
  );
}
```

- [ ] **Step 3: CustomerForm**

`components/customers/CustomerForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type CustomerInput,
  type CustomerRecord,
  type CustomerStatus,
} from "@/lib/customers/types";
import { formatDDay, getTrialDDay, getTrialEndsOn, todayInSeoul } from "@/lib/customers/trial";
import CustomerStatusBadge from "./CustomerStatusBadge";
import DateField from "./DateField";
import DeleteCustomerButton from "./DeleteCustomerButton";

type Props =
  | { mode: "create" }
  | { mode: "edit"; initial: CustomerRecord; sourcePage: { id: string; title: string } | null };

const EMPTY: CustomerInput = {
  name: "",
  office: "",
  phone: "",
  email: "",
  consented: false,
  source: "직접 추가",
  status: "new",
  trialStartedOn: null,
  kakaoAdminSetOn: null,
  reminded1On: null,
  reminded2On: null,
  memo: "",
};

const inputClass = "w-full rounded border border-gray-300 px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-gray-700";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function CustomerForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : null;
  const [form, setForm] = useState<CustomerInput>(
    initial
      ? {
          name: initial.name,
          office: initial.office,
          phone: initial.phone,
          email: initial.email,
          consented: initial.consented,
          source: initial.source,
          status: initial.status,
          trialStartedOn: initial.trialStartedOn,
          kakaoAdminSetOn: initial.kakaoAdminSetOn,
          reminded1On: initial.reminded1On,
          reminded2On: initial.reminded2On,
          memo: initial.memo,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const today = todayInSeoul();
  const endsOn = getTrialEndsOn(form.trialStartedOn);
  const dday = getTrialDDay(form.trialStartedOn, today);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const url = initial ? `/api/customers/${initial.id}` : "/api/customers";
    const method = initial ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        if (response.status === 401) setError("세션이 만료되었어요. 다시 로그인해주세요.");
        else if (response.status === 400) setError("입력값을 확인해주세요. 이름과 연락처는 필수예요.");
        else setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      router.push("/admin/customers");
      router.refresh();
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">
            {initial ? initial.name : "고객 추가"}
          </h1>
          {initial && <CustomerStatusBadge status={initial.status} />}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as CustomerStatus)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {CUSTOMER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CUSTOMER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {initial && <DeleteCustomerButton id={initial.id} name={initial.name} />}
        </div>
      </div>

      <section className="space-y-3 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900">기본 정보</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>이름 *</label>
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>사무실</label>
            <input type="text" value={form.office} onChange={(e) => set("office", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>연락처 *</label>
            <input type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>이메일</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>유입경로</label>
            <input type="text" value={form.source} onChange={(e) => set("source", e.target.value)} className={inputClass} />
            {props.mode === "edit" && props.sourcePage && (
              <p className="mt-1 text-xs text-gray-500">
                신청 페이지:{" "}
                <Link href={`/admin/${props.sourcePage.id}/edit`} className="underline">
                  {props.sourcePage.title} →
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>개인정보 수집 동의</label>
            {initial ? (
              <p className="py-2 text-sm text-gray-700">{initial.consented ? "동의함" : "동의 안 함"}</p>
            ) : (
              <label className="flex items-center gap-2 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.consented} onChange={(e) => set("consented", e.target.checked)} />
                동의 받음
              </label>
            )}
          </div>
          {initial && (
            <div>
              <label className={labelClass}>접수시각</label>
              <p className="py-2 text-sm text-gray-700">{formatDateTime(initial.submittedAt)}</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900">진행</h2>
        <DateField
          label="한 달 무료 체험 시작일"
          value={form.trialStartedOn}
          onChange={(v) => set("trialStartedOn", v)}
          hint={
            endsOn && dday !== null
              ? `종료 예정 ${endsOn} (${formatDDay(dday)})`
              : "시작일을 넣으면 상태가 '신규'일 때 '체험중'으로 자동 전환돼요."
          }
        />
        <DateField label="카카오 관리자 설정 완료" value={form.kakaoAdminSetOn} onChange={(v) => set("kakaoAdminSetOn", v)} />
        <DateField label="리마인드 1차" value={form.reminded1On} onChange={(v) => set("reminded1On", v)} />
        <DateField label="리마인드 2차" value={form.reminded2On} onChange={(v) => set("reminded2On", v)} />
      </section>

      <section className="space-y-2 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900">메모</h2>
        <textarea
          rows={5}
          value={form.memo}
          onChange={(e) => set("memo", e.target.value)}
          className={inputClass}
        />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Link href="/admin/customers" className="rounded border border-gray-300 px-4 py-2 text-sm">
          취소
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: 페이지 두 개**

`app/admin/customers/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getCustomerById } from "@/lib/customers/repository";
import { getPageById } from "@/lib/pages/repository";
import CustomerForm from "@/components/customers/CustomerForm";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const page = customer.sourcePageId ? await getPageById(customer.sourcePageId) : null;
  const sourcePage = page ? { id: page.id, title: page.title } : null;

  return <CustomerForm mode="edit" initial={customer} sourcePage={sourcePage} />;
}
```

`app/admin/customers/new/page.tsx`:
```tsx
import CustomerForm from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return <CustomerForm mode="create" />;
}
```

주의: `app/admin/customers/[id]`와 `app/admin/customers/new`가 같은 레벨이지만 Next는 정적 세그먼트 `new`를 동적 `[id]`보다 우선하므로 충돌 없다.

- [ ] **Step 5: 브라우저 확인**

1. `/admin/customers/new` → 이름·연락처 넣고 저장 → 목록에 "신규"로 노출, 유입 "직접 추가".
2. 그 고객 "열기" → 체험 시작일 [오늘] → 힌트에 종료일과 `D-30` → 저장 → 목록에서 "체험중"(자동 전환) + 체험 기간 표시.
3. 다시 열어 시작일을 25일 전으로 바꿔 저장 → 목록 상단 "체험 종료 임박" 섹션에 `D-5`로 노출, 리마인드 ✗ ✗ 빨강. 리마인드 1차 [오늘] 저장 → ✓로 바뀜.
4. 상태를 "전환"으로 바꾸고 저장 → 임박 섹션에서 사라짐.
5. 폼 제출로 들어온 고객(Task 5) 열기 → "신청 페이지: … →" 링크 동작.
6. 삭제 → confirm → 목록으로 이동, 행 사라짐. 존재하지 않는 id URL → 404.

- [ ] **Step 6: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add components/customers/DateField.tsx components/customers/CustomerForm.tsx components/customers/DeleteCustomerButton.tsx "app/admin/customers/[id]/page.tsx" app/admin/customers/new/page.tsx
git commit -m "feat: add customer detail/edit and create pages

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: 시트 CSV 임포트

**Files:**
- Create: `lib/customers/import.ts`, `lib/customers/import.test.ts`, `scripts/import-customers.ts`

**Interfaces:**
- Produces:
  ```ts
  export function parseCsv(text: string): string[][];                 // RFC4180 (따옴표, 줄바꿈 포함 필드)
  export function parseSheetDate(raw: string): string | null;         // → "YYYY-MM-DD"
  export function parseSheetDateTime(raw: string): string | null;     // → ISO (KST 해석)
  export function parseConsent(raw: string): boolean;
  export type ImportRow = CustomerInput & { submittedAt: string; sourcePageId: null };
  export type ImportResult = { row: ImportRow | null; warnings: string[] };
  export function mapSheetRow(header: string[], cells: string[], nowIso: string, currentYear: number): ImportResult;
  ```

- [ ] **Step 1: 실패하는 테스트**

`lib/customers/import.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mapSheetRow, parseConsent, parseCsv, parseSheetDate, parseSheetDateTime } from "./import";

describe("parseCsv", () => {
  it("따옴표 안의 쉼표와 줄바꿈을 보존한다", () => {
    const text = 'a,b,c\n"x, y","line1\nline2",""\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["x, y", "line1\nline2", ""],
    ]);
  });
  it("이중 따옴표 이스케이프", () => {
    expect(parseCsv('"say ""hi"""')).toEqual([['say "hi"']]);
  });
  it("CRLF 처리", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("parseSheetDate", () => {
  it("여러 시트 형식", () => {
    expect(parseSheetDate("2026. 9. 1")).toBe("2026-09-01");
    expect(parseSheetDate("2026.09.01")).toBe("2026-09-01");
    expect(parseSheetDate("2026-09-01")).toBe("2026-09-01");
    expect(parseSheetDate("2026/9/1")).toBe("2026-09-01");
    expect(parseSheetDate("2026. 9. 1 오후 3:24:10")).toBe("2026-09-01");
  });
  it("연도 없으면 올해", () => {
    const year = new Date().getFullYear();
    expect(parseSheetDate("9/1")).toBe(`${year}-09-01`);
    expect(parseSheetDate("9월 1일")).toBe(`${year}-09-01`);
  });
  it("못 읽으면 null", () => {
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate("완료")).toBeNull();
    expect(parseSheetDate("2026-13-01")).toBeNull();
  });
});

describe("parseSheetDateTime", () => {
  it("한국어 오전/오후 시각을 KST로 해석", () => {
    expect(parseSheetDateTime("2026. 9. 1 오후 3:24:10")).toBe("2026-09-01T06:24:10.000Z");
    expect(parseSheetDateTime("2026. 9. 1 오전 12:05:00")).toBe("2026-08-31T15:05:00.000Z");
    expect(parseSheetDateTime("2026. 9. 1 오후 12:00:00")).toBe("2026-09-01T03:00:00.000Z");
  });
  it("시각 없으면 KST 자정", () => {
    expect(parseSheetDateTime("2026-09-01")).toBe("2026-08-31T15:00:00.000Z");
  });
  it("못 읽으면 null", () => {
    expect(parseSheetDateTime("")).toBeNull();
  });
});

describe("parseConsent", () => {
  it("긍정 표현은 true", () => {
    for (const v of ["예", "네", "동의", "동의합니다", "TRUE", "true", "Y", "O", "✓", " 예 "]) {
      expect(parseConsent(v)).toBe(true);
    }
  });
  it("그 외 false", () => {
    for (const v of ["", "아니오", "FALSE", "X"]) expect(parseConsent(v)).toBe(false);
  });
});

describe("mapSheetRow", () => {
  const header = ["접수시각", "이름", "사무실", "연락처", "이메일", "동의", "유입경로", "한 달 무료 체험 시작일", "카카오 관리자 설정", "리마인드 1차", "리마인드 2차"];
  const now = "2026-09-16T00:00:00.000Z";

  it("정상 행을 매핑하고 체험 시작일이 있으면 trial", () => {
    const cells = ["2026. 9. 1 오후 3:24:10", "김세무", "세무법인 A", "010 1234 5678", "kim@a.com", "예", "인스타", "2026. 9. 2", "2026. 9. 3", "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(warnings).toEqual([]);
    expect(row).toMatchObject({
      submittedAt: "2026-09-01T06:24:10.000Z",
      name: "김세무",
      office: "세무법인 A",
      phone: "01012345678",
      email: "kim@a.com",
      consented: true,
      source: "인스타",
      status: "trial",
      trialStartedOn: "2026-09-02",
      kakaoAdminSetOn: "2026-09-03",
      reminded1On: null,
      reminded2On: null,
      memo: "",
      sourcePageId: null,
    });
  });
  it("유입경로 비면 Google Form, 시작일 없으면 new", () => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1", "", "", "", "", "", "", ""];
    const { row } = mapSheetRow(header, cells, now, 2026);
    expect(row?.source).toBe("Google Form");
    expect(row?.status).toBe("new");
  });
  it("날짜 파싱 실패는 필드만 비우고 경고", () => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1", "", "", "", "완료", "", "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(row?.trialStartedOn).toBeNull();
    expect(warnings.some((w) => w.includes("한 달 무료 체험 시작일"))).toBe(true);
  });
  it("접수시각 못 읽으면 now로 대체하고 경고", () => {
    const cells = ["", "박회계", "", "010-1", "", "", "", "", "", "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(row?.submittedAt).toBe(now);
    expect(warnings.some((w) => w.includes("접수시각"))).toBe(true);
  });
  it("이름 또는 연락처가 비면 row null", () => {
    expect(mapSheetRow(header, ["", "", "", "010-1", "", "", "", "", "", "", ""], now, 2026).row).toBeNull();
    expect(mapSheetRow(header, ["", "박", "", "", "", "", "", "", "", "", ""], now, 2026).row).toBeNull();
  });
  it("헤더 앞뒤 공백 무시", () => {
    const spaced = header.map((h) => ` ${h} `);
    const { row } = mapSheetRow(spaced, ["", "박", "", "010-1", "", "", "", "", "", "", ""], now, 2026);
    expect(row?.name).toBe("박");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/customers/import.test.ts`
Expected: FAIL — `Failed to resolve import "./import"`

- [ ] **Step 3: 구현**

`lib/customers/import.ts`:
```ts
import { normalizePhone, type CustomerInput } from "./types";

// RFC 4180: 따옴표로 감싼 필드 안의 쉼표·줄바꿈·""를 처리한다.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

type Ymd = { y: number; m: number; d: number; rest: string };

// "2026. 9. 1", "2026-09-01", "2026/9/1", "9/1", "9월 1일" 등에서 연월일을 뽑는다.
// 뒤에 남는 문자열(시각)은 rest로 돌려준다.
function extractYmd(raw: string, currentYear: number): Ymd | null {
  const s = raw.trim();
  if (!s) return null;

  let match = s.match(/^(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\.?\s*(.*)$/);
  if (match) {
    const [, y, m, d, rest] = match;
    return { y: Number(y), m: Number(m), d: Number(d), rest };
  }
  match = s.match(/^(\d{1,2})\s*[/.]\s*(\d{1,2})\.?\s*(.*)$/);
  if (match) {
    const [, m, d, rest] = match;
    return { y: currentYear, m: Number(m), d: Number(d), rest };
  }
  match = s.match(/^(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일\s*(.*)$/);
  if (match) {
    const [, y, m, d, rest] = match;
    return { y: y ? Number(y) : currentYear, m: Number(m), d: Number(d), rest };
  }
  return null;
}

export function parseSheetDate(raw: string, currentYear = new Date().getFullYear()): string | null {
  const ymd = extractYmd(raw, currentYear);
  if (!ymd || !isValidYmd(ymd.y, ymd.m, ymd.d)) return null;
  return `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`;
}

// 시트의 타임스탬프는 한국 시간이다. "오후 3:24:10" 같은 꼬리를 24시간제로 바꿔
// +09:00 오프셋으로 해석한다. 시각이 없으면 그날 KST 자정.
export function parseSheetDateTime(raw: string, currentYear = new Date().getFullYear()): string | null {
  const ymd = extractYmd(raw, currentYear);
  if (!ymd || !isValidYmd(ymd.y, ymd.m, ymd.d)) return null;

  let hh = 0;
  let mm = 0;
  let ss = 0;
  const time = ymd.rest.match(/(오전|오후|AM|PM)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(오전|오후|AM|PM)?/i);
  if (time) {
    const meridiem = (time[1] ?? time[5] ?? "").toUpperCase();
    hh = Number(time[2]);
    mm = Number(time[3]);
    ss = Number(time[4] ?? 0);
    if (meridiem === "오후" || meridiem === "PM") {
      if (hh < 12) hh += 12;
    } else if (meridiem === "오전" || meridiem === "AM") {
      if (hh === 12) hh = 0;
    }
  }

  const iso = `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}+09:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const CONSENT_YES = new Set(["예", "네", "동의", "동의합니다", "동의함", "true", "y", "yes", "o", "✓", "✔"]);

export function parseConsent(raw: string): boolean {
  return CONSENT_YES.has(raw.trim().toLowerCase());
}

const COLUMN_KEYS = {
  접수시각: "submittedAt",
  이름: "name",
  사무실: "office",
  연락처: "phone",
  이메일: "email",
  동의: "consented",
  유입경로: "source",
  "한 달 무료 체험 시작일": "trialStartedOn",
  "카카오 관리자 설정": "kakaoAdminSetOn",
  "리마인드 1차": "reminded1On",
  "리마인드 2차": "reminded2On",
} as const;

type ColumnKey = (typeof COLUMN_KEYS)[keyof typeof COLUMN_KEYS];

export type ImportRow = CustomerInput & { submittedAt: string; sourcePageId: null };
export type ImportResult = { row: ImportRow | null; warnings: string[] };

export function mapSheetRow(
  header: string[],
  cells: string[],
  nowIso: string,
  currentYear: number
): ImportResult {
  const byKey: Partial<Record<ColumnKey, string>> = {};
  const labelByKey: Partial<Record<ColumnKey, string>> = {};
  header.forEach((rawLabel, i) => {
    const label = rawLabel.trim() as keyof typeof COLUMN_KEYS;
    const key = COLUMN_KEYS[label];
    if (key) {
      byKey[key] = (cells[i] ?? "").trim();
      labelByKey[key] = label;
    }
  });

  const warnings: string[] = [];
  const name = byKey.name ?? "";
  const phone = normalizePhone(byKey.phone ?? "");
  if (!name || !phone) {
    return { row: null, warnings: [`이름(${name || "없음"}) 또는 연락처(${phone || "없음"})가 비어 건너뜀`] };
  }

  function dateField(key: ColumnKey): string | null {
    const raw = byKey[key] ?? "";
    if (!raw) return null;
    const parsed = parseSheetDate(raw, currentYear);
    if (!parsed) warnings.push(`${name}: "${labelByKey[key]}" 값 "${raw}"을(를) 날짜로 읽지 못해 비움`);
    return parsed;
  }

  let submittedAt = parseSheetDateTime(byKey.submittedAt ?? "", currentYear);
  if (!submittedAt) {
    warnings.push(`${name}: "접수시각" 값 "${byKey.submittedAt ?? ""}"을(를) 읽지 못해 현재 시각으로 대체`);
    submittedAt = nowIso;
  }

  const trialStartedOn = dateField("trialStartedOn");

  return {
    row: {
      submittedAt,
      name,
      office: byKey.office ?? "",
      phone,
      email: byKey.email ?? "",
      consented: parseConsent(byKey.consented ?? ""),
      source: byKey.source || "Google Form",
      sourcePageId: null,
      status: trialStartedOn ? "trial" : "new",
      trialStartedOn,
      kakaoAdminSetOn: dateField("kakaoAdminSetOn"),
      reminded1On: dateField("reminded1On"),
      reminded2On: dateField("reminded2On"),
      memo: "",
    },
    warnings,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/customers/import.test.ts`
Expected: PASS. (`"2026. 9. 1 오후 3:24:10"`의 `extractYmd` rest는 `"오후 3:24:10"`이어야 한다 — 첫 정규식의 `\.?\s*` 가 `1` 뒤 공백을 먹는다.)

- [ ] **Step 5: CLI 스크립트**

`scripts/import-customers.ts`:
```ts
/**
 * Google Sheet에서 내려받은 CSV를 customers 테이블로 1회 임포트한다.
 *
 *   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/import-customers.ts <csv> [--dry-run] [--force]
 *
 * --dry-run : insert 없이 행별 결과만 출력
 * --force   : customers에 이미 행이 있어도 진행 (기본은 중복 임포트를 막기 위해 중단)
 */
import { readFileSync } from "node:fs";
import { mapSheetRow, parseCsv, type ImportRow } from "@/lib/customers/import";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  if (!file) {
    console.error("사용법: import-customers.ts <csv> [--dry-run] [--force]");
    process.exit(1);
  }

  const [header, ...body] = parseCsv(readFileSync(file, "utf8"));
  if (!header) {
    console.error("CSV가 비어 있어요.");
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const rows: ImportRow[] = [];
  let skipped = 0;

  body.forEach((cells, i) => {
    if (cells.every((c) => c.trim() === "")) return;
    const { row, warnings } = mapSheetRow(header, cells, nowIso, currentYear);
    for (const w of warnings) console.warn(`  [행 ${i + 2}] ${w}`);
    if (row) rows.push(row);
    else skipped += 1;
  });

  console.log(`\n읽은 행 ${body.length} → 임포트 ${rows.length}, 건너뜀 ${skipped}`);
  const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("상태 분포:", statusCounts);

  if (dryRun) {
    console.log("\n--dry-run: 처음 3행 미리보기");
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
    process.exit(0);
  }

  const supabase = getSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0 && !force) {
    console.error(`\ncustomers에 이미 ${count}행이 있어요. 중복 임포트를 막기 위해 중단합니다. 정말 추가하려면 --force.`);
    process.exit(1);
  }

  const payload = rows.map((r) => ({
    submitted_at: r.submittedAt,
    name: r.name,
    office: r.office,
    phone: r.phone,
    email: r.email,
    consented: r.consented,
    source: r.source,
    source_page_id: null,
    status: r.status,
    trial_started_on: r.trialStartedOn,
    kakao_admin_set_on: r.kakaoAdminSetOn,
    reminded_1_on: r.reminded1On,
    reminded_2_on: r.reminded2On,
    memo: r.memo,
  }));

  const { error } = await supabase.from("customers").insert(payload);
  if (error) throw error;
  console.log(`\n${payload.length}행 임포트 완료`);
}

// package.json에 "type": "module"이 없어 top-level await를 쓸 수 없다.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 6: 샘플 CSV로 dry-run 확인**

```bash
cat > /tmp/sample.csv <<'EOF'
접수시각,이름,사무실,연락처,이메일,동의,유입경로,한 달 무료 체험 시작일,카카오 관리자 설정,리마인드 1차,리마인드 2차
2026. 9. 1 오후 3:24:10,김세무,세무법인 A,010-1234-5678,kim@a.com,예,,2026. 9. 2,,,
2026. 9. 3 오전 10:00:00,박회계,,010-9999-0000,,예,블로그,,,,
EOF
npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/import-customers.ts /tmp/sample.csv --dry-run
```
Expected: `읽은 행 2 → 임포트 2, 건너뜀 0`, 상태 분포 `{ trial: 1, new: 1 }`, 미리보기 JSON. 실제 시트 CSV는 사용자가 전달하면 같은 명령으로 dry-run → 확인 → `--dry-run` 빼고 실행 (이미 테스트 행이 있으면 `--force`, 단 그 전에 어드민에서 테스트 행 삭제 권장).

- [ ] **Step 7: 커밋**

```bash
npx tsc --noEmit && npm run lint
git add lib/customers/import.ts lib/customers/import.test.ts scripts/import-customers.ts
git commit -m "feat: add one-off Google Sheet CSV import for customers

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트·타입·린트·빌드**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```
Expected: 전부 통과. `build`가 `app/admin/customers/[id]`/`new` 충돌이나 `searchParams` 타입 문제를 잡으면 여기서 고친다.

- [ ] **Step 2: 엔드투엔드 수동 시나리오**

1. `/admin/new` → 배너·텍스트·신청 폼 블록 → 발행.
2. 시크릿 창에서 `/c/<slug>` → 폼 제출 → 완료 메시지.
3. `/admin/customers` → 방금 제출이 "신규"로 맨 위, 유입경로 = 페이지 제목.
4. 열기 → 체험 시작일 [오늘] → 저장 → "체험중" 자동 전환.
5. 시작일을 25일 전으로 → 임박 섹션 `D-5`.
6. 상태 "전환" → 임박 섹션에서 제거. 필터 "전환"에 나옴.
7. 삭제 → 목록에서 사라짐.
8. 테스트 페이지 보관.

- [ ] **Step 3: 스펙 대조**

스펙 §1~§4 각 항목이 구현됐는지 훑는다. 특히: 폼 최대 1개 제한(에디터 버튼 + 서버 refine), 미발행 페이지 제출 차단(클라 disabled + 서버 404), honeypot, `on delete set null`, 검색 4개 컬럼, 임박 범위 -7~+3.

- [ ] **Step 4: PR**

```bash
git push -u origin customer-applications
```
PR 제목: `feat: customer applications — form block, admin CRM, sheet import`. 본문에 스펙 링크와 "Supabase SQL Editor에서 `supabase/schema.sql`의 customers 블록을 실행해야 함"을 명시. 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
