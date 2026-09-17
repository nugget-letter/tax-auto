# 고객 목록 일괄 삭제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/customers` 목록에서 체크박스로 여러 고객을 선택해 한 번에 삭제한다.

**Architecture:** 기존 패턴 그대로 — zod 스키마(`lib/customers/types.ts`) → repository(`lib/customers/repository.ts`) → API route(`app/api/customers/bulk-delete`, `requireAdminSession`) → 클라이언트 컴포넌트가 fetch로 호출. `CustomersTable`을 서버 컴포넌트에서 클라이언트 컴포넌트로 바꿔 선택 상태를 들고, 선택이 있을 때만 하단 액션 바를 띄운다.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (`@supabase/supabase-js`, 서비스 롤), zod 4, seed-design (`@seed-design/react` `Box/HStack/Text/Badge`, 로컬 래퍼 `seed-design/ui/action-button`), Tailwind 4, Vitest.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-09-17-customers-bulk-delete-design.md`
- 브랜치 `customers-bulk-delete`에서 작업한다 (이미 생성됨, HEAD `b1eca31`).
- Next.js 16은 학습 데이터와 다르다. API 라우트/페이지의 `params`·`searchParams`는 `Promise`이며 `await` 해야 한다. 미들웨어 파일은 `proxy.ts`다.
- 관리자 API는 `requireAdminSession(request)`로 시작하고 실패 시 `401 {error:"unauthorized"}`.
- 에러 응답 형식: `400 {error:"invalid_input", fieldErrors}`, `500 {error:"delete_failed"}`.
- **"전체 선택"은 화면에 보이는 목록만 선택한다.** 필터·검색 결과가 바뀌면 선택은 초기화한다.
- 일괄 삭제 상한 **100개**.
- `today`는 서버(`app/admin/customers/page.tsx`)에서 계산해 prop으로 내려준다. 클라이언트에서 다시 계산하지 않는다 — 사용자 시스템 시계에 따라 D-day가 달라진다.
- `DELETE /api/customers/[id]`(개별 삭제)는 그대로 둔다.
- 어드민 UI는 seed-design `Box/HStack/VStack/Text` + Tailwind, 기존 `CustomersTable.tsx`/`DeleteCustomerButton.tsx` 패턴을 따른다. 존재하는 stroke 토큰은 `stroke.neutralWeak`, `stroke.criticalWeak` (`stroke.critical`은 없음).
- 주석은 한국어, "왜"를 설명할 때만.
- 커밋 메시지는 `feat:`/`fix:`/`test:` 접두어, 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- 각 태스크 끝에 `npx tsc --noEmit && npm run lint && npm test`가 통과해야 한다.
- **프로덕션 Supabase에는 실제 고객 5건이 있다.** 검증용으로 만든 행은 반드시 지우고, 기존 5건은 절대 건드리지 않는다.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `lib/customers/types.ts` (수정) | `bulkDeleteSchema` 추가 |
| `lib/customers/types.test.ts` (수정) | 스키마 테스트 |
| `lib/customers/repository.ts` (수정) | `deleteCustomers(ids): Promise<number>` |
| `app/api/customers/bulk-delete/route.ts` (신규) | POST 핸들러 |
| `components/customers/BulkDeleteBar.tsx` (신규, client) | 선택 수 표시 · 선택 해제 · 삭제 실행 |
| `components/customers/CustomersTable.tsx` (수정) | 클라이언트 전환, 체크박스와 선택 상태 |

---

### Task 1: 스키마 · repository · API

**Files:**
- Modify: `lib/customers/types.ts`, `lib/customers/types.test.ts`, `lib/customers/repository.ts`
- Create: `app/api/customers/bulk-delete/route.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient`, `requireAdminSession`
- Produces:
  ```ts
  export const BULK_DELETE_LIMIT = 100;
  export const bulkDeleteSchema: z.ZodObject<{ ids: z.ZodArray<z.ZodString> }>;
  export type BulkDeleteInput = { ids: string[] };
  export async function deleteCustomers(ids: string[]): Promise<number>; // 실제 삭제된 행 수
  // POST /api/customers/bulk-delete → 200 {deleted:number} | 400 | 401 | 500
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/customers/types.test.ts` 파일 끝에 추가:
```ts
describe("bulkDeleteSchema", () => {
  const id = "06d5a04f-7156-4d99-a1de-a2c6276f9e55";

  it("uuid 배열을 통과시킨다", () => {
    const result = bulkDeleteSchema.safeParse({ ids: [id] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ids).toEqual([id]);
  });

  it("빈 배열은 거부한다", () => {
    expect(bulkDeleteSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it("uuid가 아닌 값은 거부한다", () => {
    expect(bulkDeleteSchema.safeParse({ ids: ["not-a-uuid"] }).success).toBe(false);
  });

  it("100개까지 허용하고 101개는 거부한다", () => {
    expect(bulkDeleteSchema.safeParse({ ids: Array(100).fill(id) }).success).toBe(true);
    expect(bulkDeleteSchema.safeParse({ ids: Array(101).fill(id) }).success).toBe(false);
  });

  it("ids가 없으면 거부한다", () => {
    expect(bulkDeleteSchema.safeParse({}).success).toBe(false);
  });
});
```

같은 파일 상단 import에 `bulkDeleteSchema`를 추가한다 (기존 import 줄에 이어붙인다).

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/customers/types.test.ts`
Expected: FAIL — `bulkDeleteSchema is not exported` 또는 유사한 오류

- [ ] **Step 3: 스키마 구현**

`lib/customers/types.ts`의 `customerInputSchema` 정의 아래에 추가:
```ts
// 실수나 스크립트로 거대한 요청이 오는 것을 막기 위한 상한. 화면에 한 번에
// 보이는 고객 수를 훨씬 웃도는 값이라 실사용에는 걸리지 않는다.
export const BULK_DELETE_LIMIT = 100;

export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.uuid("고객 id 형식이 올바르지 않아요"))
    .min(1, "삭제할 고객을 선택해주세요")
    .max(BULK_DELETE_LIMIT, `한 번에 ${BULK_DELETE_LIMIT}명까지 삭제할 수 있어요`),
});
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
```

`z.uuid()`는 zod 4.4.3에 있는 최상위 함수다(`node_modules/zod/v4/classic/schemas.d.ts:189`에서 확인). 구버전 문법인 `z.string().uuid()`를 쓰지 않는다.

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/customers/types.test.ts`
Expected: PASS

- [ ] **Step 5: repository에 일괄 삭제 추가**

`lib/customers/repository.ts`의 `deleteCustomer` 아래에 추가:
```ts
/**
 * 여러 고객을 한 번의 쿼리로 지우고 실제 삭제된 행 수를 돌려준다.
 * 이미 없는 id가 섞여 있어도 오류가 아니라 숫자만 줄어든다.
 */
export async function deleteCustomers(ids: string[]): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .in("id", ids)
    .select("id");
  if (error) throw error;
  return data ? data.length : 0;
}
```

- [ ] **Step 6: API 라우트 작성**

`app/api/customers/bulk-delete/route.ts`:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { bulkDeleteSchema } from "@/lib/customers/types";
import { deleteCustomers } from "@/lib/customers/repository";
import { requireAdminSession } from "@/lib/auth/session";

// DELETE는 본문을 실어 보내는 게 표준적이지 않아서, 여러 id를 받는 이 엔드포인트만 POST로 둔다.
export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteCustomers(parsed.data.ids);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[customers] 일괄 삭제 실패", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 7: API 수동 확인**

dev 서버를 백그라운드로 띄운다: `npx next dev -p 3001`.
로그인은 **form-encoded**다:
```bash
cd "/Users/yeongseonpark/Desktop/클로드/tax auto"
set -a && source .env.local && set +a
COOKIE=$(curl -s -i -X POST localhost:3001/api/login -d "password=$ADMIN_PASSWORD" | grep -o 'nugget_admin_session=[^;]*')

# 검증용 고객 2명 생성 (기존 5건은 건드리지 않는다)
BODY='{"name":"일괄삭제테스트","office":"","phone":"010-0000-0001","email":"","consented":true,"source":"bulk-test","status":"new","trialStartedOn":null,"kakaoAdminSetOn":null,"reminded1On":null,"reminded2On":null,"memo":""}'
ID1=$(curl -s -X POST localhost:3001/api/customers -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
ID2=$(curl -s -X POST localhost:3001/api/customers -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

# 인증 없음 → 401
curl -s -o /dev/null -w "no-auth: %{http_code}\n" -X POST localhost:3001/api/customers/bulk-delete -H "Content-Type: application/json" -d "{\"ids\":[\"$ID1\"]}"
# 빈 배열 → 400
curl -s -o /dev/null -w "empty: %{http_code}\n" -X POST localhost:3001/api/customers/bulk-delete -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"ids":[]}'
# 정상 → 200 {"deleted":2}
curl -s -w "\nbulk: %{http_code}\n" -X POST localhost:3001/api/customers/bulk-delete -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d "{\"ids\":[\"$ID1\",\"$ID2\"]}"
# 이미 지운 id 재요청 → 200 {"deleted":0}
curl -s -w "\nagain: %{http_code}\n" -X POST localhost:3001/api/customers/bulk-delete -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d "{\"ids\":[\"$ID1\"]}"
```
Expected: `401`, `400`, `200 {"deleted":2}`, `200 {"deleted":0}`.

그다음 고객 수가 원래대로 5인지 확인한다:
```bash
curl -s "$SUPABASE_URL/rest/v1/customers?select=id" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)),'rows')"
```
Expected: `5 rows`. dev 서버를 종료한다.

- [ ] **Step 8: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/customers/types.ts lib/customers/types.test.ts lib/customers/repository.ts app/api/customers/bulk-delete
git commit -m "feat: add bulk delete API for customers

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 2: 체크박스 목록 + 일괄 삭제 바

**Files:**
- Create: `components/customers/BulkDeleteBar.tsx`
- Modify: `components/customers/CustomersTable.tsx`

**Interfaces:**
- Consumes: `POST /api/customers/bulk-delete` (Task 1), `CustomerRecord`, `getTrialDDay`, `getTrialEndsOn`, `formatDate`, `CustomerStatusBadge`, `TrialDDayBadge`
- Produces: `BulkDeleteBar({ ids, onCleared })` — 삭제 성공 시 `onCleared()` 호출 후 `router.refresh()`

- [ ] **Step 1: BulkDeleteBar 작성**

`components/customers/BulkDeleteBar.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

type Props = { ids: string[]; onCleared: () => void };

export default function BulkDeleteBar({ ids, onCleared }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (loading) return;
    if (!window.confirm(`선택한 고객 ${ids.length}명을 삭제할까요? 되돌릴 수 없어요.`)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customers/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }
      onCleared();
      router.refresh();
    } catch {
      setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-gray-300 bg-white px-4 py-3 shadow-lg">
      <Text as="span" textStyle="t4Medium" color="fg.neutral">
        {ids.length}명 선택됨
      </Text>
      <div className="flex items-center gap-2">
        {error && (
          <Text as="span" textStyle="t2Regular" color="fg.critical">
            {error}
          </Text>
        )}
        <ActionButton type="button" variant="ghost" size="small" onClick={onCleared} disabled={loading}>
          선택 해제
        </ActionButton>
        <ActionButton
          type="button"
          variant="criticalSolid"
          size="small"
          onClick={handleDelete}
          loading={loading}
          disabled={loading}
        >
          선택 삭제
        </ActionButton>
      </div>
    </div>
  );
}
```

seed-design의 `ActionButton` variant는 `brandSolid | neutralSolid | neutralWeak | criticalSolid | brandOutline | neutralOutline | ghost` 뿐이다(`node_modules/@seed-design/css/recipes/action-button.d.ts`에서 확인). 삭제는 파괴적인 동작이라 `criticalSolid`를 쓴다. 타입이 거부하면 `components/customers/DeleteCustomerButton.tsx`가 쓰는 조합(`variant="ghost" size="xsmall" color="fg.critical"`)으로 맞추고 보고한다.

- [ ] **Step 2: CustomersTable을 클라이언트 컴포넌트로 전환**

`components/customers/CustomersTable.tsx`를 아래로 교체한다. 렌더링 내용은 기존과 같고, 체크박스 열과 헤더, 선택 상태만 더해진 것이다.

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Box, HStack, Text } from "@seed-design/react";
import type { CustomerRecord } from "@/lib/customers/types";
import { formatDate } from "@/lib/format";
import { getTrialDDay, getTrialEndsOn } from "@/lib/customers/trial";
import CustomerStatusBadge from "./CustomerStatusBadge";
import TrialDDayBadge from "./TrialDDayBadge";
import BulkDeleteBar from "./BulkDeleteBar";

type Props = { customers: CustomerRecord[]; today: string };

function CustomerRow({
  customer,
  isLast,
  today,
  selected,
  onToggle,
}: {
  customer: CustomerRecord;
  isLast: boolean;
  today: string;
  selected: boolean;
  onToggle: () => void;
}) {
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
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={`${customer.name} 선택`}
        className="h-4 w-4 flex-none"
      />
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
  const [selected, setSelected] = useState<string[]>([]);
  const headerRef = useRef<HTMLInputElement>(null);

  // 필터·검색이 바뀌면 보이는 목록 자체가 달라지므로 선택을 버린다. 화면에 없는
  // 고객이 선택된 채로 남아 있으면 무엇을 지우는지 알 수 없다.
  const visibleIds = useMemo(() => customers.map((c) => c.id).join(","), [customers]);
  useEffect(() => {
    setSelected([]);
  }, [visibleIds]);

  const allSelected = customers.length > 0 && selected.length === customers.length;
  const someSelected = selected.length > 0 && !allSelected;

  // indeterminate는 속성이 아니라 DOM 프로퍼티라 JSX로는 지정할 수 없다.
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  if (customers.length === 0) {
    return (
      <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
        조건에 맞는 고객이 없어요.
      </Text>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : customers.map((c) => c.id));
  }

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
        <input
          ref={headerRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4"
        />
        전체 선택
      </label>

      <Box as="ul" borderWidth={1} borderColor="stroke.neutralWeak" borderRadius="r2">
        {customers.map((customer, index) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            isLast={index === customers.length - 1}
            today={today}
            selected={selected.includes(customer.id)}
            onToggle={() => toggle(customer.id)}
          />
        ))}
      </Box>

      {selected.length > 0 && (
        <BulkDeleteBar ids={selected} onCleared={() => setSelected([])} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: 타입·린트 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 오류 없음.

`react-hooks` 규칙이 `useEffect` 안의 `setSelected([])`를 문제 삼으면(이 저장소의 `react-hooks/set-state-in-effect` 규칙은 `components/customers/CustomerSearch.tsx`에서 이미 한 번 걸렸다), `CustomerSearch.tsx`가 쓰는 "렌더 중 상태 조정" 패턴으로 바꾼다:
```tsx
const [syncedIds, setSyncedIds] = useState(visibleIds);
if (visibleIds !== syncedIds) {
  setSyncedIds(visibleIds);
  setSelected([]);
}
```
어느 쪽을 썼는지 보고한다. `indeterminate`를 세팅하는 `useEffect`는 DOM 프로퍼티 조작이라 이 규칙에 걸리지 않는다.

- [ ] **Step 4: 화면 수동 확인**

dev 서버를 띄우고(`npx next dev -p 3001`) 로그인한 뒤, 검증용 고객 3명을 API로 만든다(Task 1 Step 7의 `BODY`를 재사용하되 이름을 `일괄테스트1~3`으로 구분). 그다음 `/admin/customers` HTML을 받아 다음을 확인한다:

```bash
curl -s -H "Cookie: $COOKIE" localhost:3001/admin/customers > /tmp/list.html
grep -c 'type="checkbox"' /tmp/list.html   # 행 수 + 1(전체 선택)
grep -c '전체 선택' /tmp/list.html          # 1
grep -c '선택됨' /tmp/list.html             # 0 (선택 전에는 바가 없다)
```
Expected: 체크박스 수 = 고객 수 + 1, `전체 선택` 1회, `선택됨` 0회.

브라우저 조작(체크 → 바 노출 → 삭제)은 HTML만으로는 확인할 수 없다. 대신 바가 호출하는 것과 동일한 요청을 직접 보내 목록에서 사라지는지 확인한다:
```bash
curl -s -X POST localhost:3001/api/customers/bulk-delete -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d "{\"ids\":[\"$ID1\",\"$ID2\",\"$ID3\"]}"
curl -s -H "Cookie: $COOKIE" localhost:3001/admin/customers | grep -c "일괄테스트"
```
Expected: `{"deleted":3}` 그리고 `0`.

마지막으로 고객 수가 5인지 확인하고 dev 서버를 종료한다. 브라우저 상호작용을 실행하지 못했다는 점은 보고서에 그대로 적는다 — 하지 않은 검증을 했다고 쓰지 않는다.

- [ ] **Step 5: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add components/customers/BulkDeleteBar.tsx components/customers/CustomersTable.tsx
git commit -m "feat: select customers with checkboxes and delete them in bulk

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git show --stat HEAD; git status --short
```

---

### Task 3: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 게이트**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```
Expected: 전부 통과. 빌드 출력에 `/api/customers/bulk-delete`가 라우트로 나타나는지 확인한다.

- [ ] **Step 2: 스펙 대조**

스펙의 각 항목이 구현됐는지 훑는다: 전체 선택이 보이는 목록만 대상인지, 필터 변경 시 선택 초기화, `indeterminate` 중간 상태, 상한 100, `deleted` 수 응답, 개별 삭제 라우트 유지, `today`가 서버에서 오는지.

- [ ] **Step 3: 데이터 확인**

```bash
set -a && source .env.local && set +a
curl -s "$SUPABASE_URL/rest/v1/customers?select=name,source" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'rows'); [print(' ',r['name'][:8], r['source'][:20]) for r in d]"
```
Expected: 5 rows, 전부 유입경로 `direct`(임포트된 실제 고객). 검증용 행이 남아 있으면 지운다.

- [ ] **Step 4: PR**

```bash
git push -u origin customers-bulk-delete
```
PR 제목: `feat: bulk delete customers from the list`. 본문에 스펙 링크와 검증 결과를 적고, 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
