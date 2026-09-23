import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EMPTY_STATS, type PageStats, type TrackInput } from "./types";

type StatsRow = {
  page_id: string;
  views: number;
  readers: number;
  reached_25: number;
  reached_50: number;
  reached_75: number;
  reached_100: number;
  avg_dwell_ms: number;
};

/**
 * 열람 1건을 기록한다. 같은 visit_id로 여러 번 불려도 행은 하나이고,
 * 도달률·체류시간은 Postgres 쪽 greatest()로 최대값만 남는다
 * (전송이 순서대로 도착한다는 보장이 없어서 앱에서 읽고-쓰기로 처리하면 안 된다).
 */
export async function recordPageView(
  pageId: string,
  input: Pick<TrackInput, "visitId" | "readerId" | "depth" | "dwellMs">
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.rpc("record_page_view", {
    p_page_id: pageId,
    p_visit_id: input.visitId,
    p_reader_id: input.readerId,
    p_depth: input.depth,
    p_dwell_ms: input.dwellMs,
  });

  if (error) throw error;
}

/**
 * 페이지 id별 집계. 페이지 수와 무관하게 쿼리 2번으로 끝난다
 * (도달률은 page_view_stats 뷰, 신청 건수는 customers).
 * 기록이 없는 페이지는 Map에 없으므로 호출부에서 EMPTY_STATS로 채운다.
 */
export async function getPageStats(): Promise<Map<string, PageStats>> {
  const supabase = getSupabaseServerClient();

  const [statsResult, submissionsResult] = await Promise.all([
    supabase.from("page_view_stats").select("*"),
    supabase.from("customers").select("source_page_id").not("source_page_id", "is", null),
  ]);

  if (statsResult.error) throw statsResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  const submissionCounts = new Map<string, number>();
  for (const row of (submissionsResult.data ?? []) as { source_page_id: string }[]) {
    submissionCounts.set(row.source_page_id, (submissionCounts.get(row.source_page_id) ?? 0) + 1);
  }

  const stats = new Map<string, PageStats>();
  for (const row of (statsResult.data ?? []) as StatsRow[]) {
    stats.set(row.page_id, {
      pageId: row.page_id,
      views: row.views,
      readers: row.readers,
      reached25: row.reached_25,
      reached50: row.reached_50,
      reached75: row.reached_75,
      reached100: row.reached_100,
      avgDwellMs: row.avg_dwell_ms,
      submissions: submissionCounts.get(row.page_id) ?? 0,
    });
  }

  // 열람 기록은 없는데 신청은 들어온 페이지(트래킹 도입 전 발송분)도 빠뜨리지 않는다.
  for (const [pageId, count] of submissionCounts) {
    if (!stats.has(pageId)) {
      stats.set(pageId, { ...EMPTY_STATS, pageId, submissions: count });
    }
  }

  return stats;
}
