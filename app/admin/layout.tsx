import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-seed=""
      data-seed-color-mode="light-only"
      className="font-admin flex min-h-screen"
    >
      <Sidebar />
      <main className="admin-canvas flex-1">{children}</main>
    </div>
  );
}
