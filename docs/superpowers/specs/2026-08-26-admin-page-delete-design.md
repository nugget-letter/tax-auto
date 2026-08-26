# 관리자 페이지 삭제 기능 설계

## 배경

`/admin` 대시보드(`PagesTable`)는 페이지를 발행됨/임시저장/보관 상태로 그룹핑해서 보여주고, 상태 변경(발행/보관/복원) 버튼은 있지만 완전 삭제 기능은 없다. Supabase `pages` 테이블에서 행을 영구적으로 제거하는 삭제 기능을 추가한다.

## 범위

- 모든 상태(발행됨/임시저장/보관)의 페이지에서 삭제 가능
- 삭제는 DB에서 행을 완전히 제거하는 하드 삭제이며 되돌릴 수 없음
- 확인 절차는 브라우저 기본 `confirm()` 대화상자로 충분

## 데이터 흐름

1. 사용자가 `PageRow`의 삭제 버튼 클릭
2. `window.confirm()`으로 페이지 제목을 포함한 확인 메시지 표시
3. 확인 시 `DELETE /api/pages/[id]` 호출
4. Supabase에서 해당 `id`의 행을 삭제
5. 성공 시 `router.refresh()`로 목록 갱신

## API

### `app/api/pages/[id]/route.ts`에 `DELETE` 핸들러 추가

- `requireAdminSession`으로 인증 확인 (미인증 시 401), 기존 `PATCH` 핸들러와 동일한 패턴
- 성공 시 204 No Content
- 삭제 실패(DB 에러) 시 500과 에러 로그

### `lib/pages/repository.ts`에 `deletePage(id: string): Promise<void>` 추가

```
supabase.from("pages").delete().eq("id", id)
```

에러 발생 시 그대로 throw (기존 함수들과 동일한 패턴).

## UI

### `components/dashboard/DeleteButton.tsx` 신규 (클라이언트 컴포넌트)

- Props: `id: string`, `title: string`
- `StatusActionButton`과 동일한 구조: `useState`로 loading/error 관리, `useRouter().refresh()`로 갱신
- 클릭 시 `window.confirm(`"${title}" 페이지를 삭제할까요? 되돌릴 수 없어요.`)` → 취소 시 아무 동작 없음
- 확인 시 `DELETE /api/pages/${id}` 호출, 실패하면 에러 메시지 표시("삭제에 실패했어요. 다시 로그인해야 할 수 있어요." 등 기존 문구 패턴 재사용)
- 텍스트는 `text-red-600`으로 구분해 실수 클릭 방지

### `components/dashboard/PagesTable.tsx` 수정

- `PageRow` 내 버튼 그룹(`CopyLinkButton`, 수정 링크, `StatusActionButton`)에 `DeleteButton` 추가
- 모든 상태 그룹에서 동일하게 노출 (상태별 조건 분기 없음)

## 범위 밖 (YAGNI)

- Storage에 업로드된 배너 이미지 등 연관 파일 정리는 하지 않음 — 기존 수정/상태변경 플로우에서도 하지 않고 있어 일관성 유지
- 별도 삭제 전용 페이지나 커스텀 모달은 만들지 않음 — `confirm()`으로 충분
- 발행 상태 페이지에 대한 별도 보호 절차(예: 먼저 보관 처리 강제) 없음 — 모든 상태에서 동일하게 삭제 가능
