"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";

// 위에서 아래로 읽으면 업무 흐름이 되도록 묶었다.
// 대시보드는 특정 단계가 아니라 전체 현황이라 따로 두고,
// 아래 묶음은 보냈고 → 읽혔고 → 신청이 들어왔다는 순서다.
// 페이지를 만드는 것은 '장소'가 아니라 '행동'이라 이 목록에 넣지 않고 위쪽 버튼으로 뺐다.
const NAV_GROUPS = [
  [{ href: "/admin", label: "대시보드" }],
  [
    { href: "/admin/published", label: "발행된 URL" },
    { href: "/admin/analytics", label: "열람 분석" },
    { href: "/admin/customers", label: "고객 신청" },
  ],
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between bg-navy-950">
      <div>
        <div className="px-5 py-6">
          <span className="flame-text text-xl font-extrabold italic font-display">nugget.</span>
        </div>

        <div className="px-3">
          <Link
            href="/admin/new"
            className="btn-flame focus-flame flex items-center justify-center gap-1 px-4 py-2 text-sm"
          >
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
            새 페이지
          </Link>
        </div>

        <nav className="mt-5 px-3">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div
              key={group[0].href}
              className={
                groupIndex === 0
                  ? "space-y-1"
                  : "mt-3 space-y-1 border-t border-white/10 pt-3"
              }
            >
              {group.map((item) => {
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
            </div>
          ))}
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
