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
