# 구분선 스타일 다양화 + 인라인 구분선 설계

## 배경 및 목표

`docs/superpowers/specs/2026-08-17-page-editor-enhancements-design.md`에서 만든 구분선 블록은 색상/두께 커스텀 없이 고정 스타일 한 가지(공개 페이지 블록 컨테이너의 공용 `divide-y` 회색 선을 그대로 재사용)만 지원한다. 이번 작업은 그 위에 두 가지를 추가한다.

1. **구분선 블록 스타일 다양화**: 구분선 블록에서 연한 실선/진한 실선/점선/파선/점 3개 장식 중 하나를 고를 수 있게 한다.
2. **인라인 구분선**: 본문 텍스트(리치텍스트 에디터) 안에서도 같은 5가지 스타일 중 하나를 골라 구분선을 삽입할 수 있게 한다.

두 기능은 프리셋 정의를 하나로 공유해, 블록 구분선과 인라인 구분선이 시각적으로 완전히 동일하게 보이도록 한다.

## 프리셋 정의 (공유)

새 파일 `lib/pages/dividerStyle.ts`에 5개 프리셋을 한 곳에 정의하고, 에디터 UI/공개 렌더링/리치텍스트 삽입 세 곳 모두 이 정의를 그대로 참조한다.

| id | 라벨 | 표현 |
|---|---|---|
| `solid-light` | 연한 실선 (기본값) | `border-top: 1px solid #E5E7EB` |
| `solid-dark` | 진한 실선 | `border-top: 2px solid #9CA3AF` |
| `dotted` | 점선 | `border-top: 1px dotted #D1D5DB` |
| `dashed` | 파선 | `border-top: 1px dashed #D1D5DB` |
| `dots` | 점 3개 장식 | 선이 아니라 가운데 정렬된 "• • •" 텍스트 (border 표현 불가하므로 별도 처리) |

## 1. 구분선 블록 스타일

### 데이터 모델

`lib/pages/types.ts`:

```ts
export const dividerStyleSchema = z.enum(["solid-light", "solid-dark", "dotted", "dashed", "dots"]);
export type DividerStyle = z.infer<typeof dividerStyleSchema>;

export const dividerBlockSchema = z.object({
  type: z.literal("divider"),
  style: dividerStyleSchema.optional(), // 없으면 "solid-light"로 취급 — 기존 데이터 하위호환, 마이그레이션 불필요
  scrollEffect: scrollEffectSchema.optional(),
});
```

### 렌더링 구조 변경 (기존 페이지 화면은 그대로 유지)

현재 `app/c/[slug]/page.tsx`의 블록 컨테이너는 `divide-y divide-gray-100`로 모든 블록 사이에 자동으로 얇은 회색 선을 긋고, 구분선 블록은 이 자동 선을 그대로 재사용한다. 구분선마다 다른 스타일을 표현하려면 구분선 블록만 이 공용 선에서 완전히 분리해야 한다:

- 컨테이너 className에서 `divide-y divide-gray-100` 제거 (`overflow-x-clip`은 유지)
- `BannerBlock`/`TextBlock`/`CtaButton`에 새 prop `isFirst: boolean`을 추가해, `isFirst`가 아니면 각 컴포넌트가 스스로 `border-t border-gray-100`을 렌더링하도록 한다 — `divide-y`가 하던 일(첫 블록 제외 모든 블록 위에 얇은 회색 선)을 그대로 재현하므로 **기존 페이지의 시각적 결과는 완전히 동일하게 유지된다**
- `app/c/[slug]/page.tsx`는 `.map()`에서 `isFirst={index === 0}`을 배너/텍스트/CTA 블록에만 전달한다 (구분선 블록에는 전달하지 않음 — 아래 참고)
- `DividerBlock`은 이 자동 테두리 대상이 아니다. 위치와 무관하게 항상 자기 `style` prop에 따른 선(또는 점 3개 텍스트)만 렌더링한다

### `DividerBlock` 컴포넌트

`components/public/DividerBlock.tsx`를 다음과 같이 다시 작성한다:

```tsx
import type { DividerStyle } from "@/lib/pages/types";
import { DIVIDER_STYLE_PRESETS } from "@/lib/pages/dividerStyle";

export default function DividerBlock({ style = "solid-light" }: { style?: DividerStyle }) {
  const preset = DIVIDER_STYLE_PRESETS[style];

  if (preset.kind === "dots") {
    return (
      <div className="mx-auto max-w-xl px-6 py-6 text-center text-sm tracking-widest text-gray-400">
        • • •
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <div style={{ borderTop: preset.borderTop }} />
    </div>
  );
}
```

`lib/pages/dividerStyle.ts`는 `DIVIDER_STYLE_PRESETS`를 다음 형태로 내보낸다(에디터 드롭다운의 라벨과 렌더링에 필요한 CSS를 한 곳에서 관리):

```ts
export const DIVIDER_STYLE_PRESETS: Record<
  DividerStyle,
  { label: string } & ({ kind: "line"; borderTop: string } | { kind: "dots" })
> = {
  "solid-light": { label: "연한 실선", kind: "line", borderTop: "1px solid #E5E7EB" },
  "solid-dark": { label: "진한 실선", kind: "line", borderTop: "2px solid #9CA3AF" },
  dotted: { label: "점선", kind: "line", borderTop: "1px dotted #D1D5DB" },
  dashed: { label: "파선", kind: "line", borderTop: "1px dashed #D1D5DB" },
  dots: { label: "점 3개 장식", kind: "dots" },
};
```

### 에디터 UI

새 컴포넌트 `components/editor/DividerStyleSelect.tsx` (`ScrollEffectSelect`와 동일한 패턴 — `value`/`onChange` props를 받는 `<select>`, `DIVIDER_STYLE_PRESETS`에서 옵션 목록 생성)를 `DividerBlockEditor`에 배치한다. `DividerBlockEditor`는 이제 "편집할 내용 없음" 안내 텍스트 대신 스타일 선택 UI를 갖는다.

## 2. 인라인 구분선 (리치텍스트 에디터)

### Tiptap 확장

새 파일 `lib/tiptap/dividerNode.ts` — 기존 `lib/tiptap/letterSpacing.ts`와 같은 패턴으로, `@tiptap/extension-horizontal-rule`의 `HorizontalRule` 노드를 확장한 커스텀 노드(이름: `"divider"`, 기존 `horizontalRule` 노드와 이름이 겹치지 않게 별도 이름 사용)를 만든다. `variant` 속성(기본값 `"solid-light"`)을 추가하고, `renderHTML`에서 `DIVIDER_STYLE_PRESETS`를 참조해 `<hr style="...">`을 출력한다.

`RichTextEditor.tsx`의 `StarterKit.configure`에서 `horizontalRule: false`는 그대로 유지하고(기본 `horizontalRule` 노드는 계속 비활성 상태), 대신 이 커스텀 `divider` 확장을 extensions 배열에 새로 추가한다. 삽입은 Tiptap 커맨드 오버로드에 의존하지 않고 `editor.chain().focus().insertContent({ type: "divider", attrs: { variant } }).run()`처럼 노드 타입 + 속성을 직접 지정하는 방식을 쓴다(아래 삽입 UI 참고) — 어떤 베이스 확장을 골라도 항상 동작하는 가장 단순한 방법이다.

### 삽입 UI

`RichTextEditor.tsx` 툴바에 "구분선 삽입" `<select>`를 추가한다 — 기존 글자 크기/글꼴 드롭다운과 같은 "선택 즉시 적용" 패턴:

```tsx
<select
  className="rounded border border-gray-200 px-1 text-sm"
  defaultValue="placeholder"
  onChange={(e) => {
    const variant = e.target.value as DividerStyle;
    if (DIVIDER_STYLE_PRESETS[variant].kind === "dots") {
      editor.chain().focus().insertContent('<p style="text-align:center">• • •</p>').run();
    } else {
      editor.chain().focus().insertContent({ type: "divider", attrs: { variant } }).run();
    }
    e.target.value = "placeholder";
  }}
>
  <option value="placeholder">구분선 삽입</option>
  {Object.entries(DIVIDER_STYLE_PRESETS).map(([id, preset]) => (
    <option key={id} value={id}>{preset.label}</option>
  ))}
</select>
```

"점 3개" 스타일은 `<hr>`로 표현할 수 없으므로(테두리로는 텍스트를 그릴 수 없음) `<hr>` 삽입 대신 가운데 정렬된 "• • •" 단락을 삽입한다. 나머지 4개 스타일은 `variant` 속성을 가진 `<hr>`을 삽입한다.

### Sanitizer 확장

`lib/sanitize.ts`의 `sanitizeBodyHtml`에 다음을 추가한다:

- `ALLOWED_TAGS`에 `"hr"` 추가
- `allowedStyles["*"]`에 다음 항목 추가:
  - `border-top-style`: `[/^(solid|dashed|dotted)$/]`
  - `border-top-color`: 기존 `COLOR_PATTERNS` 재사용
  - `border-top-width`: `[/^[12]px$/]` (프리셋이 1px 또는 2px만 사용하므로)
  - `text-align`: `[/^(left|center|right)$/]` ("점 3개" 단락이 쓰는 속성. 다른 프리셋에는 필요 없지만 화이트리스트에 있어야 저장 시 걸러지지 않는다)

## 에러 핸들링

- 기존 divider 블록 데이터(이번 작업 이전에 저장된, `style` 필드가 없는 데이터)는 `DividerBlock`의 기본 파라미터(`style = "solid-light"`)로 처리되어 에러 없이 이전과 동일하게 렌더링된다.
- 리치텍스트 본문에 아직 `hr`을 지원하지 않던 시절 저장된 데이터는 애초에 `hr`을 포함하지 않으므로 영향 없음.
- sanitizer 화이트리스트에 없는 값(예: 수동으로 조작된 임의의 `border-top-color`)은 기존 동작과 동일하게 저장 시 조용히 제거된다.

## 테스트 계획

기존 스펙과 동일하게 `next build`/`tsc --noEmit`/`eslint` + 수동 QA로 검증한다. 추가 수동 QA 항목:

- 기존 페이지(구분선 스타일 필드 없음)를 열어 "연한 실선"으로 정상 렌더링되는지, 배너/텍스트/CTA 블록의 화면상 모습이 이번 변경 전후로 동일한지(구분선 없는 페이지 기준 회귀 확인)
- 구분선 블록에서 5개 스타일을 각각 선택 → 저장 → 공개 페이지에서 의도한 스타일로 보이는지
- 리치텍스트 툴바에서 5개 스타일을 각각 본문에 삽입 → 저장 → 공개 페이지에서 sanitizer를 통과해 그대로 나타나는지(특히 `hr`이 걸러지지 않는지)
- 인라인 구분선이 포함된 본문을 다시 열어 편집해도 스타일이 유지되는지
- 페이지 첫 블록이 구분선인 경우에도(위에 선이 없어도 됨) 정상적으로 보이는지

## 스코프 제외

- 프리셋 5종 외의 자유 색상/두께 지정(색상 피커 등)
- "점 3개" 장식의 문구/기호 커스터마이징 (항상 고정된 "• • •")
- 구분선 두께를 세부 px 단위로 조정하는 UI
