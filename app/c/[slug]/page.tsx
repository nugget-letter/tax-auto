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
