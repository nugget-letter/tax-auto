import { Text } from "@seed-design/react";
import { listPages } from "@/lib/pages/repository";
import { getPageStats } from "@/lib/analytics/repository";
import { EMPTY_STATS } from "@/lib/analytics/types";
import GlassPanel from "@/components/ui/GlassPanel";
import StatsTable, { type StatsRow } from "@/components/analytics/StatsTable";
import type { PageRecord } from "@/lib/pages/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [pages, stats] = await Promise.all([listPages(), getPageStats().catch(() => null)]);

  // 발행된 적 있는 페이지만 본다. 보관 처리했어도 "그때 얼마나 읽혔나"는 남겨둔다.
  // 정렬은 발행된 URL 화면과 같게 — 실제로 보낸 날이 있으면 그 날 기준이다.
  const sortKey = (page: PageRecord) => page.sentOn ?? page.publishedAt!;
  const rows: StatsRow[] = pages
    .filter((page) => page.publishedAt !== null)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
    .map((page) => ({
      page,
      // 기록이 없는 페이지는 숨기지 않고 0으로 보여준다 — "안 읽혔다"도 정보다.
      stats: stats?.get(page.id) ?? { ...EMPTY_STATS, pageId: page.id },
    }));

  return (
    <div className="mx-auto max-w-[1160px] p-8">
      <h1 className="font-display text-2xl font-extrabold text-[#111827]">열람 분석</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-[#4b5563]">
        발송한 페이지를 사람들이 어디까지 읽었는지예요. 카카오톡 인앱 브라우저 특성상 실제
        인원보다 적게 집계될 수 있으니, 절대값보다 발송 간 비교로 봐주세요.
      </p>

      {stats === null ? (
        <GlassPanel className="mt-6 px-4 py-6">
          <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
            통계를 불러오지 못했어요. 잠시 후 새로고침해주세요.
          </Text>
        </GlassPanel>
      ) : rows.length === 0 ? (
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle" className="mt-6">
          아직 발행된 페이지가 없어요.
        </Text>
      ) : (
        <GlassPanel className="mt-6">
          <StatsTable rows={rows} />
        </GlassPanel>
      )}
    </div>
  );
}
