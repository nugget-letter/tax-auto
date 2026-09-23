import { z } from "zod";

/** 기록하는 도달 지점. 진입(0)은 별도로 다룬다. */
export const DEPTH_MILESTONES = [25, 50, 75, 100] as const;

/**
 * 방치된 탭이나 조작된 값이 평균 체류시간을 망가뜨리지 않도록 상한을 둔다.
 * 6시간을 넘겨 "읽고 있는" 방문은 실제로는 열어두고 잊은 탭이다.
 */
export const MAX_DWELL_MS = 6 * 60 * 60 * 1000;

/**
 * visit_id/reader_id는 uuid로 강제하지 않는다. 구형 안드로이드 WebView에
 * crypto.randomUUID가 없어 클라이언트가 폴백으로 만든 문자열을 보낼 수 있다.
 */
const idSchema = z.string().min(8).max(64);

export const trackSchema = z.object({
  slug: z.string().min(1).max(64),
  visitId: idSchema,
  readerId: idSchema.nullable(),
  depth: z.union([
    z.literal(0),
    z.literal(25),
    z.literal(50),
    z.literal(75),
    z.literal(100),
  ]),
  dwellMs: z.number().int().min(0).max(MAX_DWELL_MS),
});

export type TrackInput = z.infer<typeof trackSchema>;

/** page_view_stats 뷰 한 행 + customers에서 센 신청 건수. */
export type PageStats = {
  pageId: string;
  views: number;
  readers: number;
  reached25: number;
  reached50: number;
  reached75: number;
  reached100: number;
  avgDwellMs: number;
  submissions: number;
};

export const EMPTY_STATS: Omit<PageStats, "pageId"> = {
  views: 0,
  readers: 0,
  reached25: 0,
  reached50: 0,
  reached75: 0,
  reached100: 0,
  avgDwellMs: 0,
  submissions: 0,
};
