import { headers } from "next/headers";
import { listPages } from "@/lib/pages/repository";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";

export const dynamic = "force-dynamic";

async function getOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function PublishedUrlsPage() {
  const [pages, origin] = await Promise.all([listPages(), getOrigin()]);
  const publishedPages = pages.filter((page) => page.status === "published");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold text-gray-900">발행된 URL</h1>
      <p className="mt-1 text-sm text-gray-500">
        카카오톡 브랜드메시지 버튼에 연결할 링크예요. 복사해서 발송 도구에 붙여넣으세요.
      </p>

      {publishedPages.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">아직 발행된 페이지가 없어요.</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded border border-gray-200">
          {publishedPages.map((page) => (
            <li key={page.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{page.title}</p>
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
