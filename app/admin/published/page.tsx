import { headers } from "next/headers";
import { listPages } from "@/lib/pages/repository";
import { formatDate } from "@/lib/format";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import StatusBadge from "@/components/dashboard/StatusBadge";

export const dynamic = "force-dynamic";

async function getOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function PublishedUrlsPage() {
  const [pages, origin] = await Promise.all([listPages(), getOrigin()]);
  // 지금 발행 상태인 것만이 아니라, 한 번이라도 발행된 적 있는 페이지를 전부
  // 모아 보여준다 — 나중에 보관 처리했어도 "언제 이걸 보냈었지" 확인할 기록으로 남긴다.
  const everPublished = pages
    .filter((page) => page.publishedAt !== null)
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold text-gray-900">발행된 URL</h1>
      <p className="mt-1 text-sm text-gray-500">
        한 번이라도 발행했던 페이지의 기록이에요. 지금도 발행 중인 링크만 카카오톡 버튼에
        연결하세요 — 보관된 페이지는 방문자에게 &ldquo;아직 공개되지 않은 페이지&rdquo;로 보여요.
      </p>

      {everPublished.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">아직 발행된 페이지가 없어요.</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded border border-gray-200">
          {everPublished.map((page) => (
            <li key={page.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={page.status} />
                  <p className="text-sm font-medium text-gray-900">{page.title}</p>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  발행일 {formatDate(page.publishedAt!)}
                </p>
                <input
                  type="text"
                  readOnly
                  value={`${origin}/c/${page.slug}`}
                  className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
                />
              </div>
              <CopyLinkButton slug={page.slug} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
