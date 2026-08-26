# 관리자 페이지 삭제 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` 대시보드에서 어떤 상태의 페이지든 완전히 삭제(하드 삭제)할 수 있는 기능을 추가한다.

**Architecture:** 기존 `PATCH`/`updatePage` 패턴을 그대로 따라 `DELETE /api/pages/[id]` 라우트와 `deletePage` repository 함수를 추가하고, `StatusActionButton`과 동일한 구조의 `DeleteButton` 클라이언트 컴포넌트를 `PagesTable`에 배치한다.

**Tech Stack:** Next.js App Router (route handlers), Supabase JS client, React 클라이언트 컴포넌트. 이 프로젝트에는 자동화 테스트 프레임워크가 설치되어 있지 않으므로(다른 API 라우트/컴포넌트도 단위 테스트 없음), 검증은 `npm run dev`로 띄운 로컬 서버에 대한 `curl` 호출과 브라우저 수동 확인으로 진행한다.

## Global Constraints

- 하드 삭제만 지원한다 (소프트 삭제/휴지통 없음) — 스펙: "삭제는 DB에서 행을 완전히 제거하는 하드 삭제이며 되돌릴 수 없음"
- 모든 상태(발행됨/임시저장/보관)에서 동일하게 삭제 가능하다 — 상태별 조건 분기 없음
- 확인 절차는 브라우저 기본 `window.confirm()`만 사용한다 — 커스텀 모달 없음
- Storage(배너 이미지 등) 파일 정리는 하지 않는다 — 기존 수정 플로우와 동일한 범위
- 기존 에러 메시지 문구 패턴("~에 실패했어요. 다시 로그인해야 할 수 있어요.")을 재사용한다

---

### Task 1: `DELETE /api/pages/[id]` API 라우트 + `deletePage` repository 함수

**Files:**
- Modify: `lib/pages/repository.ts`
- Modify: `app/api/pages/[id]/route.ts`

**Interfaces:**
- Produces: `deletePage(id: string): Promise<void>` — Supabase에서 `id`에 해당하는 행을 삭제. 에러 발생 시 그대로 throw.
- Produces: `DELETE` 핸들러 — 인증 실패 시 401 JSON `{ error: "unauthorized" }`, 삭제 성공 시 204(본문 없음), 삭제 실패(DB 에러) 시 500 JSON `{ error: "delete_failed" }`.

- [ ] **Step 1: `lib/pages/repository.ts`에 `deletePage` 함수 추가**

파일 끝(`updatePageStatus` 함수 뒤)에 추가:

```typescript
export async function deletePage(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: `app/api/pages/[id]/route.ts`에 `DELETE` 핸들러 추가**

`import` 구문의 `updatePage`를 `deletePage`도 함께 가져오도록 수정:

```typescript
import { updatePage, deletePage, SlugConflictError } from "@/lib/pages/repository";
```

기존 `PATCH` 함수 정의 뒤(파일 끝)에 추가:

```typescript
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
    await deletePage(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[pages] 삭제 실패", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: 개발 서버 실행**

Run: `npm run dev`

브라우저나 다른 터미널에서 다음 단계를 진행할 수 있도록 서버를 백그라운드로 띄워둔다 (예: `npm run dev &` 또는 별도 터미널).

- [ ] **Step 4: 인증 없이 DELETE 호출 시 401을 반환하는지 확인**

Run:
```bash
curl -i -X DELETE http://localhost:3000/api/pages/00000000-0000-0000-0000-000000000000
```

Expected: 응답 첫 줄이 `HTTP/1.1 401 Unauthorized`이고 본문이 `{"error":"unauthorized"}`

- [ ] **Step 5: 로그인해서 세션 쿠키 확보**

Run (실제 `.env.local`의 `ADMIN_PASSWORD` 값으로 치환):
```bash
curl -i -c /tmp/cookies.txt -X POST http://localhost:3000/api/login \
  --data-urlencode "password=<ADMIN_PASSWORD 값>" \
  --data-urlencode "next=/admin"
```

Expected: `HTTP/1.1 303 See Other`, `/tmp/cookies.txt`에 `nugget_admin_session` 쿠키가 저장됨

- [ ] **Step 6: 삭제 테스트용 페이지 생성**

Run:
```bash
curl -s -b /tmp/cookies.txt -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{"title":"삭제 테스트","slug":"delete-test-page","status":"draft","blocks":[]}'
```

Expected: 201과 함께 생성된 페이지 JSON이 반환됨. 응답의 `"id"` 값을 다음 단계에서 사용할 `$PAGE_ID`로 기록해둔다.

- [ ] **Step 7: 생성된 페이지를 DELETE 호출로 삭제**

Run (`$PAGE_ID`를 Step 6에서 받은 실제 id로 치환):
```bash
curl -i -b /tmp/cookies.txt -X DELETE http://localhost:3000/api/pages/$PAGE_ID
```

Expected: `HTTP/1.1 204 No Content`, 본문 없음

- [ ] **Step 8: 삭제된 페이지가 실제로 사라졌는지 확인**

Run (같은 `$PAGE_ID`로, 이미 삭제됐으므로 PATCH가 대상을 찾지 못해 실패해야 함):
```bash
curl -i -b /tmp/cookies.txt -X PATCH http://localhost:3000/api/pages/$PAGE_ID \
  -H "Content-Type: application/json" \
  -d '{"title":"삭제 테스트","slug":"delete-test-page","status":"draft","blocks":[]}'
```

Expected: `HTTP/1.1 500 Internal Server Error` (행이 존재하지 않아 `updatePage`의 `.single()`이 에러를 던짐) — 즉 Step 7에서 실제로 DB 행이 삭제되었음을 확인

- [ ] **Step 9: Commit**

```bash
git add lib/pages/repository.ts app/api/pages/[id]/route.ts
git commit -m "feat: add DELETE /api/pages/:id route and deletePage repository function"
```

---

### Task 2: `DeleteButton` 컴포넌트 + `PagesTable` 연동

**Files:**
- Create: `components/dashboard/DeleteButton.tsx`
- Modify: `components/dashboard/PagesTable.tsx`

**Interfaces:**
- Consumes: `DELETE /api/pages/[id]` (Task 1에서 구현) — 204 성공, 401/500 실패
- Produces: `DeleteButton` 컴포넌트, props `{ id: string; title: string }`

- [ ] **Step 1: `components/dashboard/DeleteButton.tsx` 생성**

`components/dashboard/StatusActionButton.tsx`와 동일한 구조로 작성:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; title: string };

export default function DeleteButton({ id, title }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = window.confirm(`"${title}" 페이지를 삭제할까요? 되돌릴 수 없어요.`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${id}`, { method: "DELETE" });

      if (!response.ok) {
        setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

      router.refresh();
    } catch {
      setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {loading ? "삭제 중..." : "삭제"}
      </button>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: `components/dashboard/PagesTable.tsx`에서 `DeleteButton` 임포트 및 배치**

> **Note (계획 작성 이후 반영된 변경):** `PagesTable.tsx`에는 이 계획 작성 이후 병합된 `DuplicateButton`(복제 버튼)이 이미 `수정` 링크와 `StatusActionButton` 사이에 들어가 있다. 아래 버튼 그룹 스니펫은 그 최신 상태를 반영한 것이니 그대로 적용하면 된다 — 기존 `DuplicateButton` 줄을 지우지 말 것.

`import` 구문에 추가:

```typescript
import DeleteButton from "./DeleteButton";
```

`PageRow` 함수 내 버튼 그룹을 아래와 같이 수정 (기존 `DuplicateButton`은 유지하고 `StatusActionButton` 뒤에 `DeleteButton`만 추가):

```tsx
      <div className="flex shrink-0 items-center gap-3">
        <CopyLinkButton slug={page.slug} />
        <Link href={`/admin/${page.id}/edit`} className="text-xs text-gray-600 hover:underline">
          수정
        </Link>
        <DuplicateButton id={page.id} />
        <StatusActionButton id={page.id} status={page.status} />
        <DeleteButton id={page.id} title={page.title} />
      </div>
```

- [ ] **Step 3: 개발 서버가 실행 중인지 확인 (없으면 시작)**

Run: `npm run dev` (Task 1에서 이미 실행 중이면 생략)

- [ ] **Step 4: 브라우저에서 삭제 플로우 수동 확인**

1. `http://localhost:3000/login`에서 `.env.local`의 `ADMIN_PASSWORD`로 로그인
2. `/admin`에서 임의 상태(발행됨/임시저장/보관 각각 최소 1개씩)의 페이지 옆에 빨간색 "삭제" 버튼이 보이는지 확인
3. 아무 페이지의 "삭제" 클릭 → `confirm()` 대화상자에 페이지 제목이 포함되어 있는지 확인 → **취소** 클릭 → 페이지가 목록에서 사라지지 않는지 확인
4. 같은 페이지의 "삭제" 다시 클릭 → 이번엔 **확인** 클릭 → 버튼이 "삭제 중..."으로 바뀌었다가 목록에서 해당 페이지 행이 사라지는지 확인
5. 발행됨 상태 페이지에서도 동일하게 삭제가 동작하는지 확인 (상태별 제약 없음)

Expected: 모든 항목이 예상대로 동작

- [ ] **Step 5: 린트 확인**

Run: `npm run lint`

Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/DeleteButton.tsx components/dashboard/PagesTable.tsx
git commit -m "feat: add delete button to admin pages table"
```
