import { Text } from "@seed-design/react";
import { listPages } from "@/lib/pages/repository";
import { getPageStats } from "@/lib/analytics/repository";
import { EMPTY_STATS } from "@/lib/analytics/types";
import GlassPanel from "@/components/ui/GlassPanel";
import StatsTable, { type StatsRow } from "@/components/analytics/StatsTable";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [pages, stats] = await Promise.all([listPages(), getPageStats().catch(() => null)]);

  // 실제로 고객에게 보낸 페이지만 본다. 발행만 해두고 아직 안 보낸 페이지는 열람이
  // 없는 게 당연해서, 같이 두면 0%가 섞여 발송분끼리의 비교를 흐린다.
  const rows: StatsRow[] = pages
    .filter((page) => page.sentOn !== null)
    .sort((a, b) => b.sentOn!.localeCompare(a.sentOn!))
    .map((page) => ({
      page,
      // 기록이 없는 페이지는 숨기지 않고 0으로 보여준다 — "안 읽혔다"도 정보다.
      stats: stats?.get(page.id) ?? { ...EMPTY_STATS, pageId: page.id },
    }));

  return (
    <div className="mx-auto max-w-[1160px] p-8">
      <h1 className="font-display text-2xl font-extrabold text-[#111827]">열람 분석</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-[#4b5563]">
        발송한 페이지를 사람들이 어디까지 읽었는지예요. 절대값보다 발송 간 비교로 봐주세요.
      </p>

      <details className="group mt-4 max-w-[70ch]">
        <summary className="focus-flame inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-sm font-medium text-[#4b5563] hover:text-[#111827]">
          <span aria-hidden="true" className="transition-transform group-open:rotate-90">
            &rsaquo;
          </span>
          이 숫자를 어떻게 읽나요?
        </summary>

        <div className="mt-3 space-y-4 border-l-2 border-black/5 pl-4 text-sm leading-relaxed text-[#4b5563]">
          <section>
            <h2 className="font-medium text-[#111827]">&lsquo;회&rsquo;와 &lsquo;명&rsquo;은 다릅니다</h2>
            <p className="mt-1">
              <span className="font-num">142회 / 108명</span>은 링크가 142번 열렸고, 서로 다른
              기기 108대에서 열렸다는 뜻이에요. 같은 고객이 카카오톡에서 링크를 세 번 누르면
              <span className="font-num"> 3회 1명</span>으로 세요.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#111827]">&lsquo;명&rsquo;은 사람이 아니라 기기예요</h2>
            <p className="mt-1">
              <strong className="font-medium text-[#111827]">누가 읽었는지는 알 수 없어요.</strong>{" "}
              같은 링크가 고객 전원에게 똑같이 나가기 때문에, 페이지가 열릴 때 서버로 오는
              정보 안에 수신자를 구분할 단서가 없어요. 대신 브라우저에 익명 번호표를 하나
              남겨서 &ldquo;아까 왔던 기기가 또 왔다&rdquo;만 구분해요. 이름표가 아니라
              번호표라서, 그 번호가 어느 고객인지는 저장하지 않고 조회할 방법도 없어요.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#111827]">인원은 실제보다 많게 나와요</h2>
            <p className="mt-1">한 사람이 여러 명으로 쪼개지는 경우가 있어요.</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              <li>같은 고객이 휴대폰과 PC로 각각 열면 2명</li>
              <li>카카오톡에서 보고 사파리로 다시 열면 2명</li>
              <li>iOS 카카오톡은 저장이 유지되지 않을 수 있어, 같은 사람의 재방문이 새 기기로 잡히기도 해요</li>
            </ul>
            <p className="mt-1.5">
              반대로 여러 사람이 한 명으로 합쳐지는 건 기기를 같이 쓸 때뿐이라 드물어요. 그래서
              <strong className="font-medium text-[#111827]"> 실제 고객 수는 여기 적힌 인원보다 적거나 같아요.</strong>
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#111827]">도달률의 분모는 &lsquo;회&rsquo;예요</h2>
            <p className="mt-1">
              25% 칸의 <span className="font-num">61%</span>는 &ldquo;열람 142회 중 87회가 25%
              지점을 넘었다&rdquo;는 뜻이에요. 사람 기준이 아니라 열람 기준이라, 얼마나 읽히는
              글인지를 보는 데 더 맞아요.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#111827]">특정 고객이 읽었는지 보려면</h2>
            <p className="mt-1">
              지금 방식으로는 불가능해요. 그러려면 고객마다 다른 링크를 보내야 하고, 카카오
              채널 단체 발송으로는 전원에게 같은 링크가 나가요. 알림톡이나 문자처럼 개인별로
              보낼 수 있는 수단이 먼저 필요해요.
            </p>
          </section>
        </div>
      </details>

      {stats === null ? (
        <GlassPanel className="mt-6 px-4 py-6">
          <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
            통계를 불러오지 못했어요. 잠시 후 새로고침해주세요.
          </Text>
        </GlassPanel>
      ) : rows.length === 0 ? (
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle" className="mt-6">
          아직 전송한 페이지가 없어요. 발행된 URL 화면에서 전송일을 기록하면 여기에 나타나요.
        </Text>
      ) : (
        <GlassPanel className="mt-6">
          <StatsTable rows={rows} />
        </GlassPanel>
      )}
    </div>
  );
}
