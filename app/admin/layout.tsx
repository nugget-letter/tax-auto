import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-seed="" data-seed-color-mode="light-only" className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
