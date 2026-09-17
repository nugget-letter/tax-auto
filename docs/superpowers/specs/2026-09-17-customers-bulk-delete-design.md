# 고객 목록 일괄 삭제 설계

작성일: 2026-09-17

## 배경

`/admin/customers` 목록에서 고객을 지우려면 상세 화면에 들어가 하나씩 삭제해야 한다.
테스트로 들어온 신청이나 중복 신청을 정리할 때 번거롭다.

## 결정

- 목록에 체크박스를 달고, 선택한 고객을 한 번에 삭제한다.
- **"전체 선택"은 화면에 보이는 목록만 선택한다.** 상태 필터(`?status=`)나 검색(`?q=`)이
  걸려 있으면 그 결과만 대상이 된다. 삭제는 되돌릴 수 없어서, "보이는 것이 곧 선택되는 것"이
  예상과 어긋나지 않고 사고 위험이 낮다.
- 되돌리기(undo)는 만들지 않는다. 기존 개별 삭제도 하드 삭제다.

## 화면

```
[☐] 전체 선택
┌──────────────────────────────────────┐
│ [☐]  신규   김세무 · 세무법인 A        │
│ [☑]  체험중 박회계 · B사무소           │
└──────────────────────────────────────┘

┌─ 2명 선택됨   [선택 해제]  [선택 삭제] ─┐   ← 선택이 있을 때만, sticky bottom
```

- 각 행 왼쪽에 체크박스. 행의 나머지 영역과 `[열기]` 링크는 그대로 동작한다.
- 헤더 체크박스: 전부 선택이면 체크, 일부면 `indeterminate`.
- 선택이 하나라도 있으면 하단에 액션 바가 나타난다(`sticky bottom-0`).
- `[선택 삭제]`는 `window.confirm`으로 인원수를 확인받는다 — 기존 `DeleteCustomerButton` 패턴.
- 필터·검색이 바뀌면 선택은 초기화한다(다른 목록이므로).

## 서버

`POST /api/customers/bulk-delete`

- `requireAdminSession` 필수. 실패 시 `401 {error:"unauthorized"}`.
- body `{ ids: string[] }`. `bulkDeleteSchema`로 검증: uuid 배열, 1개 이상, **최대 100개**.
  상한은 실수나 스크립트로 거대한 요청이 오는 것을 막기 위한 것이다.
- 검증 실패 `400 {error:"invalid_input", fieldErrors}`.
- 성공 `200 {deleted: <실제 삭제된 수>}`. 이미 없는 id가 섞여 있어도 오류가 아니라 숫자만 줄어든다.
- 실패 `500 {error:"delete_failed"}`.

`DELETE /api/customers/[id]`(개별 삭제)는 그대로 둔다 — 상세 화면에서 계속 쓴다.

## 파일

| 파일 | 변경 |
|---|---|
| `lib/customers/types.ts` | `bulkDeleteSchema` 추가 |
| `lib/customers/types.test.ts` | 스키마 테스트 |
| `lib/customers/repository.ts` | `deleteCustomers(ids): Promise<number>` 추가 (`.in("id", ids)` 한 번의 쿼리) |
| `app/api/customers/bulk-delete/route.ts` | 신규 |
| `components/customers/CustomersTable.tsx` | 클라이언트 컴포넌트로 전환, 선택 상태 관리 |
| `components/customers/BulkDeleteBar.tsx` | 신규 — 선택 수 표시, 선택 해제, 삭제 실행 |

`CustomersTable`이 `"use client"`가 되어도 렌더링 내용은 그대로다. `today`는 지금처럼
서버(`app/admin/customers/page.tsx`)에서 계산해 prop으로 내려준다 — 클라이언트에서
다시 계산하면 사용자의 시스템 시계에 따라 D-day가 달라질 수 있다.

## 에러 처리

- 삭제 실패: 액션 바에 "삭제에 실패했어요. 다시 로그인해야 할 수 있어요." 표시, 선택 유지.
- 부분 삭제(요청한 수 > 실제 삭제된 수): 성공으로 처리하고 목록을 새로고침한다.
  이미 지워진 고객을 다시 지우려 한 경우라 사용자가 할 일이 없다.

## 테스트

`bulkDeleteSchema` 단위 테스트: 빈 배열 거부, 100개 초과 거부, uuid 아닌 값 거부, 정상 통과.
UI·API·DB 연동은 dev 서버에서 수동 확인(선택 → 일괄 삭제 → 목록 반영, 비인증 401).

## 범위 밖

되돌리기(undo), 일괄 상태 변경, 일괄 내보내기, 페이지네이션.
