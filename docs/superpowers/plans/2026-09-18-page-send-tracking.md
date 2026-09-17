# 페이지 전송 기록(전송일·태그) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 발행한 랜딩페이지를 고객에게 실제로 보낸 날짜와 수신 대상 태그를 `/admin/published`에서 기록하고, 전송된 페이지의 뱃지를 "전송됨"으로 보여준다.

**Architecture:** 기존 패턴 그대로 — `pages` 테이블에 컬럼 2개 추가 → zod 스키마(`lib/pages/types.ts`) → repository(`lib/pages/repository.ts`)에 전송 정보만 갱신하는 함수 → 전용 API route → `/admin/published`의 클라이언트 컴포넌트가 변경 즉시 자동 저장. 에디터 저장 경로(`PATCH /api/pages/[id]`)는 전송 컬럼을 건드리지 않는다.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (`@supabase/supabase-js`, 서비스 롤), zod 4, seed-design (`@seed-design/react` `Box/HStack/VStack/Text/Badge`), Tailwind 4, Vitest.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-09-18-page-send-tracking-design.md`
- 브랜치 `page-send-tracking`에서 작업한다 (이미 생성됨, HEAD `1dad034`).
- Next.js 16은 학습 데이터와 다르다. API 라우트/페이지의 `params`·`searchParams`는 `Promise`이며 `await` 해야 한다. 미들웨어 파일은 `proxy.ts`다.
- 관리자 API는 `requireAdminSession(request)`로 시작하고 실패 시 `401 {error:"unauthorized"}`. 에러 형식 `400 {error:"invalid_input", fieldErrors}`, `404 {error:"not_found"}`, `500 {error:"save_failed"}`.
- 날짜는 앱 전체에서 `"YYYY-MM-DD"` 문자열. "오늘"은 `Asia/Seoul` 기준(`todayInSeoul()`).
- `status`(draft/published/archived)는 **건드리지 않는다.** "전송됨"은 `sentOn !== null`로 판단한다.
- 태그: 각 항목 1~50자, 최대 **20개**, 앞뒤 공백 제거, 빈 문자열 제거, 중복 제거(입력 순서 유지).
- **에디터 저장(`PATCH /api/pages/[id]`)이 전송 기록을 덮어쓰면 안 된다.** `pageInputSchema`에 전송 필드를 넣지 않고, `updatePage`도 두 컬럼을 갱신하지 않는다.
- `/admin/published` 정렬: **전송일이 있으면 전송일, 없으면 발행일** 기준 내림차순.
- 어드민 UI는 seed-design `Box/HStack/VStack/Text/Badge` + Tailwind, 기존 `PagesTable.tsx`/`app/admin/published/page.tsx` 패턴을 따른다. 존재하는 stroke 토큰은 `stroke.neutralWeak`, `stroke.criticalWeak`. `Badge`의 `tone`은 `neutral | informative | positive | warning | critical`.
- 주석은 한국어, "왜"를 설명할 때만.
- 커밋 메시지는 `feat:`/`fix:`/`test:` 접두어, 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- 각 태스크 끝에 `npx tsc --noEmit && npm run lint && npm test`가 통과해야 한다.
- **프로덕션 Supabase에는 실제 고객 5건과 실제 페이지 16건이 있다.** 검증용으로 만든 페이지는 반드시 지우고, 기존 데이터의 내용은 바꾸지 않는다. (기존 페이지에 전송일·태그를 넣어보는 것은 괜찮다 — 되돌릴 수 있고 새 컬럼이라 기존 동작에 영향이 없다. 단, 검증 후 `null`/빈 배열로 되돌린다.)

---

## File Structure

| 파일 | 역할 |
|---|---|
| `supabase/schema.sql` (수정) | `sent_on`, `send_tags` 컬럼 + 인덱스 |
| `lib/pages/types.ts` (수정) | `pageSendSchema`, `PageSendInput`, `PageRecord`에 `sentOn`/`sendTags`, `normalizeSendTags` |
| `lib/pages/types.test.ts` (신규) | 스키마·태그 정규화 테스트 |
| `lib/pages/badge.ts` (신규) | `getPageBadge(status, sentOn)` 순수 함수 |
| `lib/pages/badge.test.ts` (신규) | 뱃지 규칙 테스트 |
| `lib/pages/repository.ts` (수정) | row 매핑에 두 컬럼 추가, `updatePageSend` 추가 |
| `components/dashboard/StatusBadge.tsx` (수정) | `{status, sentOn}`을 받아 `getPageBadge` 사용 |
| `app/api/pages/[id]/send/route.ts` (신규) | PATCH 핸들러 |
| `components/dashboard/SendControls.tsx` (신규, client) | 전송일 + 태그 입력, 자동 저장 |
| `app/admin/published/page.tsx` (수정) | 정렬 변경, `SendControls` 배치 |
| `components/dashboard/PagesTable.tsx` (수정) | `StatusBadge` 호출 형태만 변경 |

---

### Task 1: 스키마 · 타입 · repository

**Files:**
- Modify: `supabase/schema.sql`, `lib/pages/types.ts`, `lib/pages/repository.ts`
- Create: `lib/pages/types.test.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient`
- Produces:
  ```ts
  export function normalizeSendTags(tags: string[]): string[]; // 트림·빈값 제거·중복 제거(순서 유지)
  export const MAX_SEND_TAGS = 20;
  export const pageSendSchema: z.ZodType<{ sentOn: string | null; sendTags: string[] }>;
  export type PageSendInput = { sentOn: string | null; sendTags: string[] };
  // PageRecord에 sentOn: string | null, sendTags: string[] 추가
  export async function updatePageSend(id: string, input: PageSendInput): Promise<PageRecord | null>;
  ```

- [ ] **Step 1: 스키마 추가**

`supabase/schema.sql` 끝에 추가:
```sql
-- 2026-09-18 마이그레이션: 페이지 전송 기록.
-- 발행(published_at)과 별개로, 실제로 고객에게 링크를 보낸 날짜와 수신 대상 태그를 남긴다.
alter table pages add column if not exists sent_on date;
alter table pages add column if not exists send_tags text[] not null default '{}';

create index if not exists pages_sent_on_idx on pages (sent_on desc);
```

- [ ] **Step 2: Supabase에 적용하고 확인**

Supabase 대시보드 SQL Editor에서 위 블록을 실행한다(서비스 롤 키로는 DDL을 할 수 없어 대시보드가 유일한 경로다). 사람이 실행해야 하므로, 실행을 요청하고 결과를 기다린다. 확인:
```bash
cd "/Users/yeongseonpark/Desktop/클로드/tax auto"
set -a && source .env.local && set +a
curl -s "$SUPABASE_URL/rest/v1/pages?select=id,sent_on,send_tags&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `[{"id":"...","sent_on":null,"send_tags":[]}]` (컬럼이 없으면 `{"code":"42703",...}`)

- [ ] **Step 3: 실패하는 테스트 작성**

`lib/pages/types.test.ts` 신규:
```ts
import { describe, expect, it } from "vitest";
import { normalizeSendTags, pageSendSchema } from "./types";

describe("normalizeSendTags", () => {
  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeSendTags(["  세무사 1차  "])).toEqual(["세무사 1차"]);
  });
  it("빈 값을 버린다", () => {
    expect(normalizeSendTags(["a", "", "   ", "b"])).toEqual(["a", "b"]);
  });
  it("중복을 제거하고 입력 순서를 유지한다", () => {
    expect(normalizeSendTags(["b", "a", "b", " a "])).toEqual(["b", "a"]);
  });
  it("빈 배열은 빈 배열", () => {
    expect(normalizeSendTags([])).toEqual([]);
  });
});

describe("pageSendSchema", () => {
  it("날짜와 태그를 통과시킨다", () => {
    const result = pageSendSchema.safeParse({ sentOn: "2026-09-10", sendTags: ["세무사 1차"] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sendTags).toEqual(["세무사 1차"]);
  });
  it("sentOn은 null일 수 있다", () => {
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: [] }).success).toBe(true);
  });
  it("날짜 형식이 아니면 거부한다", () => {
    expect(pageSendSchema.safeParse({ sentOn: "2026.09.10", sendTags: [] }).success).toBe(false);
    expect(pageSendSchema.safeParse({ sentOn: "", sendTags: [] }).success).toBe(false);
  });
  it("태그를 정규화해서 돌려준다", () => {
    const result = pageSendSchema.safeParse({ sentOn: null, sendTags: [" a ", "", "a", "b"] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sendTags).toEqual(["a", "b"]);
  });
  it("50자를 넘는 태그는 거부한다", () => {
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: ["x".repeat(51)] }).success).toBe(false);
  });
  it("정규화 후 20개까지 허용하고 21개는 거부한다", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `t${i}`);
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: twenty }).success).toBe(true);
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: [...twenty, "t20"] }).success).toBe(false);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `npm test -- lib/pages/types.test.ts`
Expected: FAIL — `normalizeSendTags`/`pageSendSchema`가 없다는 오류

- [ ] **Step 5: 타입·스키마 구현**

`lib/pages/types.ts`의 `pageInputSchema` 정의 **아래**에 추가한다. `pageInputSchema`에는 전송 필드를 넣지 않는다 — 에디터 저장이 전송 기록을 덮어쓰면 안 되기 때문이다.
```ts
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
```

같은 파일의 `PageRecord` 타입에 두 필드를 추가한다:
```ts
export type PageRecord = PageInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  // 실제로 고객에게 링크를 보낸 날짜와 수신 대상 태그. 발행일과 별개로 관리자가 직접 적는다.
  sentOn: string | null;
  sendTags: string[];
};
```

- [ ] **Step 6: 통과 확인**

Run: `npm test -- lib/pages/types.test.ts`
Expected: PASS (모든 케이스)

- [ ] **Step 7: repository 갱신**

`lib/pages/repository.ts`에서:

1. `PageRow` 타입에 추가:
```ts
  sent_on: string | null;
  send_tags: string[];
```

2. `rowToRecord`의 반환 객체에 추가:
```ts
    sentOn: row.sent_on,
    sendTags: row.send_tags ?? [],
```

3. 파일 끝에 추가:
```ts
/**
 * 전송 기록만 갱신한다. 에디터 저장(updatePage)과 분리해 둔 이유는, 에디터가
 * 블록 전체를 덮어쓰기 때문에 같은 요청에 전송 정보를 실으면 두 화면이 서로의
 * 변경을 지울 수 있어서다.
 */
export async function updatePageSend(
  id: string,
  input: { sentOn: string | null; sendTags: string[] }
): Promise<PageRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .update({
      sent_on: input.sentOn,
      send_tags: input.sendTags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as PageRow) : null;
}
```

`createPage`/`updatePage`는 건드리지 않는다 — 전송 컬럼을 갱신하지 않아야 한다.

- [ ] **Step 8: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add supabase/schema.sql lib/pages/types.ts lib/pages/types.test.ts lib/pages/repository.ts
git commit -m "feat: add send date and tags to pages

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 2: 뱃지 규칙

**Files:**
- Create: `lib/pages/badge.ts`, `lib/pages/badge.test.ts`
- Modify: `components/dashboard/StatusBadge.tsx`, `components/dashboard/PagesTable.tsx`

**Interfaces:**
- Consumes: `PageStatus`(Task 1 이전부터 존재)
- Produces:
  ```ts
  export type PageBadge = { label: string; tone: "neutral" | "informative" | "positive" | "warning" };
  export function getPageBadge(status: PageStatus, sentOn: string | null): PageBadge;
  // StatusBadge의 props: { status: PageStatus; sentOn: string | null }
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/pages/badge.test.ts` 신규:
```ts
import { describe, expect, it } from "vitest";
import { getPageBadge } from "./badge";

describe("getPageBadge", () => {
  it("발행 + 전송일 있음 → 전송됨", () => {
    expect(getPageBadge("published", "2026-09-10")).toEqual({
      label: "전송됨",
      tone: "informative",
    });
  });
  it("발행 + 전송일 없음 → 발행", () => {
    expect(getPageBadge("published", null)).toEqual({ label: "발행", tone: "positive" });
  });
  it("임시저장은 전송일이 있어도 임시저장", () => {
    expect(getPageBadge("draft", "2026-09-10")).toEqual({ label: "임시저장", tone: "warning" });
  });
  it("보관은 전송일이 있어도 보관", () => {
    expect(getPageBadge("archived", "2026-09-10")).toEqual({ label: "보관", tone: "neutral" });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/pages/badge.test.ts`
Expected: FAIL — `Failed to resolve import "./badge"`

- [ ] **Step 3: 구현**

`lib/pages/badge.ts` 신규:
```ts
import type { PageStatus } from "./types";

export type PageBadge = {
  label: string;
  tone: "neutral" | "informative" | "positive" | "warning";
};

/**
 * "전송됨"은 별도 상태가 아니라 발행된 페이지에 전송일이 적혔는지로 판단한다.
 * 상태를 하나 더 늘리면 발행/보관과의 조합이 복잡해지기 때문이다.
 */
export function getPageBadge(status: PageStatus, sentOn: string | null): PageBadge {
  if (status === "draft") return { label: "임시저장", tone: "warning" };
  if (status === "archived") return { label: "보관", tone: "neutral" };
  return sentOn
    ? { label: "전송됨", tone: "informative" }
    : { label: "발행", tone: "positive" };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/pages/badge.test.ts`
Expected: PASS

- [ ] **Step 5: StatusBadge 교체**

`components/dashboard/StatusBadge.tsx` 전체를 아래로 바꾼다:
```tsx
import { Badge } from "@seed-design/react";
import type { PageStatus } from "@/lib/pages/types";
import { getPageBadge } from "@/lib/pages/badge";

export default function StatusBadge({
  status,
  sentOn,
}: {
  status: PageStatus;
  sentOn: string | null;
}) {
  const { label, tone } = getPageBadge(status, sentOn);

  return (
    <Badge tone={tone} variant="weak">
      {label}
    </Badge>
  );
}
```

- [ ] **Step 6: 호출부 갱신**

`components/dashboard/PagesTable.tsx`에서 `<StatusBadge status={page.status} />`를
`<StatusBadge status={page.status} sentOn={page.sentOn} />`로 바꾼다.

`app/admin/published/page.tsx`에도 `<StatusBadge status={page.status} />`가 있다. 같은 방식으로 `sentOn={page.sentOn}`을 넘긴다.

`npx tsc --noEmit`으로 다른 호출부가 남아 있지 않은지 확인한다 — 빠진 곳이 있으면 타입 오류로 잡힌다.

- [ ] **Step 7: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/pages/badge.ts lib/pages/badge.test.ts components/dashboard/StatusBadge.tsx components/dashboard/PagesTable.tsx app/admin/published/page.tsx
git commit -m "feat: show 전송됨 badge for pages with a send date

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 3: 전송 정보 API

**Files:**
- Create: `app/api/pages/[id]/send/route.ts`

**Interfaces:**
- Consumes: `pageSendSchema`(Task 1), `updatePageSend`(Task 1), `requireAdminSession`
- Produces: `PATCH /api/pages/[id]/send` → `200 PageRecord` | `400` | `401` | `404` | `500`

- [ ] **Step 1: 라우트 작성**

`app/api/pages/[id]/send/route.ts` 신규:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pageSendSchema } from "@/lib/pages/types";
import { updatePageSend } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";

// 전송 기록만 따로 저장한다. 에디터 저장(PATCH /api/pages/[id])은 블록 전체를
// 덮어쓰므로, 두 화면이 서로의 변경을 지우지 않도록 엔드포인트를 분리한다.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = pageSendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const page = await updatePageSend(id, parsed.data);
    if (!page) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    console.error("[pages] 전송 기록 저장 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: API 수동 확인**

dev 서버를 백그라운드로 띄운다: `npx next dev -p 3001`. 로그인은 **form-encoded**다.
```bash
cd "/Users/yeongseonpark/Desktop/클로드/tax auto"
set -a && source .env.local && set +a
COOKIE=$(curl -s -i -X POST localhost:3001/api/login -d "password=$ADMIN_PASSWORD" | grep -o 'nugget_admin_session=[^;]*' | head -1)

# 검증용 페이지를 새로 만든다 (기존 16개 페이지는 건드리지 않는다)
PAGE=$(curl -s -X POST localhost:3001/api/pages -H "Content-Type: application/json" -H "Cookie: $COOKIE" \
  -d '{"title":"전송기록 테스트","slug":"send-test-tmp","status":"published","blocks":[]}')
PID=$(echo "$PAGE" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

# 인증 없음 → 401
curl -s -o /dev/null -w "no-auth: %{http_code}\n" -X PATCH localhost:3001/api/pages/$PID/send \
  -H "Content-Type: application/json" -d '{"sentOn":null,"sendTags":[]}'
# 잘못된 날짜 → 400
curl -s -o /dev/null -w "bad-date: %{http_code}\n" -X PATCH localhost:3001/api/pages/$PID/send \
  -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"sentOn":"2026.09.10","sendTags":[]}'
# 정상 → 200, sentOn/sendTags 반영, 태그 정규화 확인
curl -s -X PATCH localhost:3001/api/pages/$PID/send -H "Content-Type: application/json" -H "Cookie: $COOKIE" \
  -d '{"sentOn":"2026-09-10","sendTags":[" 세무사 1차 ","세무사 1차","강남지역",""]}' \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok:',d['sentOn'],d['sendTags'])"
# 없는 id → 404
curl -s -o /dev/null -w "not-found: %{http_code}\n" -X PATCH localhost:3001/api/pages/00000000-0000-0000-0000-000000000000/send \
  -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"sentOn":null,"sendTags":[]}'

# 에디터 저장이 전송 기록을 지우지 않는지 확인 — 이 플랜의 핵심 제약이다
curl -s -X PATCH localhost:3001/api/pages/$PID -H "Content-Type: application/json" -H "Cookie: $COOKIE" \
  -d '{"title":"전송기록 테스트 (수정)","slug":"send-test-tmp","status":"published","blocks":[]}' > /dev/null
curl -s "localhost:3001/api/pages" -H "Cookie: $COOKIE" > /dev/null 2>&1
curl -s "$SUPABASE_URL/rest/v1/pages?select=sent_on,send_tags&id=eq.$PID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `401`, `400`, `ok: 2026-09-10 ['세무사 1차', '강남지역']`, `404`, 그리고 마지막 조회에서 `sent_on`이 여전히 `2026-09-10`이고 `send_tags`가 유지될 것.

검증용 페이지를 지운다:
```bash
curl -s -o /dev/null -w "cleanup: %{http_code}\n" -X DELETE localhost:3001/api/pages/$PID -H "Cookie: $COOKIE"
```
Expected: `204`. dev 서버는 Task 4에서도 쓰므로 계속 띄워둬도 된다.

- [ ] **Step 3: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add "app/api/pages/[id]/send"
git commit -m "feat: add API for recording page send date and tags

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 4: 발행된 URL 화면의 전송 입력

**Files:**
- Create: `components/dashboard/SendControls.tsx`
- Modify: `app/admin/published/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/pages/[id]/send`(Task 3), `MAX_SEND_TAGS`·`normalizeSendTags`(Task 1), `DateField`(`components/customers/DateField.tsx`, 기존), `todayInSeoul`
- Produces: `SendControls({ pageId, initialSentOn, initialTags, tagSuggestions })`

- [ ] **Step 1: SendControls 작성**

`components/dashboard/SendControls.tsx` 신규:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import DateField from "@/components/customers/DateField";
import { MAX_SEND_TAGS, normalizeSendTags } from "@/lib/pages/types";

type Props = {
  pageId: string;
  initialSentOn: string | null;
  initialTags: string[];
  /** 이미 다른 페이지에서 쓰인 태그들. 오타로 같은 뜻의 태그가 갈라지는 것을 줄인다. */
  tagSuggestions: string[];
};

export default function SendControls({ pageId, initialSentOn, initialTags, tagSuggestions }: Props) {
  const router = useRouter();
  const [sentOn, setSentOn] = useState(initialSentOn);
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextSentOn: string | null, nextTags: string[]) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/pages/${pageId}/send`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentOn: nextSentOn, sendTags: nextTags }),
      });
      if (!response.ok) {
        setError("저장에 실패했어요. 다시 시도해주세요.");
        return;
      }
      router.refresh();
    } catch {
      setError("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  function changeSentOn(value: string | null) {
    setSentOn(value);
    save(value, tags);
  }

  function addTag() {
    const next = normalizeSendTags([...tags, draft]);
    setDraft("");
    if (next.length === tags.length) return; // 빈 값이거나 이미 있는 태그
    if (next.length > MAX_SEND_TAGS) {
      setError(`태그는 ${MAX_SEND_TAGS}개까지 붙일 수 있어요.`);
      return;
    }
    setTags(next);
    save(sentOn, next);
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    save(sentOn, next);
  }

  return (
    <div className={`mt-2 space-y-2 ${saving ? "opacity-50" : ""}`}>
      <DateField label="전송일" value={sentOn} onChange={changeSentOn} />

      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`${tag} 태그 삭제`}
              className="text-gray-400 hover:text-gray-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          list={`tag-suggestions-${pageId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="+ 태그 입력"
          className="w-28 rounded border border-gray-300 px-2 py-0.5 text-xs"
        />
        <datalist id={`tag-suggestions-${pageId}`}>
          {tagSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>

      {error && (
        <Text as="p" textStyle="t2Regular" color="fg.critical">
          {error}
        </Text>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 발행된 URL 화면에 연결**

`app/admin/published/page.tsx`에서:

1. import 추가:
```tsx
import SendControls from "@/components/dashboard/SendControls";
```

2. 정렬을 바꾼다. 기존 `everPublished` 계산을 아래로 교체:
```tsx
  // 지금 발행 상태인 것만이 아니라, 한 번이라도 발행된 적 있는 페이지를 전부
  // 모아 보여준다 — 나중에 보관 처리했어도 "언제 이걸 보냈었지" 확인할 기록으로 남긴다.
  // 정렬은 실제로 보낸 날이 있으면 그 날 기준이다. 최근에 보낸 것이 위로 온다.
  const sortKey = (page: PageRecord) => page.sentOn ?? page.publishedAt!;
  const everPublished = pages
    .filter((page) => page.publishedAt !== null)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  // 이미 쓰인 태그를 모아 자동완성 후보로 넘긴다.
  const tagSuggestions = [...new Set(pages.flatMap((page) => page.sendTags))].sort();
```
`PageRecord` 타입 import가 없으면 추가한다: `import type { PageRecord } from "@/lib/pages/types";`

3. 각 행의 `<Box minWidth="0" flexGrow={1}>` 안, 발행일 `<Text>` 아래에 추가:
```tsx
                  <SendControls
                    pageId={page.id}
                    initialSentOn={page.sentOn}
                    initialTags={page.sendTags}
                    tagSuggestions={tagSuggestions}
                  />
```

4. `<StatusBadge status={page.status} />`를 `<StatusBadge status={page.status} sentOn={page.sentOn} />`로 바꾼다 (Task 2에서 이미 했다면 그대로 둔다).

- [ ] **Step 3: 화면 수동 확인**

dev 서버(`npx next dev -p 3001`)와 로그인 쿠키를 준비하고, 기존 발행 페이지 하나를 골라 전송 기록을 넣어본 뒤 되돌린다.
```bash
cd "/Users/yeongseonpark/Desktop/클로드/tax auto"
set -a && source .env.local && set +a
COOKIE=$(curl -s -i -X POST localhost:3001/api/login -d "password=$ADMIN_PASSWORD" | grep -o 'nugget_admin_session=[^;]*' | head -1)
PID=$(curl -s "$SUPABASE_URL/rest/v1/pages?select=id&status=eq.published&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

# 화면에 전송일 입력과 태그 입력이 렌더링되는지
curl -s -H "Cookie: $COOKIE" localhost:3001/admin/published > /tmp/pub.html
grep -c "전송일" /tmp/pub.html          # 발행 이력이 있는 페이지 수만큼
grep -c "+ 태그 입력" /tmp/pub.html      # 같은 수

# 전송 기록을 넣고 뱃지가 바뀌는지
curl -s -o /dev/null -X PATCH localhost:3001/api/pages/$PID/send -H "Content-Type: application/json" -H "Cookie: $COOKIE" \
  -d '{"sentOn":"2026-09-10","sendTags":["검증용태그"]}'
curl -s -H "Cookie: $COOKIE" localhost:3001/admin/published | grep -c "전송됨"   # 1 이상
curl -s -H "Cookie: $COOKIE" localhost:3001/admin/published | grep -c "검증용태그" # 1 이상
curl -s -H "Cookie: $COOKIE" localhost:3001/admin | grep -c "전송됨"             # 대시보드에도 1 이상

# 되돌린다 — 검증 흔적을 남기지 않는다
curl -s -o /dev/null -X PATCH localhost:3001/api/pages/$PID/send -H "Content-Type: application/json" -H "Cookie: $COOKIE" \
  -d '{"sentOn":null,"sendTags":[]}'
curl -s "$SUPABASE_URL/rest/v1/pages?select=sent_on,send_tags&id=eq.$PID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: 전송일·태그 입력이 페이지 수만큼 렌더링되고, 전송 기록을 넣으면 `/admin/published`와 `/admin` 양쪽에 "전송됨"이 나타나며 태그가 보인다. 마지막 조회는 `sent_on: null`, `send_tags: []`로 되돌아와야 한다.

브라우저 클릭(날짜 선택 → 자동 저장, Enter로 태그 추가, `×`로 삭제)은 자동화로 실행할 수 없다. 실행하지 못한 검증은 보고서에 그대로 적는다 — 하지 않은 확인을 했다고 쓰지 않는다.

- [ ] **Step 4: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add components/dashboard/SendControls.tsx app/admin/published/page.tsx
git commit -m "feat: record send date and tags on the published URLs page

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 5: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 게이트**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```
Expected: 전부 통과. 빌드 출력에 `/api/pages/[id]/send`가 라우트로 나타나는지 확인한다.

- [ ] **Step 2: 스펙 대조**

스펙의 각 항목이 구현됐는지 훑는다: `sent_on`/`send_tags` 컬럼, 뱃지 4가지 조합, 태그 정규화·상한, 전용 엔드포인트, **에디터 저장이 전송 기록을 덮어쓰지 않음**, `/admin/published` 정렬, 자동 저장, 자동완성.

- [ ] **Step 3: 데이터 확인**

```bash
cd "/Users/yeongseonpark/Desktop/클로드/tax auto"
set -a && source .env.local && set +a
curl -s "$SUPABASE_URL/rest/v1/pages?select=slug,status,sent_on,send_tags" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "
import sys, json
rows = json.load(sys.stdin)
print(len(rows), 'pages')
dirty = [r for r in rows if r['sent_on'] or r['send_tags']]
print('전송 기록이 남은 페이지:', len(dirty))
for r in dirty: print(' ', r['slug'], r['sent_on'], r['send_tags'])
"
curl -s "$SUPABASE_URL/rest/v1/customers?select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)),'customers')"
```
Expected: 페이지 16개(검증용으로 만든 것이 남아 있으면 지운다), 전송 기록이 남은 페이지 0개, 고객 5명. dev 서버를 종료한다.

- [ ] **Step 4: PR**

```bash
git push -u origin page-send-tracking
```
PR 제목: `feat: record when a page was sent and to whom`. 본문에 스펙 링크, 검증 결과, 그리고 **"배포 전 Supabase SQL Editor에서 `supabase/schema.sql`의 2026-09-18 마이그레이션 블록 실행 필요(프로덕션에는 이미 적용됨)"**를 적고, 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
