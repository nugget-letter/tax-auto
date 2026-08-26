import Link from "next/link";
import type { PageRecord, PageStatus } from "@/lib/pages/types";
import { formatDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import CopyLinkButton from "./CopyLinkButton";
import DuplicateButton from "./DuplicateButton";
import StatusActionButton from "./StatusActionButton";
import DeleteButton from "./DeleteButton";

const GROUPS: { status: PageStatus; heading: string }[] = [
  { status: "published", heading: "발행됨" },
  { status: "draft", heading: "임시저장" },
  { status: "archived", heading: "보관" },
];

function PageRow({ page }: { page: PageRecord }) {
  return (
    <li className="flex items-center justify-between gap-4 p-4">
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
        <DuplicateButton id={page.id} />
        <StatusActionButton id={page.id} status={page.status} />
        <DeleteButton id={page.id} title={page.title} />
      </div>
    </li>
  );
}

export default function PagesTable({ pages }: { pages: PageRecord[] }) {
  if (pages.length === 0) {
    return <p className="text-sm text-gray-500">아직 생성된 페이지가 없어요.</p>;
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(({ status, heading }) => {
        const groupPages = pages.filter((page) => page.status === status);
        if (groupPages.length === 0) return null;

        return (
          <section key={status}>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-gray-400">
              {heading} ({groupPages.length})
            </h2>
            <ul className="divide-y divide-gray-100 rounded border border-gray-200">
              {groupPages.map((page) => (
                <PageRow key={page.id} page={page} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
