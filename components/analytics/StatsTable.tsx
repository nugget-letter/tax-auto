import { formatDate, formatDuration } from "@/lib/format";
import type { PageStats } from "@/lib/analytics/types";
import type { PageRecord } from "@/lib/pages/types";

export type StatsRow = { page: PageRecord; stats: PageStats };

/**
 * 도달률의 분모는 열람 "횟수"다. 인원 기준으로 바꾸려면 같은 사람의 재방문 중
 * 가장 깊이 읽은 것만 세야 해서 계산이 복잡해지고, "얼마나 읽히는 글인가"를 보는
 * 목적에는 횟수 기준이 더 직접적이다. 인원은 규모를 보는 용도로 따로 보여준다.
 */
function percent(reached: number, views: number): number | null {
  return views === 0 ? null : Math.round((reached / views) * 100);
}

function DepthCell({ reached, views }: { reached: number; views: number }) {
  const value = percent(reached, views);

  if (value === null) {
    return (
      <td className="px-3 py-3 text-right align-middle text-sm text-[#9ca3af]">-</td>
    );
  }

  return (
    <td className="px-3 py-3 text-right align-middle">
      <span className="font-num text-sm font-medium text-[#111827]">{value}%</span>
      <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-black/5">
        <span className="flame-bar block h-full rounded-full" style={{ width: `${value}%` }} />
      </span>
      <span className="font-num mt-0.5 block text-[11px] text-[#9ca3af]">{reached}회</span>
    </td>
  );
}

export default function StatsTable({ rows }: { rows: StatsRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] border-collapse">
        <thead>
          <tr className="border-b border-black/5 text-left">
            <th className="px-4 py-3 text-xs font-medium text-[#6b7280]">페이지</th>
            <th className="px-3 py-3 text-xs font-medium text-[#6b7280]">발송일</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[#6b7280]">열람</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[#6b7280]">25%</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[#6b7280]">50%</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[#6b7280]">75%</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[#6b7280]">완독</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[#6b7280]">평균 체류</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[#6b7280]">신청</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ page, stats }, index) => (
            <tr
              key={page.id}
              className={index === rows.length - 1 ? "" : "border-b border-black/5"}
            >
              <td className="max-w-[260px] px-4 py-3 align-middle">
                <span className="block truncate text-sm font-medium text-[#111827]">
                  {page.title}
                </span>
                <span className="font-num block truncate text-xs text-[#9ca3af]">
                  /c/{page.slug}
                </span>
              </td>
              <td className="font-num px-3 py-3 align-middle text-sm whitespace-nowrap text-[#4b5563]">
                {page.sentOn ? formatDate(page.sentOn) : "-"}
              </td>
              <td className="px-3 py-3 text-right align-middle whitespace-nowrap">
                <span className="font-num block text-sm font-medium text-[#111827]">
                  {stats.views}회
                </span>
                <span className="font-num block text-xs text-[#9ca3af]">{stats.readers}명</span>
              </td>
              <DepthCell reached={stats.reached25} views={stats.views} />
              <DepthCell reached={stats.reached50} views={stats.views} />
              <DepthCell reached={stats.reached75} views={stats.views} />
              <DepthCell reached={stats.reached100} views={stats.views} />
              <td className="font-num px-3 py-3 text-right align-middle text-sm whitespace-nowrap text-[#4b5563]">
                {stats.views === 0 ? "-" : formatDuration(stats.avgDwellMs)}
              </td>
              <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                <span className="font-num block text-sm font-medium text-[#111827]">
                  {stats.submissions}건
                </span>
                {stats.views > 0 && (
                  <span className="font-num block text-xs text-[#9ca3af]">
                    {Math.round((stats.submissions / stats.views) * 100)}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
