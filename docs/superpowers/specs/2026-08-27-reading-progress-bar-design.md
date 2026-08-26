# 읽기 진행률 표시줄 설계

## 배경

발행된 페이지(`app/c/[slug]/page.tsx`)를 읽는 독자에게, 전체 글에서 지금 얼마나 읽었는지(스크롤 위치 기준) 화면 상단에 얇은 바로 보여준다.

## 범위

- 발행된 페이지(`page.status === "published"`)에서만 동작한다. 관리자가 임시저장 페이지를 미리보기할 때(`PreviewBanner`가 뜨는 상태)는 표시하지 않는다 — 노란색 "미리보기 모드" 배너와 겹치는 레이아웃 문제를 피하고, 이 기능의 목적(실제 독자 경험)과도 맞다.
- 화면 맨 위에 고정된 얇은 바가 스크롤에 따라 왼쪽에서 오른쪽으로 채워진다.
- 스크롤할 내용이 없을 만큼 짧은 페이지에서는 표시줄 자체를 렌더링하지 않는다.

## 컴포넌트 구조

### 신규: `components/public/ReadingProgressBar.tsx`

Props 없음(클라이언트 컴포넌트, `window`/`document`의 스크롤 상태만 읽는다).

- `useRef`로 바 DOM 엘리먼트를 참조하고, `scroll`/`resize` 이벤트를 `requestAnimationFrame`으로 스로틀링해서 진행률을 계산한다.
- 진행률 = `window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)`, `0~1` 범위로 clamp.
- 계산한 진행률은 **React state가 아니라 바 엘리먼트의 `style.transform = scaleX(progress)`에 직접 쓴다** — 스크롤마다 리렌더가 발생하지 않게 하기 위함이다. `components/public/ScrollReveal.tsx`는 상태 전환이 "hidden → revealed" 한 번뿐이라 `useState`로 충분했지만, 이건 연속적으로 바뀌는 값이라 다른 전략이 필요하다.
- `width` 대신 `transform: scaleX()`를 쓰는 이유: 레이아웃 재계산 없이 GPU 합성만으로 처리되어 스크롤 성능에 영향을 주지 않는다.
- `document.documentElement.scrollHeight - window.innerHeight <= 0`이면(스크롤할 내용이 없으면) 표시줄을 렌더링하지 않는다. 이 판단은 `useState`(예: `const [visible, setVisible] = useState(false)`)로 관리해서, 마운트 시 1회와 `resize` 시 재확인한다 — 스크롤 진행률 자체와 달리 "보이나 안 보이나"는 자주 바뀌지 않는 값이라 리렌더 비용이 문제되지 않는다.

### 수정: `app/c/[slug]/page.tsx`

`import PreviewBanner from "@/components/public/PreviewBanner";` 다음 줄에 `import ReadingProgressBar from "@/components/public/ReadingProgressBar";`를 추가하고, `{page.status !== "published" && <PreviewBanner />}` 다음 줄에 `{page.status === "published" && <ReadingProgressBar />}`를 추가한다.

## 스타일

`position: fixed; top: 0; left: 0; width: 100%; height: 3px`, `transform-origin: left`, 배경색은 고정 짙은 네이비 `#0f172a`(관리자 사이드바의 `navy-950`와 통일). 별도의 옅은 배경 트랙은 두지 않는다 — 진행률만큼 채워지는 바 하나만 존재하며, 스크롤하지 않은 상태에서는 `scaleX(0)`이라 자연히 안 보인다.

## 에러 처리 & 엣지 케이스

- 모바일 브라우저의 주소창 접힘/펼침 등으로 화면 높이가 바뀌는 경우 `resize` 이벤트로 진행률과 표시 여부를 재계산한다.
- 브라우저가 예전 것이라 관련 API가 없는 극단적 케이스는 고려하지 않는다(YAGNI) — `window.scrollY`, `document.documentElement.scrollHeight`, `requestAnimationFrame` 모두 오래전부터 표준으로 지원되는 API다.

## 검증

이 프로젝트에는 자동화 테스트가 없다. `npm run lint` + `npx tsc --noEmit` 클린 확인 후, 브라우저 수동 확인(발행된 페이지에서 스크롤하며 바가 부드럽게 채워지는지, 스크롤 끝에서 100%가 되는지, 짧은 페이지에선 안 보이는지, 미리보기 모드에선 안 보이는지)으로 검증한다. 에이전트 세션 샌드박스는 `.env.local`이 없어 `/admin` 로그인이 안 되므로, 실제 브라우저 확인은 사용자 로컬 환경에서 진행한다.

## 범위 밖 (YAGNI)

- 진행률 숫자(%) 표시
- 옅은 배경 트랙
- 페이지별/CTA 색상과 연동한 커스터마이징
- 완독(100%) 시 별도 애니메이션이나 이벤트
- CSS `scroll-timeline`/`animation-timeline: scroll()` 기반 구현 — 최신 크롬 계열에서는 JS 없이도 가능하지만, 이 서비스의 주 사용 환경인 카카오톡 인앱 브라우저(iOS는 WebKit 기반)에서 지원이 불확실해 JS(스크롤 이벤트 + rAF) 방식을 사용한다.
