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
    <div className="mx-auto max-w-[1160px] space-y-8 p-8">
      <Calendar events={events} month={month} today={today} />

      <div>
        <h1 className="font-display mb-5 text-2xl font-extrabold text-[#111827]">
          랜딩페이지 목록
        </h1>
        <PagesTable pages={pages} />
      </div>
    </div>
  );
}
