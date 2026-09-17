import { listPages } from "@/lib/pages/repository";
import { listCustomers } from "@/lib/customers/repository";
import { todayInSeoul } from "@/lib/customers/trial";
import { parseMonth, toCalendarEvents } from "@/lib/calendar/events";
import PagesTable from "@/components/dashboard/PagesTable";
import Calendar from "@/components/dashboard/Calendar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { month: rawMonth } = await searchParams;
  const [pages, customers] = await Promise.all([listPages(), listCustomers()]);

  const today = todayInSeoul();
  const month = parseMonth(rawMonth, today);
  const events = toCalendarEvents(pages, customers);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Calendar events={events} month={month} today={today} />

      <div>
        <h1 className="mb-6 text-xl font-bold text-gray-900">랜딩페이지 목록</h1>
        <PagesTable pages={pages} />
      </div>
    </div>
  );
}
