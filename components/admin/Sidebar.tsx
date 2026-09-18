"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/customers", label: "고객 신청" },
  { href: "/admin/published", label: "발행된 URL" },
  { href: "/admin/new", label: "새 페이지" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between bg-navy-950">
      <div>
        <div className="px-5 py-6">
          <span className="flame-text text-xl font-extrabold italic font-display">nugget.</span>
        </div>
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            // /admin/customers/… 하위 화면에서도 메뉴가 켜지게 한다. /admin은
            // 모든 경로의 접두어라 정확히 일치할 때만 활성으로 본다.
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-ink-sidebar hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="flame-bar absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <form action="/api/logout" method="POST" className="p-3">
        <ActionButton type="submit" variant="ghost" size="small" color="fg.neutralInverted">
          로그아웃
        </ActionButton>
      </form>
    </aside>
  );
}
