# 카카오 브랜드메시지 랜딩페이지 생성기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세무사(잠재 고객)에게 보내는 카카오톡 브랜드메시지 버튼이 연결될 콘텐츠 랜딩페이지를, Framer 없이 폼 입력만으로 생성·발행·관리할 수 있는 내부 도구를 Next.js + Supabase로 구축한다.

**Architecture:** Next.js 16 App Router. `/admin`(비밀번호 보호) 아래에서 블록 조립식 에디터로 페이지를 만들고 Supabase Postgres에 저장한다. `/c/[slug]`가 그 데이터를 읽어 노션 디자인 가이드(세리프 제목/산세리프 본문/숫자카드/얇은 선)를 따라 공개 렌더링한다. 인증은 별도 사용자 테이블 없이 공유 비밀번호 1개 + 서명된 쿠키로 처리한다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase(`@supabase/supabase-js`, Postgres + Storage), zod, nanoid, Tiptap(`@tiptap/react` 등) 리치 에디터, isomorphic-dompurify

## Global Constraints

- Next.js **16**을 사용한다. 이 버전은 `middleware.ts`가 **deprecated**이며 `proxy.ts`(export 함수명 `proxy`)로 대체되었다 — 반드시 `proxy.ts`를 사용한다.
- App Router의 동적 라우트 `params`와 `searchParams`는 모두 `Promise`이며 `await`해야 한다 (`params: Promise<{ id: string }>` 형태).
- Tailwind CSS v4 사용, 별도 `tailwind.config` 파일 없이 `app/globals.css`의 `@theme`으로 토큰을 정의한다.
- Supabase 클라이언트는 **서버 코드에서만** `SUPABASE_SERVICE_ROLE_KEY`로 생성한다. 클라이언트 번들에 절대 노출하지 않는다.
- 승인된 스펙에 따라 **별도 유닛 테스트 프레임워크를 도입하지 않는다.** 각 태스크의 검증은 `npm run build`, `npx tsc --noEmit`, `npm run lint`, 그리고 dev 서버 대상 `curl`/브라우저 수동 확인으로 한다.
- 환경변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`이 없으면 `next build`/`tsc`/`eslint`는 통과하지만(모든 데이터 조회 라우트가 `force-dynamic`이라 빌드 시점에 실행되지 않음), 실제 데이터베이스가 필요한 수동 확인 단계는 값이 설정된 뒤에만 가능하다. 값이 없으면 사용자에게 요청하고 받을 때까지 해당 수동 검증 단계는 보류한다.
- 한국어 전용, i18n 없음.
- 이 프로젝트는 아직 원격 저장소가 없다. 각 태스크마다 **로컬 커밋**만 수행하고, 원격 저장소 연결이나 `git push`는 사용자 확인 없이 절대 실행하지 않는다.
- 이미지는 `next/image` 대신 일반 `<img>` 태그로 렌더링한다 (Supabase Storage의 동적 공개 URL에 대해 `next.config.ts`의 remote patterns 설정을 늘리지 않기 위한 의도적 선택). `eslint-disable-next-line @next/next/no-img-element` 주석을 해당 라인에 단다.
- CTA 버튼 색상 등 사용자가 입력한 값은 항상 `getReadableTextColor()`로 대비를 계산해 텍스트 색을 정한다.

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

**Interfaces:**
- Produces: `npm run dev` / `npm run build` / `npm run lint`이 동작하는 기본 Next.js 16 프로젝트. 이후 모든 태스크는 `app/`, `components/`, `lib/`를 이 스캐폴드 위에 추가한다. `app/globals.css`가 정의하는 `--font-sans`/`--font-serif` CSS 변수는 이후 모든 컴포넌트가 `font-sans`/`font-serif` Tailwind 유틸리티로 사용한다.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "nugget-landing-generator",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  }
}
```

- [ ] **Step 2: 의존성 설치**

Run:
```bash
npm install next@latest react@latest react-dom@latest @supabase/supabase-js zod nanoid isomorphic-dompurify @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-text-style @tiptap/extension-highlight
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next @eslint/eslintrc tailwindcss @tailwindcss/postcss
```

Expected: `node_modules/`가 생성되고 `package.json`에 dependencies/devDependencies가 채워짐. `next`가 `16.x`로 설치됐는지 `node_modules/next/package.json`의 `version` 필드로 확인한다.

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: next.config.ts 작성**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: postcss.config.mjs 작성**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 6: eslint.config.mjs 작성**

```js
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];

export default eslintConfig;
```

- [ ] **Step 7: .gitignore 작성**

```
# dependencies
/node_modules

# next.js
/.next/
/out/

# production
/build

# env files (secrets)
.env
.env*.local

# misc
.DS_Store
*.pem
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# typescript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 8: .env.local.example 작성 (문서용, 실제 값은 채우지 않음)**

```
# Supabase 프로젝트 설정 > API 에서 발급
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# /admin 로그인 비밀번호 (직접 정하기)
ADMIN_PASSWORD=

# 로그인 쿠키 서명용 임의의 긴 문자열 (예: openssl rand -hex 32)
SESSION_SECRET=
```

- [ ] **Step 9: app/globals.css 작성**

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-noto-sans-kr), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-noto-serif-kr), ui-serif, serif;
}

body {
  background-color: white;
}

.rich-text p {
  margin-bottom: 1em;
}
.rich-text p:last-child {
  margin-bottom: 0;
}
.rich-text mark {
  background-color: #fff3a3;
  padding: 0 0.15em;
}
```

- [ ] **Step 10: app/layout.tsx 작성**

```tsx
import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-kr",
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-noto-serif-kr",
});

export const metadata: Metadata = {
  title: "너겟 랜딩페이지 생성기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${notoSerifKr.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 11: app/page.tsx 작성 (placeholder)**

```tsx
export default function RootPage() {
  return <main className="p-10 text-center">Coming soon</main>;
}
```

- [ ] **Step 12: 빌드 확인**

Run:
```bash
npm run build
```
Expected: 에러 없이 빌드 성공.

- [ ] **Step 13: 커밋**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 project"
```

---

### Task 2: Supabase 스키마 & 서버 클라이언트

**Files:**
- Create: `supabase/schema.sql`
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Produces: `getSupabaseServerClient(): SupabaseClient` — 이후 모든 서버 코드(Route Handler, Server Component)가 Supabase에 접근할 때 이 함수를 호출한다. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 없으면 명확한 에러를 던진다.

- [ ] **Step 1: supabase/schema.sql 작성 (사용자가 Supabase SQL 에디터에서 직접 실행할 런북)**

```sql
create extension if not exists pgcrypto;

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  blocks jsonb not null default '[]'::jsonb,
  cta_label text not null default '',
  cta_href text not null default '',
  cta_color text not null default '#FEE500',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_updated_at_idx on pages (updated_at desc);

insert into storage.buckets (id, name, public)
values ('banner-images', 'banner-images', true)
on conflict (id) do nothing;
```

- [ ] **Step 2: 사용자에게 Supabase 프로젝트 준비 요청**

이 태스크부터는 실제 Supabase 프로젝트가 필요하다. 사용자에게 다음을 요청한다:
1. https://supabase.com 에서 새 프로젝트 생성
2. SQL 에디터에서 `supabase/schema.sql` 내용 실행
3. Project Settings > API 에서 `Project URL`과 `service_role` 시크릿 키 발급받아 전달받기

받은 값을 프로젝트 루트의 `.env.local`(git에 커밋되지 않음)에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`로 설정한다. **아직 값을 받지 못했다면 이후 태스크의 코드 작성은 계속 진행하되, Supabase에 실제로 접속해야 하는 수동 검증 단계는 값을 받을 때까지 보류하고 사용자에게 다시 요청한다.**

- [ ] **Step 3: lib/supabase/server.ts 작성**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. .env.local을 확인하세요."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 4: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음 (Supabase 키가 없어도 빌드는 통과해야 한다 — 이 함수는 아직 어디서도 호출되지 않는다).

- [ ] **Step 5: 커밋**

```bash
git add supabase lib/supabase
git commit -m "feat: add Supabase schema and server client"
```

---

### Task 3: 인증 (비밀번호 로그인 + 세션 쿠키 + 라우트 가드)

**Files:**
- Create: `lib/auth/session.ts`
- Create: `proxy.ts`
- Create: `app/login/page.tsx`
- Create: `app/api/login/route.ts`
- Create: `app/api/logout/route.ts`

**Interfaces:**
- Consumes: 없음 (환경변수 `ADMIN_PASSWORD`, `SESSION_SECRET`만 사용)
- Produces: `SESSION_COOKIE`(쿠키 이름 상수), `createSessionToken(): Promise<string>`, `verifySessionToken(token?: string | null): Promise<boolean>`, `requireAdminSession(request: NextRequest): Promise<boolean>` — 이후 모든 `/admin` 라우트와 `/api/pages*`, `/api/upload` Route Handler가 `requireAdminSession`을 사용해 인증을 검사한다. `/c/[slug]`는 `verifySessionToken` + `await cookies()`로 관리자 여부를 직접 확인한다.

- [ ] **Step 1: lib/auth/session.ts 작성**

```ts
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "nugget_admin_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET 환경변수가 필요합니다.");

  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${payloadB64}.${signatureB64}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return false;

  const key = await getHmacKey(secret);
  const expectedSignature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const expectedSignatureB64 = base64UrlEncode(new Uint8Array(expectedSignature));
  if (expectedSignatureB64 !== signatureB64) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as {
      exp: number;
    };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function requireAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
```

- [ ] **Step 2: proxy.ts 작성 (프로젝트 루트, Next.js 16의 middleware 대체)**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
```

- [ ] **Step 3: app/api/login/route.ts 작성**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get("password");
  const next = (formData.get("next") as string) || "/admin";

  if (password !== process.env.ADMIN_PASSWORD) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await createSessionToken();
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
```

- [ ] **Step 4: app/api/logout/route.ts 작성**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
```

- [ ] **Step 5: app/login/page.tsx 작성**

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-gray-900">관리자 로그인</h1>
        <input type="hidden" name="next" value={params.next ?? "/admin"} />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          autoFocus
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {params.error && <p className="text-sm text-red-600">비밀번호가 올바르지 않아요.</p>}
        <button
          type="submit"
          className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white"
        >
          로그인
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음.

- [ ] **Step 7: 수동 로그인 흐름 확인 (ADMIN_PASSWORD, SESSION_SECRET이 .env.local에 설정되어 있어야 함 — 없다면 사용자에게 요청)**

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s -c /tmp/nugget-cookies.txt -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin
# 302 (미인증 상태로 /login 리다이렉트) 예상

curl -s -c /tmp/nugget-cookies.txt -o /dev/null -w "%{http_code}\n" -X POST \
  -F "password=$ADMIN_PASSWORD" -F "next=/admin" http://localhost:3000/api/login
# 303 예상, 쿠키 파일에 nugget_admin_session이 저장됨

grep nugget_admin_session /tmp/nugget-cookies.txt
kill %1
```
Expected: 첫 curl은 302, 로그인 curl은 303, 쿠키 파일에 `nugget_admin_session` 항목이 보임. (아직 `/admin` 페이지 자체는 구현 전이라 로그인 성공 후 리다이렉트 대상은 404가 나올 수 있음 — 이 단계에서 확인할 것은 인증/쿠키 발급 로직이다.)

- [ ] **Step 8: 커밋**

```bash
git add proxy.ts lib/auth app/login app/api/login app/api/logout
git commit -m "feat: add admin password auth with signed session cookie"
```

---

### Task 4: 데이터 계층 (타입, 슬러그, Supabase 리포지토리)

**Files:**
- Create: `lib/pages/types.ts`
- Create: `lib/pages/slug.ts`
- Create: `lib/pages/repository.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient`(from `@/lib/supabase/server`)
- Produces: 타입 `Block`, `BannerBlock`, `TextBlock`, `StatsBlock`, `PageStatus`, `PageInput`, `PageRecord`. zod 스키마 `blockSchema`, `pageInputSchema`, `pageStatusSchema`. 함수 `generateSlug(): string`, `listPages(): Promise<PageRecord[]>`, `getPageBySlug(slug: string): Promise<PageRecord | null>`, `getPageById(id: string): Promise<PageRecord | null>`, `createPage(input: PageInput): Promise<PageRecord>`, `updatePage(id: string, input: PageInput): Promise<PageRecord>`, `updatePageStatus(id: string, status: PageStatus): Promise<PageRecord>`. 이후 모든 API 라우트, 에디터, 공개 페이지가 이 타입/함수를 사용한다.

- [ ] **Step 1: lib/pages/types.ts 작성**

```ts
import { z } from "zod";

export const bannerBlockSchema = z.object({
  type: z.literal("banner"),
  imageUrl: z.string().min(1),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

export const textBlockSchema = z.object({
  type: z.literal("text"),
  heading: z.string().optional(),
  bodyHtml: z.string(),
});

export const statsBlockSchema = z.object({
  type: z.literal("stats"),
  items: z
    .array(
      z.object({
        number: z.string().min(1),
        label: z.string().min(1),
      })
    )
    .min(2)
    .max(4),
});

export const blockSchema = z.discriminatedUnion("type", [
  bannerBlockSchema,
  textBlockSchema,
  statsBlockSchema,
]);

export type BannerBlock = z.infer<typeof bannerBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type StatsBlock = z.infer<typeof statsBlockSchema>;
export type Block = z.infer<typeof blockSchema>;

export const pageStatusSchema = z.enum(["draft", "published", "archived"]);
export type PageStatus = z.infer<typeof pageStatusSchema>;

export const pageInputSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  slug: z
    .string()
    .min(1, "슬러그를 입력해주세요")
    .regex(/^[a-z0-9-]+$/, "영문 소문자, 숫자, 하이픈만 사용할 수 있어요"),
  status: pageStatusSchema,
  blocks: z.array(blockSchema),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  ctaColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요"),
});
export type PageInput = z.infer<typeof pageInputSchema>;

export type PageRecord = PageInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: lib/pages/slug.ts 작성**

```ts
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function generateSlug(): string {
  return nanoid();
}
```

- [ ] **Step 3: lib/pages/repository.ts 작성**

```ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Block, PageInput, PageRecord, PageStatus } from "./types";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  blocks: Block[];
  cta_label: string;
  cta_href: string;
  cta_color: string;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: PageRow): PageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as PageStatus,
    blocks: row.blocks,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    ctaColor: row.cta_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPages(): Promise<PageRecord[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as PageRow[]).map(rowToRecord);
}

export async function getPageBySlug(slug: string): Promise<PageRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as PageRow) : null;
}

export async function getPageById(id: string): Promise<PageRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as PageRow) : null;
}

export async function createPage(input: PageInput): Promise<PageRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      slug: input.slug,
      title: input.title,
      status: input.status,
      blocks: input.blocks,
      cta_label: input.ctaLabel,
      cta_href: input.ctaHref,
      cta_color: input.ctaColor,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as PageRow);
}

export async function updatePage(id: string, input: PageInput): Promise<PageRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .update({
      slug: input.slug,
      title: input.title,
      status: input.status,
      blocks: input.blocks,
      cta_label: input.ctaLabel,
      cta_href: input.ctaHref,
      cta_color: input.ctaColor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as PageRow);
}

export async function updatePageStatus(id: string, status: PageStatus): Promise<PageRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as PageRow);
}
```

- [ ] **Step 4: 타입/슬러그 로직 임시 렌더링으로 검증**

`app/page.tsx`를 임시로 아래 내용으로 바꾼다:

```tsx
import { generateSlug } from "@/lib/pages/slug";
import { pageInputSchema } from "@/lib/pages/types";

export default function RootPage() {
  const slug = generateSlug();
  const parsed = pageInputSchema.safeParse({
    title: "테스트",
    slug,
    status: "draft",
    blocks: [{ type: "stats", items: [{ number: "6", label: "가지" }, { number: "2", label: "건" }] }],
    ctaLabel: "상담",
    ctaHref: "tel:0212345678",
    ctaColor: "#FEE500",
  });

  return (
    <main className="p-10 text-center">
      <p>slug: {slug}</p>
      <p>valid: {String(parsed.success)}</p>
    </main>
  );
}
```

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s http://localhost:3000 | grep -o "valid: true"
kill %1
```
Expected: `valid: true` 출력, `slug: ` 뒤에 8자리 영문소문자+숫자 문자열이 보임.

- [ ] **Step 5: app/page.tsx를 placeholder로 되돌리기**

Task 1 Step 11 내용(`<main className="p-10 text-center">Coming soon</main>`)으로 복원한다.

- [ ] **Step 6: 타입체크 확인**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add app/page.tsx lib/pages
git commit -m "feat: add page data layer (types, slug, Supabase repository)"
```

---

### Task 5: 배너 이미지 업로드 API

**Files:**
- Create: `app/api/upload/route.ts`

**Interfaces:**
- Consumes: `requireAdminSession`(from `@/lib/auth/session`), `getSupabaseServerClient`(from `@/lib/supabase/server`)
- Produces: `POST /api/upload` — `multipart/form-data`로 `file` 필드를 받아 Supabase Storage `banner-images` 버킷에 업로드하고 `{ url: string }`을 반환한다. 이후 배너 블록 에디터(Task 9)가 이 엔드포인트를 호출한다.

- [ ] **Step 1: app/api/upload/route.ts 작성**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const extension = file.name.split(".").pop() ?? "png";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("banner-images")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("[upload] Supabase Storage 업로드 실패", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from("banner-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
```

- [ ] **Step 2: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음.

- [ ] **Step 3: 수동 업로드 확인 (Supabase 값과 Task 3에서 만든 로그인 쿠키가 필요 — 없으면 이 단계는 보류)**

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s -b /tmp/nugget-cookies.txt -X POST -F "file=@/path/to/any/image.png" http://localhost:3000/api/upload
kill %1
```
Expected: `{"url":"https://....supabase.co/storage/v1/object/public/banner-images/....png"}` 형태의 응답.

- [ ] **Step 4: 커밋**

```bash
git add app/api/upload
git commit -m "feat: add banner image upload endpoint"
```

---

### Task 6: 공개 페이지 블록 렌더링 컴포넌트

**Files:**
- Create: `lib/contrast.ts`
- Create: `components/public/BannerBlock.tsx`
- Create: `components/public/TextBlock.tsx`
- Create: `components/public/StatsBlock.tsx`
- Create: `components/public/CtaButton.tsx`
- Create: `components/public/PreviewBanner.tsx`

**Interfaces:**
- Consumes: `BannerBlock`, `TextBlock`, `StatsBlock` 타입(from `@/lib/pages/types`)
- Produces: `getReadableTextColor(hexBackground: string): "#000000" | "#ffffff"`, 컴포넌트 `BannerBlock({ block })`, `TextBlock({ block })`, `StatsBlock({ block })`, `CtaButton({ label, href, color })`, `PreviewBanner()`. Task 7의 `/c/[slug]`가 이 컴포넌트들을 조립한다.

- [ ] **Step 1: lib/contrast.ts 작성**

```ts
export function getReadableTextColor(hexBackground: string): "#000000" | "#ffffff" {
  const hex = hexBackground.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}
```

- [ ] **Step 2: components/public/BannerBlock.tsx 작성**

```tsx
import type { BannerBlock as BannerBlockType } from "@/lib/pages/types";

export default function BannerBlock({ block }: { block: BannerBlockType }) {
  return (
    <figure className="w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.imageUrl} alt={block.title ?? ""} className="w-full object-cover" />
      {(block.title || block.subtitle) && (
        <figcaption className="mx-auto max-w-xl px-6 py-6 text-center">
          {block.title && (
            <p className="font-serif text-xl font-bold text-gray-900">{block.title}</p>
          )}
          {block.subtitle && <p className="mt-1 text-sm text-gray-500">{block.subtitle}</p>}
        </figcaption>
      )}
    </figure>
  );
}
```

- [ ] **Step 3: components/public/TextBlock.tsx 작성**

```tsx
import type { TextBlock as TextBlockType } from "@/lib/pages/types";

export default function TextBlock({ block }: { block: TextBlockType }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      {block.heading && (
        <h2 className="mb-3 font-serif text-lg font-bold text-gray-900">{block.heading}</h2>
      )}
      <div
        className="rich-text text-[15px] leading-relaxed text-gray-700"
        dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
      />
    </div>
  );
}
```

- [ ] **Step 4: components/public/StatsBlock.tsx 작성**

```tsx
import type { StatsBlock as StatsBlockType } from "@/lib/pages/types";

export default function StatsBlock({ block }: { block: StatsBlockType }) {
  return (
    <div className="mx-auto grid max-w-xl grid-cols-2 gap-px border border-gray-200 bg-gray-200 px-6">
      {block.items.map((item, index) => (
        <div key={index} className="bg-white px-4 py-6 text-center">
          <p className="font-serif text-2xl font-bold text-gray-900">{item.number}</p>
          <p className="mt-1 text-xs text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: components/public/CtaButton.tsx 작성**

```tsx
import { getReadableTextColor } from "@/lib/contrast";

type Props = { label: string; href: string; color: string };

export default function CtaButton({ label, href, color }: Props) {
  if (!label || !href) return null;

  return (
    <div className="mx-auto max-w-xl px-6 py-10 text-center">
      <a
        href={href}
        className="inline-block w-full rounded-full px-6 py-4 text-base font-bold"
        style={{ backgroundColor: color, color: getReadableTextColor(color) }}
      >
        {label}
      </a>
    </div>
  );
}
```

- [ ] **Step 6: components/public/PreviewBanner.tsx 작성**

```tsx
export default function PreviewBanner() {
  return (
    <div className="sticky top-0 z-10 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
      미리보기 모드 — 아직 발행되지 않은 페이지예요
    </div>
  );
}
```

- [ ] **Step 7: 임시 렌더링으로 컴포넌트 검증**

`app/page.tsx`를 임시로 아래 내용으로 바꾼다:

```tsx
import BannerBlock from "@/components/public/BannerBlock";
import TextBlock from "@/components/public/TextBlock";
import StatsBlock from "@/components/public/StatsBlock";
import CtaButton from "@/components/public/CtaButton";

export default function RootPage() {
  return (
    <main>
      <BannerBlock block={{ type: "banner", imageUrl: "https://placehold.co/800x400", title: "테스트 배너" }} />
      <TextBlock block={{ type: "text", heading: "테스트 소제목", bodyHtml: "<p>테스트 본문입니다</p>" }} />
      <StatsBlock block={{ type: "stats", items: [{ number: "6가지", label: "체크리스트" }, { number: "100만원", label: "예상 절세액" }] }} />
      <CtaButton label="상담 신청하기" href="tel:0212345678" color="#FEE500" />
    </main>
  );
}
```

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s http://localhost:3000 | grep -o "테스트 소제목"
curl -s http://localhost:3000 | grep -o "상담 신청하기"
kill %1
```
Expected: 둘 다 출력됨.

- [ ] **Step 8: app/page.tsx를 placeholder로 되돌리기**

- [ ] **Step 9: 커밋**

```bash
git add app/page.tsx lib/contrast.ts components/public
git commit -m "feat: add public block rendering components"
```

---

### Task 7: 공개 랜딩페이지 라우트 (`/c/[slug]`)

**Files:**
- Create: `app/c/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPageBySlug`(from `@/lib/pages/repository`), `verifySessionToken`, `SESSION_COOKIE`(from `@/lib/auth/session`), `BannerBlock`/`TextBlock`/`StatsBlock`/`CtaButton`/`PreviewBanner`(from `@/components/public/*`)
- Produces: 카카오 브랜드메시지 버튼이 실제로 연결될 공개 URL `/c/[slug]`.

- [ ] **Step 1: app/c/[slug]/page.tsx 작성**

```tsx
import { cookies } from "next/headers";
import { getPageBySlug } from "@/lib/pages/repository";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import BannerBlock from "@/components/public/BannerBlock";
import TextBlock from "@/components/public/TextBlock";
import StatsBlock from "@/components/public/StatsBlock";
import CtaButton from "@/components/public/CtaButton";
import PreviewBanner from "@/components/public/PreviewBanner";

export const dynamic = "force-dynamic";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  const cookieStore = await cookies();
  const isAdmin = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!page || (page.status !== "published" && !isAdmin)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-gray-500">아직 공개되지 않은 페이지예요.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-10">
      {page.status !== "published" && <PreviewBanner />}
      <div className="divide-y divide-gray-100">
        {page.blocks.map((block, index) => {
          if (block.type === "banner") return <BannerBlock key={index} block={block} />;
          if (block.type === "text") return <TextBlock key={index} block={block} />;
          return <StatsBlock key={index} block={block} />;
        })}
      </div>
      <CtaButton label={page.ctaLabel} href={page.ctaHref} color={page.ctaColor} />
    </main>
  );
}
```

- [ ] **Step 2: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음.

- [ ] **Step 3: 수동 확인 (Supabase 값 필요 — 없으면 보류하고 사용자에게 요청)**

Supabase SQL 에디터에서 테스트용 행을 직접 삽입:
```sql
insert into pages (slug, title, status, blocks, cta_label, cta_href, cta_color)
values (
  'test-page',
  '테스트 페이지',
  'published',
  '[{"type":"text","heading":"안녕하세요","bodyHtml":"<p>테스트 본문</p>"}]'::jsonb,
  '상담 신청하기',
  'tel:0212345678',
  '#FEE500'
);
```

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s http://localhost:3000/c/test-page | grep -o "안녕하세요"
curl -s http://localhost:3000/c/does-not-exist | grep -o "아직 공개되지 않은"
kill %1
```
Expected: 첫 curl은 `안녕하세요` 출력, 두 번째는 `아직 공개되지 않은` 출력.

- [ ] **Step 4: 커밋**

```bash
git add app/c
git commit -m "feat: add public landing page route"
```

---

### Task 8: 리치 텍스트 에디터 (Tiptap)

**Files:**
- Create: `components/editor/RichTextEditor.tsx`

**Interfaces:**
- Consumes: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-text-style`(`TextStyleKit`), `@tiptap/extension-highlight`
- Produces: `RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void })` 클라이언트 컴포넌트. Task 9의 `TextBlockEditor`가 사용한다.

- [ ] **Step 1: components/editor/RichTextEditor.tsx 작성**

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";

const FONT_SIZES = ["14px", "16px", "20px", "24px"];

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyleKit, Highlight],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded border border-gray-300">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 text-sm font-bold ${editor.isActive("bold") ? "bg-gray-200" : ""}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 text-sm italic ${editor.isActive("italic") ? "bg-gray-200" : ""}`}
        >
          I
        </button>
        <select
          className="rounded border border-gray-200 px-1 text-sm"
          defaultValue="default"
          onChange={(e) => {
            const size = e.target.value;
            if (size === "default") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(size).run();
            }
          }}
        >
          <option value="default">글자 크기</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#FFF3A3" }).run()}
          className={`rounded px-2 py-1 text-sm ${editor.isActive("highlight") ? "bg-gray-200" : ""}`}
        >
          강조
        </button>
      </div>
      <EditorContent editor={editor} className="rich-text p-3 text-sm" />
    </div>
  );
}
```

- [ ] **Step 2: 임시 렌더링으로 컴포넌트 검증**

`app/page.tsx`를 임시로 아래 내용으로 바꾼다:

```tsx
"use client";

import { useState } from "react";
import RichTextEditor from "@/components/editor/RichTextEditor";

export default function RootPage() {
  const [html, setHtml] = useState("<p>초기 본문</p>");
  return (
    <main className="mx-auto max-w-xl p-10">
      <RichTextEditor value={html} onChange={setHtml} />
      <pre className="mt-4 text-xs">{html}</pre>
    </main>
  );
}
```

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s http://localhost:3000 | grep -o "초기 본문"
kill %1
```
Expected: `초기 본문` 출력. (툴바 버튼 동작 자체는 브라우저에서 `npm run dev` 실행 후 `http://localhost:3000`에 접속해 굵게/기울임/글자크기/강조 버튼을 눌러 육안으로 확인한다.)

- [ ] **Step 3: app/page.tsx를 placeholder로 되돌리기**

- [ ] **Step 4: 타입체크 확인**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add app/page.tsx components/editor/RichTextEditor.tsx
git commit -m "feat: add Tiptap rich text editor for body text blocks"
```

---

### Task 9: 블록 편집 컴포넌트 (배너/텍스트/숫자카드 + 블록 리스트)

**Files:**
- Create: `components/editor/BannerBlockEditor.tsx`
- Create: `components/editor/TextBlockEditor.tsx`
- Create: `components/editor/StatsBlockEditor.tsx`
- Create: `components/editor/BlockList.tsx`

**Interfaces:**
- Consumes: `Block`, `BannerBlock`, `TextBlock`, `StatsBlock` 타입(from `@/lib/pages/types`), `RichTextEditor`(from `./RichTextEditor`), `POST /api/upload`
- Produces: `type EditableBlock = Block & { _key: string }`, `BlockList({ blocks: EditableBlock[], onChange: (blocks: EditableBlock[]) => void })`. Task 11의 `PageEditorForm`이 `BlockList`를 사용하며, `EditableBlock`의 `_key`는 배열 순서 변경 시 각 블록(특히 리치 에디터 내부 상태)이 올바른 데이터와 계속 연결되도록 React key로 쓰인다 — 저장 시에는 반드시 `_key`를 제거하고 서버로 보내야 한다.

- [ ] **Step 1: components/editor/BannerBlockEditor.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import type { BannerBlock } from "@/lib/pages/types";

type Props = {
  block: BannerBlock;
  onChange: (block: BannerBlock) => void;
};

export default function BannerBlockEditor({ block, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await response.json();

    setUploading(false);

    if (!response.ok) {
      setError("업로드에 실패했어요.");
      return;
    }

    onChange({ ...block, imageUrl: result.url });
  }

  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">배너 이미지</p>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
      {uploading && <p className="text-xs text-gray-400">업로드 중...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {block.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.imageUrl} alt="" className="h-32 w-full rounded object-cover" />
      )}
      <input
        type="text"
        placeholder="오버레이 제목 (선택)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <input
        type="text"
        placeholder="부제 (선택)"
        value={block.subtitle ?? ""}
        onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
    </div>
  );
}
```

- [ ] **Step 2: components/editor/TextBlockEditor.tsx 작성**

```tsx
"use client";

import type { TextBlock } from "@/lib/pages/types";
import RichTextEditor from "./RichTextEditor";

type Props = {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
};

export default function TextBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">본문 텍스트</p>
      <input
        type="text"
        placeholder="소제목 (선택)"
        value={block.heading ?? ""}
        onChange={(e) => onChange({ ...block, heading: e.target.value })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <RichTextEditor
        value={block.bodyHtml}
        onChange={(bodyHtml) => onChange({ ...block, bodyHtml })}
      />
    </div>
  );
}
```

- [ ] **Step 3: components/editor/StatsBlockEditor.tsx 작성**

```tsx
"use client";

import type { StatsBlock } from "@/lib/pages/types";

type Props = {
  block: StatsBlock;
  onChange: (block: StatsBlock) => void;
};

export default function StatsBlockEditor({ block, onChange }: Props) {
  function updateItem(index: number, field: "number" | "label", value: string) {
    const items = block.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange({ ...block, items });
  }

  function addItem() {
    if (block.items.length >= 4) return;
    onChange({ ...block, items: [...block.items, { number: "", label: "" }] });
  }

  function removeItem(index: number) {
    if (block.items.length <= 2) return;
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">숫자 카드</p>
      {block.items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder="숫자 (예: 6가지)"
            value={item.number}
            onChange={(e) => updateItem(index, "number", e.target.value)}
            className="w-1/3 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="설명"
            value={item.label}
            onChange={(e) => updateItem(index, "label", e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            disabled={block.items.length <= 2}
            className="rounded px-2 text-xs text-red-600 disabled:opacity-30"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        disabled={block.items.length >= 4}
        className="text-xs text-blue-600 disabled:opacity-30"
      >
        + 카드 추가
      </button>
    </div>
  );
}
```

- [ ] **Step 4: components/editor/BlockList.tsx 작성**

```tsx
"use client";

import type { Block } from "@/lib/pages/types";
import BannerBlockEditor from "./BannerBlockEditor";
import TextBlockEditor from "./TextBlockEditor";
import StatsBlockEditor from "./StatsBlockEditor";

export type EditableBlock = Block & { _key: string };

function createDefaultBlock(type: Block["type"]): Block {
  if (type === "banner") return { type: "banner", imageUrl: "", title: "", subtitle: "" };
  if (type === "text") return { type: "text", heading: "", bodyHtml: "<p></p>" };
  return {
    type: "stats",
    items: [
      { number: "", label: "" },
      { number: "", label: "" },
    ],
  };
}

type Props = {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
};

export default function BlockList({ blocks, onChange }: Props) {
  function updateBlock(index: number, block: Block) {
    onChange(blocks.map((b, i) => (i === index ? { ...block, _key: b._key } : b)));
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addBlock(type: Block["type"]) {
    onChange([...blocks, { ...createDefaultBlock(type), _key: crypto.randomUUID() }]);
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={block._key} className="relative">
          <div className="mb-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => moveBlock(index, -1)}
              disabled={index === 0}
              className="text-xs disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveBlock(index, 1)}
              disabled={index === blocks.length - 1}
              className="text-xs disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeBlock(index)}
              className="text-xs text-red-600"
            >
              블록 삭제
            </button>
          </div>
          {block.type === "banner" && (
            <BannerBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
          )}
          {block.type === "text" && (
            <TextBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
          )}
          {block.type === "stats" && (
            <StatsBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => addBlock("banner")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 배너 이미지
        </button>
        <button
          type="button"
          onClick={() => addBlock("text")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 본문 텍스트
        </button>
        <button
          type="button"
          onClick={() => addBlock("stats")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 숫자 카드
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 타입체크 확인**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음. (아직 어디에서도 `BlockList`를 렌더링하지 않으므로 build/lint만 확인하고, 실제 동작은 Task 11에서 `/admin/new`에 연결한 뒤 브라우저로 확인한다.)

- [ ] **Step 6: 커밋**

```bash
git add components/editor/BannerBlockEditor.tsx components/editor/TextBlockEditor.tsx components/editor/StatsBlockEditor.tsx components/editor/BlockList.tsx
git commit -m "feat: add block editors and block list with stable keys"
```

---

### Task 10: 페이지 저장 API (`/api/pages`)

**Files:**
- Create: `lib/sanitize.ts`
- Create: `app/api/pages/route.ts`
- Create: `app/api/pages/[id]/route.ts`

**Interfaces:**
- Consumes: `pageInputSchema`, `createPage`, `updatePage`(from `@/lib/pages/*`), `requireAdminSession`
- Produces: `sanitizePageInputHtml(input: PageInput): PageInput`, `POST /api/pages`(생성, 201), `PATCH /api/pages/[id]`(수정, 200). Task 11의 `PageEditorForm`이 이 두 엔드포인트를 호출한다.

- [ ] **Step 1: lib/sanitize.ts 작성**

```ts
import DOMPurify from "isomorphic-dompurify";
import type { PageInput } from "./pages/types";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "span", "mark"];
const ALLOWED_ATTR = ["style"];

export function sanitizeBodyHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

export function sanitizePageInputHtml(input: PageInput): PageInput {
  return {
    ...input,
    blocks: input.blocks.map((block) =>
      block.type === "text" ? { ...block, bodyHtml: sanitizeBodyHtml(block.bodyHtml) } : block
    ),
  };
}
```

- [ ] **Step 2: app/api/pages/route.ts 작성**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pageInputSchema } from "@/lib/pages/types";
import { createPage } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizePageInputHtml } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pageInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const page = await createPage(sanitizePageInputHtml(parsed.data));
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("[pages] 생성 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: app/api/pages/[id]/route.ts 작성**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pageInputSchema } from "@/lib/pages/types";
import { updatePage } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizePageInputHtml } from "@/lib/sanitize";

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
  const parsed = pageInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const page = await updatePage(id, sanitizePageInputHtml(parsed.data));
    return NextResponse.json(page);
  } catch (error) {
    console.error("[pages] 수정 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음.

- [ ] **Step 5: 수동 생성 확인 (Supabase 값 + 로그인 쿠키 필요 — 없으면 보류)**

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s -b /tmp/nugget-cookies.txt -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{"title":"API 테스트","slug":"api-test","status":"draft","blocks":[],"ctaLabel":"상담","ctaHref":"tel:0212345678","ctaColor":"#FEE500"}'
kill %1
```
Expected: `id`, `slug: "api-test"`, `status: "draft"`가 포함된 JSON 응답 (201).

- [ ] **Step 6: 커밋**

```bash
git add lib/sanitize.ts app/api/pages
git commit -m "feat: add page create/update API with HTML sanitization"
```

---

### Task 11: 에디터 폼 조립 + 신규/수정 라우트

**Files:**
- Create: `components/editor/PageEditorForm.tsx`
- Create: `app/admin/new/page.tsx`
- Create: `app/admin/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `BlockList`, `EditableBlock`(from `@/components/editor/BlockList`), `generateSlug`(from `@/lib/pages/slug`), `getPageById`(from `@/lib/pages/repository`), `PageRecord`(from `@/lib/pages/types`)
- Produces: `PageEditorForm({ mode, initialSlug, initialPage? })` — `/admin/new`와 `/admin/[id]/edit`에서 공용으로 쓰는 전체 에디터 화면.

- [ ] **Step 1: components/editor/PageEditorForm.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Block, PageRecord, PageStatus } from "@/lib/pages/types";
import BlockList, { type EditableBlock } from "./BlockList";

function withKeys(blocks: Block[]): EditableBlock[] {
  return blocks.map((block) => ({ ...block, _key: crypto.randomUUID() }));
}

function stripKeys(blocks: EditableBlock[]): Block[] {
  return blocks.map((block) => {
    const clone: Record<string, unknown> = { ...block };
    delete clone._key;
    return clone as Block;
  });
}

type Props = {
  mode: "create" | "edit";
  initialSlug: string;
  initialPage?: PageRecord;
};

export default function PageEditorForm({ mode, initialSlug, initialPage }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPage?.title ?? "");
  const [slug, setSlug] = useState(initialPage?.slug ?? initialSlug);
  const [ctaLabel, setCtaLabel] = useState(initialPage?.ctaLabel ?? "상담 신청하기");
  const [ctaHref, setCtaHref] = useState(initialPage?.ctaHref ?? "");
  const [ctaColor, setCtaColor] = useState(initialPage?.ctaColor ?? "#FEE500");
  const [blocks, setBlocks] = useState<EditableBlock[]>(withKeys(initialPage?.blocks ?? []));
  const [saving, setSaving] = useState<PageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(status: PageStatus) {
    setSaving(status);
    setError(null);

    const payload = {
      title,
      slug,
      status,
      blocks: stripKeys(blocks),
      ctaLabel,
      ctaHref,
      ctaColor,
    };

    const url = mode === "create" ? "/api/pages" : `/api/pages/${initialPage!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(null);

    if (!response.ok) {
      setError("저장에 실패했어요. 값을 확인하고 다시 시도해주세요.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">URL 슬러그 (/c/{slug})</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {initialPage?.status === "published" && (
          <p className="text-xs text-amber-600">
            이미 발행된 페이지예요. 슬러그를 바꾸면 이미 발송된 카카오 메시지의 링크가 깨져요.
          </p>
        )}
      </div>

      <BlockList blocks={blocks} onChange={setBlocks} />

      <div className="space-y-2 border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700">CTA 버튼</label>
        <input
          type="text"
          placeholder="버튼 텍스트 (예: 상담 신청하기)"
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="링크 (https://... 또는 tel:01012345678)"
          value={ctaHref}
          onChange={(e) => setCtaHref(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">버튼 색상</label>
          <input
            type="color"
            value={ctaColor}
            onChange={(e) => setCtaColor(e.target.value)}
            className="h-8 w-12"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={saving !== null}
          className="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving === "draft" ? "저장 중..." : "임시저장"}
        </button>
        <button
          type="button"
          onClick={() => save("published")}
          disabled={saving !== null}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving === "published" ? "발행 중..." : "발행"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: app/admin/new/page.tsx 작성**

```tsx
import { generateSlug } from "@/lib/pages/slug";
import PageEditorForm from "@/components/editor/PageEditorForm";

export default function NewPagePage() {
  return <PageEditorForm mode="create" initialSlug={generateSlug()} />;
}
```

- [ ] **Step 3: app/admin/[id]/edit/page.tsx 작성**

```tsx
import { notFound } from "next/navigation";
import { getPageById } from "@/lib/pages/repository";
import PageEditorForm from "@/components/editor/PageEditorForm";

export const dynamic = "force-dynamic";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();

  return <PageEditorForm mode="edit" initialSlug={page.slug} initialPage={page} />;
}
```

- [ ] **Step 4: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음.

- [ ] **Step 5: 수동 확인 (Supabase 값 + 로그인 쿠키 필요 — 없으면 보류)**

`npm run dev`로 개발 서버를 띄우고 브라우저에서 `/login`으로 로그인한 뒤 `/admin/new`에 접속해:
1. 제목/CTA 입력, 배너·텍스트·숫자카드 블록을 각각 추가
2. 배너 블록에서 이미지 업로드가 실제로 동작하는지 확인
3. 텍스트 블록에서 굵게/기울임/글자크기/강조 툴바가 동작하는지 확인
4. 블록 위/아래 이동 버튼으로 순서를 바꿔도 각 블록 내용이 뒤섞이지 않는지 확인 (특히 텍스트 블록을 이동했을 때 입력한 본문이 그대로 유지되는지)
5. "발행" 클릭 → `/admin`으로 이동하는지 확인
6. 방금 만든 페이지의 `/admin/[id]/edit`으로 들어가 기존 값이 정상적으로 로드되는지 확인

- [ ] **Step 6: 커밋**

```bash
git add components/editor/PageEditorForm.tsx app/admin/new app/admin/[id]
git commit -m "feat: add page editor form and new/edit routes"
```

---

### Task 12: 대시보드 (`/admin`)

**Files:**
- Create: `components/dashboard/StatusBadge.tsx`
- Create: `components/dashboard/CopyLinkButton.tsx`
- Create: `components/dashboard/StatusActionButton.tsx`
- Create: `components/dashboard/PagesTable.tsx`
- Create: `app/api/pages/[id]/status/route.ts`
- Create: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `listPages`, `updatePageStatus`(from `@/lib/pages/repository`), `PageRecord`, `PageStatus`(from `@/lib/pages/types`), `requireAdminSession`
- Produces: `/admin` 대시보드 화면. `POST /api/pages/[id]/status` — 대시보드의 발행/보관 빠른 액션이 사용하는 상태 전용 엔드포인트.

- [ ] **Step 1: app/api/pages/[id]/status/route.ts 작성**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { pageStatusSchema } from "@/lib/pages/types";
import { updatePageStatus } from "@/lib/pages/repository";
import { requireAdminSession } from "@/lib/auth/session";

const bodySchema = z.object({ status: pageStatusSchema });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const page = await updatePageStatus(id, parsed.data.status);
    return NextResponse.json(page);
  } catch (error) {
    console.error("[pages] 상태 변경 실패", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: components/dashboard/StatusBadge.tsx 작성**

```tsx
import type { PageStatus } from "@/lib/pages/types";

const LABELS: Record<PageStatus, string> = {
  draft: "임시저장",
  published: "발행",
  archived: "보관",
};

const STYLES: Record<PageStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-400",
};

export default function StatusBadge({ status }: { status: PageStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 3: components/dashboard/CopyLinkButton.tsx 작성**

```tsx
"use client";

import { useState } from "react";

export default function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/c/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={handleCopy} className="text-xs text-blue-600 hover:underline">
      {copied ? "복사됨!" : "URL 복사"}
    </button>
  );
}
```

- [ ] **Step 4: components/dashboard/StatusActionButton.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PageStatus } from "@/lib/pages/types";

type Props = { id: string; status: PageStatus };

const NEXT_ACTION: Record<PageStatus, { label: string; status: PageStatus }> = {
  draft: { label: "발행하기", status: "published" },
  published: { label: "보관하기", status: "archived" },
  archived: { label: "임시저장으로 복원", status: "draft" },
};

export default function StatusActionButton({ id, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = NEXT_ACTION[status];

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/pages/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next.status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
    >
      {loading ? "처리 중..." : next.label}
    </button>
  );
}
```

- [ ] **Step 5: components/dashboard/PagesTable.tsx 작성**

```tsx
import Link from "next/link";
import type { PageRecord } from "@/lib/pages/types";
import StatusBadge from "./StatusBadge";
import CopyLinkButton from "./CopyLinkButton";
import StatusActionButton from "./StatusActionButton";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function PagesTable({ pages }: { pages: PageRecord[] }) {
  if (pages.length === 0) {
    return <p className="text-sm text-gray-500">아직 생성된 페이지가 없어요.</p>;
  }

  return (
    <ul className="divide-y divide-gray-100 rounded border border-gray-200">
      {pages.map((page) => (
        <li key={page.id} className="flex items-center justify-between gap-4 p-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={page.status} />
              <span className="text-sm font-medium text-gray-900">{page.title}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              생성 {formatDate(page.createdAt)} · 수정 {formatDate(page.updatedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <CopyLinkButton slug={page.slug} />
            <Link href={`/admin/${page.id}/edit`} className="text-xs text-gray-600 hover:underline">
              수정
            </Link>
            <StatusActionButton id={page.id} status={page.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: app/admin/page.tsx 작성**

```tsx
import Link from "next/link";
import { listPages } from "@/lib/pages/repository";
import PagesTable from "@/components/dashboard/PagesTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const pages = await listPages();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">랜딩페이지 목록</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            새 페이지 만들기
          </Link>
          <form action="/api/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:underline">
              로그아웃
            </button>
          </form>
        </div>
      </div>
      <PagesTable pages={pages} />
    </main>
  );
}
```

- [ ] **Step 7: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음.

- [ ] **Step 8: 수동 확인 (Supabase 값 + 로그인 필요 — 없으면 보류)**

`npm run dev`로 브라우저에서 `/admin` 접속해:
1. Task 11에서 만든 페이지가 목록에 보이는지
2. "URL 복사"가 클립보드에 `/c/[slug]` 전체 URL을 복사하는지
3. "발행하기"/"보관하기" 버튼을 눌러 상태가 바뀌고 배지가 갱신되는지
4. "로그아웃" 후 `/admin` 접속 시 `/login`으로 리다이렉트되는지

- [ ] **Step 9: 커밋**

```bash
git add components/dashboard app/api/pages/[id]/status app/admin/page.tsx
git commit -m "feat: add admin dashboard with status actions"
```

---

### Task 13: 루트 페이지 마무리 & 전체 배선 점검

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 최종 진입 동선 — 루트 접속 시 `/admin`으로 이동(미인증이면 `proxy.ts`가 다시 `/login`으로 보냄).

- [ ] **Step 1: app/page.tsx를 최종 버전으로 교체**

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/admin");
}
```

- [ ] **Step 2: 타입체크 & 빌드 확인**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 에러 없음.

- [ ] **Step 3: 전체 동선 수동 확인**

Run:
```bash
npm run build && npm run start &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
# 307/308 (redirect) 예상 — Location 헤더가 /admin인지 확인
curl -s -D - -o /dev/null http://localhost:3000 | grep -i "location"
kill %1
```
Expected: 3xx 응답, `Location: /admin` 헤더.

- [ ] **Step 4: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: redirect root path to admin dashboard"
```

---

### Task 14: 최종 QA (빌드/린트/타입체크 + 수동 확인 체크리스트)

**Files:** 없음 (검증 전용 태스크)

**Interfaces:** 없음

- [ ] **Step 1: 정적 검증 3종 세트**

Run:
```bash
npm run build
npx tsc --noEmit
npm run lint
```
Expected: 셋 다 에러 없이 통과.

- [ ] **Step 2: 전체 수동 QA 체크리스트 실행 (Supabase 값 필요 — 없으면 사용자에게 요청 후 진행)**

`npm run dev`로 개발 서버를 띄우고 아래 항목을 브라우저에서 직접 확인한다:

1. **인증**: `/admin` 미로그인 접속 시 `/login`으로 리다이렉트, 틀린 비밀번호 입력 시 에러 메시지, 올바른 비밀번호로 로그인 후 `/admin` 진입, 로그아웃 후 다시 접근 차단
2. **생성→임시저장→발행**: `/admin/new`에서 배너/텍스트/숫자카드 블록을 섞어 만들고 "임시저장" → 대시보드에 "임시저장" 배지로 표시되는지 → 공개 URL(`/c/[slug]`)에 비로그인 브라우저(시크릿 창)로 접속 시 "아직 공개되지 않은 페이지예요" 문구만 보이는지 → 다시 수정해서 "발행" → 시크릿 창에서 정상적으로 콘텐츠가 보이는지
3. **관리자 미리보기**: draft 상태 페이지를 로그인된 브라우저로 `/c/[slug]` 직접 접속 시 "미리보기 모드" 배너와 함께 콘텐츠가 보이는지
4. **이미지 업로드**: 배너 블록에서 이미지 업로드 후 공개 페이지에 정상적으로 표시되는지
5. **리치텍스트**: 굵게/기울임/글자크기/강조 서식을 적용한 본문이 공개 페이지에 그대로(서식 유지) 렌더링되는지, 스크립트 태그 등을 붙여넣었을 때 sanitize되어 무해화되는지(개발자 도구 콘솔에서 에러/알럿이 뜨지 않는지)
6. **블록 순서변경**: 여러 텍스트 블록을 추가하고 순서를 위/아래로 바꿨을 때 각 블록의 내용이 서로 뒤섞이지 않는지
7. **모바일 반응형**: 브라우저 개발자 도구로 375px 너비에서 공개 페이지와 에디터 화면이 깨지지 않는지
8. **CTA 대비**: CTA 색상을 밝은색(#FEE500)과 어두운색(#111111) 각각으로 설정해 텍스트가 항상 읽히는지
9. **보관**: 발행된 페이지를 "보관하기" 처리한 뒤 공개 URL 접속 시(비로그인) "아직 공개되지 않은 페이지예요"로 바뀌는지

- [ ] **Step 3: 발견된 문제 수정**

체크리스트에서 문제가 발견되면 해당 태스크의 파일을 직접 수정하고, 위 정적 검증 3종 세트를 다시 통과시킨다.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git status
```
변경사항이 있다면:
```bash
git commit -m "fix: address final QA findings"
```
없다면 커밋하지 않는다.

---
