import { listPages } from "@/lib/pages/repository";
import PagesTable from "@/components/dashboard/PagesTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const pages = await listPages();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">랜딩페이지 목록</h1>
      <PagesTable pages={pages} />
    </div>
  );
}
