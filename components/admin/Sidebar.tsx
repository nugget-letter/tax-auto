"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/published", label: "발행된 URL" },
  { href: "/admin/new", label: "새 페이지" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between bg-navy-950">
      <div>
        <div className="px-5 py-6">
          <span className="bg-gradient-to-r from-brand-orange to-brand-red bg-clip-text text-xl font-extrabold italic text-transparent">
            nugget.
          </span>
        </div>
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
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
