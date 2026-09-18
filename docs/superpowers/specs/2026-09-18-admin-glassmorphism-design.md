# 어드민 글래스모피즘 전면 개편 — 설계

**작성일:** 2026-09-18
**범위:** `/admin/*` 8개 화면 + `/login`. 공개 랜딩페이지(`/c/[slug]`)와 `components/public/*`는 건드리지 않는다.

## 목표

어드민 화면 전체를 하나의 디자인 시스템으로 통일한다. 뼈대는 밝은 글래스모피즘이고, 색과
글꼴은 너겟 세일즈 랜딩페이지(`tax-sales`)의 브랜드에 맞춘다. 특히 대시보드 달력의 가독성을
높인다 — 지금은 이모지 하나만 찍혀 있어 무슨 일이 있었는지 범례 없이는 알 수 없다.

지금 어드민은 흰 배경에 회색 1px 테두리라 패널 경계가 거의 보이지 않고, 상태 뱃지·태그 칩·
버튼 스타일이 화면마다 제각각이다. 본문 폭도 768px로 고정되어 넓은 모니터에서 가운데 좁은
기둥처럼 보인다.

## 결정 사항

사용자가 목업 비교와 브랜드 아티팩트 검토를 거쳐 다음을 확정했다.

1. **은은한 글래스** — 밝은 배경 + 불투명도 76% 흰 유리 패널. 글자색은 진한 값을 유지해
   가독성을 떨어뜨리지 않는다. 컬러 글래스(브랜드 오로라)와 다크 글래스는 탈락.
2. **컬러 칩 달력** — 달력 칸 안에 `생성 4`, `전송 1`처럼 글자로 직접 쓴다. 범례를 안 봐도 뜻이
   통한다. 컬러 점 + 범례, 이모지 유지 안은 탈락.
3. **브랜드 색·글꼴만 정합** — 랜딩페이지의 다크 바탕은 가져오지 않는다. 밝은 글래스 뼈대는
   그대로 두고 액센트(플레임 그라데이션)와 글꼴만 맞춘다.

## 브랜드 정합

기준은 세일즈 랜딩페이지(`nugget-letter/tax-brending-message`)다. 지금 tax-auto의 브랜드
값은 랜딩과 미세하게 다르다 — 랜딩 쪽을 정본으로 삼는다.

| 토큰 | 지금 (tax-auto) | 바뀐 뒤 (랜딩 정본) |
|---|---|---|
| `--color-brand-amber` | 없음 | `#FFB03A` |
| `--color-brand-orange` | `#ffb020` | `#FF6B2C` |
| `--color-brand-red` | `#ff5a36` | `#F5333F` |
| `--gradient-flame` | 없음 | `linear-gradient(100deg, #FFB03A 0%, #FF6B2C 52%, #F5333F 100%)` |
| `--color-navy-950` | `#0b0b10` | **그대로** |

`--color-brand-orange`와 `--color-brand-red`는 지금 `components/admin/Sidebar.tsx`의 로고
그라데이션에서만 쓰이므로 값을 바꿔도 안전하다.

**`--color-navy-950`은 손대지 않는다.** `components/public/ReadingProgressBar.tsx`가 공개
페이지에서 같은 토큰을 쓴다. 값을 바꾸면 범위 밖인 공개 페이지가 같이 바뀐다. 마침 랜딩의
`--ground`(`#100F0E`)와 육안으로 구별되지 않는 값이라 바꿀 이유도 없다.

### 플레임을 쓰는 곳 (액센트만)

- 사이드바 로고 — 2색 그라데이션에서 랜딩과 같은 3색 플레임으로
- 사이드바 현재 메뉴 — 왼쪽에 2px 플레임 바
- 주요 버튼 — 배경 플레임, 글자 `#22150B`, 알약형(`999px`),
  그림자 `0 10px 30px -14px rgb(255 107 44 / 0.85)` (랜딩 `.btn-primary` 그대로)
- 포커스 링 — 앰버 + 어두운 바깥 테두리 2겹 (아래 「포커스 링」 참고)
- 섹션 라벨(eyebrow) 앞의 `22px × 2px` 바

배경·유리 패널·상태 칩에는 플레임을 쓰지 않는다. 액센트가 넓은 면을 차지하면 데이터가 안
읽힌다. 달력에서 선택한 날도 플레임이 아니라 `#15151c` 채움을 유지한다 — 플레임 바탕 위에
상태 칩을 얹으면 칩 색이 죽는다.

### 글꼴

랜딩과 같은 3종 체계를 쓴다. Gothic A1은 이미 `app/layout.tsx`에 로드돼 있고 굵기만
추가하면 된다.

| 역할 | 글꼴 | 굵기 |
|---|---|---|
| 제목(display) | Gothic A1 | 700 / 800 / 900 |
| 본문(body) | IBM Plex Sans KR | 400 / 500 / 600 |
| 라벨·숫자(mono) | IBM Plex Mono | 500 |

**전역 `--font-sans`는 바꾸지 않는다.** `app/globals.css`의 `--font-sans`는 `<body>`에 걸려
있어 공개 랜딩페이지 본문도 이 값을 쓴다. 대신 변수를 새로 더하고, 어드민 껍데기에만 건다.

```css
/* app/globals.css — 추가만 한다 */
@theme {
  --font-display: var(--font-gothic-a1), "Apple SD Gothic Neo", sans-serif;
  --font-body-admin: var(--font-plex-kr), "Apple SD Gothic Neo", sans-serif;
  --font-mono-admin: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

`app/layout.tsx`에서 할 일:

- `IBM_Plex_Sans_KR`(400/500/600)을 `--font-plex-kr`로 추가
- `IBM_Plex_Mono`(500)를 `--font-plex-mono`로 추가
- 기존 `Gothic_A1` 굵기를 `["400","700"]` → `["400","700","800","900"]`로 확장
- 기존 5개 글꼴 변수(`--font-noto-sans-kr`, `--font-noto-serif-kr`, `--font-nanum-gothic`,
  `--font-nanum-myeongjo`, `--font-gothic-a1`)는 **전부 그대로 둔다.**
  `components/editor/RichTextEditor.tsx`의 글꼴 선택지가 이 변수들을 이름으로 참조하고,
  공개 페이지가 저장된 글꼴을 렌더링하려면 같은 변수가 살아 있어야 한다

어드민 본문 글꼴은 `app/admin/layout.tsx`의 껍데기 `<div>`와 `/login`의 `<main>`에만 건다.
`<body>`에 걸면 공개 페이지가 같이 바뀐다.

### 섹션 라벨 (eyebrow)

랜딩의 특징적인 요소라 어드민 그룹 제목에 그대로 쓴다 — 페이지 목록의 `발행됨` / `임시저장` /
`보관`, 고객 화면의 섹션 제목 등.

```
IBM Plex Mono · 11px · letter-spacing .14em · 대문자 · #6E665E
앞에 22px × 2px 플레임 바, 사이 간격 10px
```

한글 라벨에는 `text-transform: uppercase`가 영향을 주지 않으므로 그대로 둔다.

## 디자인 토큰

`app/globals.css`에 정의한다. 값은 승인된 목업에서 그대로 가져온 것이다.

### 배경 (어드민 캔버스)

```css
background:
  radial-gradient(760px 420px at 12% -8%, #ffd9a8 0%, transparent 62%),
  radial-gradient(700px 480px at 92% 8%, #cfe0ff 0%, transparent 60%),
  linear-gradient(160deg, #f7f8fc 0%, #eef1f8 100%);
background-attachment: fixed;
```

따뜻한 쪽 오로라(`#ffd9a8`)가 플레임 액센트와 같은 계열이라 그대로 둔다.
`background-attachment: fixed`로 스크롤해도 오로라가 따라오지 않게 한다.

### 유리 패널

| 항목 | 값 |
|---|---|
| 배경 | `rgb(255 255 255 / 0.76)` |
| 블러 | `backdrop-filter: blur(18px)` |
| 테두리 | `1px solid rgb(255 255 255 / 0.85)` |
| 그림자 | `0 6px 22px rgb(20 25 60 / 0.09)` |
| 모서리 | `14px` |

경고용 변형(체험 종료 임박 패널): 배경 `rgb(255 247 237 / 0.82)`, 테두리 `rgb(251 146 60 / 0.35)`.

### 입력칸 · 필터 칩

배경 `rgb(255 255 255 / 0.70)`, 테두리 `1px solid rgb(255 255 255 / 0.90)`,
그림자 `0 1px 4px rgb(20 25 60 / 0.06)`, 모서리 `10px`.

반투명 테두리만으로는 포커스 위치가 보이지 않으므로 포커스 링을 따로 준다.

#### 포커스 링

랜딩의 `outline: 2px solid #FFB03A`를 그대로 쓸 수 없다. 랜딩은 다크 바탕이라 앰버가
10.8:1로 잘 보이지만, 어드민의 밝은 유리 위에서는 **1.76:1**이라 WCAG 2.1 비텍스트 대비
기준(3:1)에 못 미친다. 앰버를 살리되 어두운 바깥선을 한 겹 덧대 기준을 맞춘다.

```css
outline: none;
box-shadow:
  0 0 0 2px #FFB03A,
  0 0 0 3.5px rgb(21 21 28 / 0.55);
```

안쪽 앰버가 브랜드를 담당하고, 바깥 어두운 선이 밝은 배경과의 경계를 만든다. 사이드바처럼
어두운 곳에서는 앰버가 이미 10.8:1이라 바깥선이 보이지 않아도 문제없다.

### 버튼

| 종류 | 배경 | 글자 | 모서리 |
|---|---|---|---|
| 주요 | `var(--gradient-flame)` | `#22150B` | `999px` |
| 보조 | `rgb(255 255 255 / 0.70)` + 흰 테두리 | `#4b5563` | `999px` |
| 위험 | `rgb(254 226 226 / 0.85)` | `#b91c1c` | `999px` |

주요 버튼 그림자는 `0 10px 30px -14px rgb(255 107 44 / 0.85)`.
버튼만 알약형이고, 입력칸은 `10px`, 패널은 `14px`을 유지한다.

글자색 `#22150B`는 플레임 세 정지점 전부에서 AA를 넘는다 — 앰버 끝 9.8:1, 가운데 주황
6.3:1, 빨강 끝 4.6:1. 그라데이션 어디에 글자가 걸려도 읽힌다.

### 모서리 정리

| 대상 | 값 |
|---|---|
| 유리 패널 | `14px` |
| 입력칸 · 달력 칸 | `10px` |
| 필터 칩 | `999px` (알약) |
| 버튼 | `999px` (알약) |
| 상태 칩 · 태그 | `999px` (알약) |

### 글자색

| 용도 | 값 | 유리 패널 위 대비 |
|---|---|---|
| 본문 | `#111827` | 17.1:1 |
| 보조 | `#4b5563` | 7.3:1 |
| 흐린 글자 | `#6b7280` | 4.7:1 |
| 섹션 라벨 | `#6E665E` | 5.4:1 |

`#9ca3af`(2.5:1)는 어디에도 쓰지 않는다. **본문 글자는 최소 14px**을 지킨다 — 지금
`text-xs`(12px)로 된 메타 정보가 여럿 있는데 전부 `text-sm`(14px) 이상으로 올린다.
단, 뱃지·칩·섹션 라벨은 11~12px까지 허용한다.

### 사이드바

지금의 `#0b0b10` 네이비를 그대로 둔다. 유리로 바꾸지 않는다 — 어두운 앵커가 하나 있어야
밝은 캔버스가 뜬다. 바뀌는 것은 두 가지다.

- 메뉴 글자색 `#9ca3af` → `#A79E94` (랜딩의 `--ink-2`, 네이비 위 7.4:1)
- 현재 메뉴에 왼쪽 2px 플레임 바 추가

## 상태 색 한 벌

지금은 seed-design `Badge`, 직접 만든 회색 태그 칩, D-day 뱃지가 따로 논다. 하나로 합친다.
이 여섯 톤은 데이터 구분용이라 브랜드 플레임과 섞지 않는다.

| 톤 | 배경 | 글자 | 쓰이는 곳 |
|---|---|---|---|
| `indigo` | `#e0e7ff` | `#3730a3` | 달력 생성, 고객 신규 |
| `blue` | `#dbeafe` | `#1d4ed8` | 달력 전송, 고객 체험중, 페이지 전송됨 |
| `green` | `#dcfce7` | `#15803d` | 달력 신청, 고객 전환, 페이지 발행 |
| `red` | `#fee2e2` | `#b91c1c` | 달력 체험 종료, D-3 이하 |
| `amber` | `#fef3c7` | `#92400e` | 페이지 임시저장, D-4~D-7 |
| `gray` | `#f3f4f6` | `#4b5563` | 고객 이탈, 페이지 보관, 전송 태그 |

전부 AA를 통과한다. 가장 낮은 것은 `green` 4.57:1로 기준(4.5:1)에 아슬아슬하므로 두 색을
더 흐리게 바꾸지 않는다. 나머지는 red 5.30 · blue 5.49 · amber 6.37 · gray 6.87 · indigo 8.06:1.

## 컴포넌트 구조

### 새로 만드는 것

**`lib/ui/tones.ts`** — 순수 함수. 톤 이름을 Tailwind 클래스 문자열로 바꾼다.
UI를 안 거치고 테스트할 수 있다.

```ts
export type Tone = "indigo" | "blue" | "green" | "red" | "amber" | "gray";
export function toneClass(tone: Tone): string;
```

**`components/ui/GlassPanel.tsx`** — 유리 패널 하나. 서버 컴포넌트.

```tsx
type Props = {
  tone?: "default" | "warning";
  className?: string;
  children: React.ReactNode;
};
```

**`components/ui/Chip.tsx`** — 뱃지·태그·칩을 전부 대신한다. 서버 컴포넌트.

```tsx
type Props = { tone: Tone; children: React.ReactNode };
```

**`components/ui/SectionLabel.tsx`** — 플레임 바가 붙은 eyebrow 라벨. 서버 컴포넌트.

```tsx
type Props = { children: React.ReactNode };
```

기존 seed-design `Badge`를 쓰던 `StatusBadge`, `CustomerStatusBadge`, `TrialDDayBadge`
세 곳이 `Chip`으로 갈아탄다. seed-design 자체는 계속 쓴다 — `ActionButton`, `TextField`,
`Text`, 레이아웃(`HStack`/`VStack`/`Box`)은 그대로 둔다. 표면(surface)만 우리가 가져온다.

### 달력 칩 요약

`lib/calendar/events.ts`에 추가한다.

```ts
export type DayChip = { kind: CalendarEventKind; count: number };
export type DaySummary = { chips: DayChip[]; overflow: number };

/** 하루치 이벤트를 종류별로 묶어 칩 목록으로 만든다. max개를 넘으면 나머지는 overflow로. */
export function summarizeDay(events: CalendarEvent[], max?: number): DaySummary;
```

- 종류 순서는 기존 `KIND_ORDER`를 따른다
- 기본 `max`는 3. 종류는 최대 4개뿐이라 overflow 칩은 `+1`로만 나타난다
- 빈 배열이면 `{ chips: [], overflow: 0 }`

`EVENT_META`에 두 필드를 더한다 — 이모지는 상세 목록에만 남기고 칸 안에서는 안 쓴다.
칩이 스스로 뜻을 말하므로 범례는 넣지 않는다.

```ts
export const EVENT_META: Record<CalendarEventKind, {
  icon: string;       // 기존
  label: string;      // 기존: "생성" "전송" "신청" "체험 종료"
  shortLabel: string; // 칸 안 칩용: "생성" "전송" "신청" "종료"
  tone: Tone;         // indigo / blue / green / red
}>;
```

### 달력 칸

| 항목 | 지금 | 바뀐 뒤 |
|---|---|---|
| 날짜 숫자 | 12px `#374151` | 14px `#374151` (IBM Plex Mono), 일요일만 `#b91c1c` |
| 최소 높이 | 56px (`min-h-14`) | 72px |
| 칸 안 내용 | 이모지 + 숫자 | 컬러 칩 최대 3개 + `+N` |
| 일요일 | 구분 없음 | 날짜 숫자 `#b91c1c` (흰 바탕 6.4:1) |
| 오늘 | 1px 링 | 1px `#15151c` 테두리 |
| 선택한 날 | `#111827` 채움 | `#15151c` 채움, 칩은 그대로 |
| 앞뒤 빈 칸 | 빈 div | 그대로 |
| 월 제목 | `t4Bold` | Gothic A1 800, 20px |

날짜 숫자에 IBM Plex Mono를 쓰면 자릿수가 달라도 세로줄이 맞는다.

## 화면별 적용

| 화면 | 바뀌는 것 |
|---|---|
| `app/layout.tsx` | 글꼴 2종 추가, Gothic A1 굵기 확장 |
| `app/admin/layout.tsx` | 껍데기에 캔버스 배경 + 어드민 본문 글꼴. 사이드바 |
| `/admin` | 폭 확대. 달력 전면 개편. 페이지 목록 3개 그룹이 각각 유리 패널 |
| `/admin/customers` | 폭 확대. 경고 패널(warning 톤), 필터 칩, 검색칸, 고객 표 |
| `/admin/customers/[id]`, `/new` | 폼 전체를 유리 패널 안으로. 입력칸 통일 |
| `/admin/published` | 폭 확대. 항목마다 유리 패널. URL 읽기전용 칸, 전송일·태그 컨트롤 |
| `/admin/new`, `/admin/[id]/edit` | 폭 확대. 에디터 폼과 블록 목록을 유리 패널 안으로 |
| `/login` | 캔버스 배경 위 유리 카드. 어드민 본문 글꼴 |

**본문 폭**은 전 화면 `max-w-3xl`(768px) → `max-w-[1160px]`. 랜딩페이지의 `--shell`과 같은
값이다. 에디터 화면도 같은 값을 쓴다.

### 에디터 화면의 적용 수준

`components/editor/*` 12개 파일은 **표면과 입력칸만** 새 토큰으로 바꾼다. 블록 편집기 각각의
구성(어떤 필드가 어떤 순서로 있는지, 드래그 핸들 동작)은 손대지 않는다. 지금 잘 돌아가는
기능이고, 이번 작업은 스타일 개편이지 기능 개편이 아니다.

`RichTextEditor`의 글꼴 선택 드롭다운은 손대지 않는다 — 여기서 고르는 글꼴은 공개 페이지에
저장되는 값이라 어드민 글꼴 체계와 별개다.

## 테스트

이 저장소의 테스트는 전부 `lib/` 아래 순수 로직이고 컴포넌트 테스트는 없다. 스타일 변경은
테스트로 잡히지 않는다. 따라서:

**테스트를 새로 쓰는 곳** — `lib/ui/tones.ts`와 `lib/calendar/events.ts`의 `summarizeDay`.
둘 다 순수 함수라 TDD로 간다.

**회귀 방지** — 기존 92개 테스트가 계속 통과해야 한다. `tsc --noEmit`과 `npm run lint`도
통과해야 한다. `lib/calendar/events.test.ts`는 `EVENT_META` 구조가 바뀌므로 같이 손본다.

**공개 페이지 회귀 확인** — 범위 밖이지만 글꼴 변수와 `--color-navy-950`을 건드리는 작업이라
반드시 눈으로 본다. 확인할 것:

- `/c/[slug]` 본문 글꼴이 그대로인가 (Noto Sans KR)
- 제목 블록의 `font-serif`가 그대로인가 (Noto Serif KR)
- 리치 에디터에서 고른 글꼴 5종이 공개 페이지에 그대로 나오는가
- 읽기 진행바 색이 그대로인가

**눈으로 확인** — 어드민 8개 화면을 1280×900에서 실제 데이터로 하나씩 본다. 각 화면에서
확인할 것: 패널 경계가 보이는지, 글자가 배경에 묻히지 않는지, 포커스 링이 보이는지,
주요 버튼의 플레임이 배경과 싸우지 않는지.

## 안 하는 것

- 공개 랜딩페이지(`/c/[slug]`)와 `components/public/*` — 고객이 받아보는 영업 자산이고,
  글래스 효과는 본문 가독성을 떨어뜨린다. 코드 주석에도 미니멀 디자인 유지가 명시돼 있다
- 세일즈 랜딩페이지(`tax-sales`) — 저장소가 다르고 이번 범위가 아니다. 브랜드 값을
  가져오기만 한다
- 어드민의 다크 전환 — 랜딩은 다크지만 어드민은 데이터를 오래 보는 화면이라 밝게 간다
- 다크 모드 — 지금 `light-only`로 고정돼 있고 요청에 없다
- 반응형 재설계 — 어드민은 데스크톱에서만 쓴다. 다만 폭을 넓히므로 `max-w`가
  좁은 화면에서 자연스럽게 줄어드는지는 확인한다
- seed-design 교체 — `Badge`만 `Chip`으로 갈아타고 나머지는 그대로 쓴다
- 기능 변경 — 이번 작업으로 동작이 바뀌는 곳은 없어야 한다

## 선행 조건

해결됐다. PR #9(고객 일괄 삭제), #10(전송일·태그), #11(대시보드 달력)이 모두 `main`에
머지됐다 — #10은 #11 브랜치에 포함되어 함께 들어갔다. 이 개편은 세 PR이 만든 파일을 거의 다
다시 고치므로 그 위에서 시작한다.
