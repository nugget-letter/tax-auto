import Link from "next/link";
import { listPages } from "@/lib/pages/repository";
import PagesTable from "@/components/dashboard/PagesTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const pages = await listPages();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">랜딩페이지 목록</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            새 페이지 만들기
          </Link>
          <form action="/api/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:underline">
              로그아웃
            </button>
          </form>
        </div>
      </div>
      <PagesTable pages={pages} />
    </main>
  );
}
