import { cache } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getPageBySlug } from "@/lib/pages/repository";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import BannerBlock from "@/components/public/BannerBlock";
import TextBlock from "@/components/public/TextBlock";
import CtaButton from "@/components/public/CtaButton";
import PreviewBanner from "@/components/public/PreviewBanner";

export const dynamic = "force-dynamic";

// generateMetadata와 페이지 컴포넌트가 같은 요청에서 각각 조회하지 않도록 캐시한다.
const loadPage = cache(getPageBySlug);

// 카카오톡 인앱 브라우저는 헤더에 <title>을 그대로 노출한다.
// 발행된 페이지만 제목을 덮어써서, 비공개 페이지의 제목이 새어나가지 않게 한다.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);

  if (!page || page.status !== "published") return {};

  return { title: page.title };
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await loadPage(slug);

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
          // 알 수 없는 블록 타입(과거 숫자카드 데이터, 수동 편집/스키마 변경)은
          // 공개 페이지를 500으로 떨어뜨리지 않도록 조용히 건너뛴다.
          return null;
        })}
      </div>
      <CtaButton label={page.ctaLabel} href={page.ctaHref} color={page.ctaColor} />
    </main>
  );
}
