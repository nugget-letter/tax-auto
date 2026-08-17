"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PageRecord } from "@/lib/pages/types";

export default function DuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${id}/duplicate`, { method: "POST" });

      if (!response.ok) {
        setError("복제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

      const record: PageRecord = await response.json();
      router.push(`/admin/${record.id}/edit`);
    } catch {
      setError("복제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-gray-600 hover:underline disabled:opacity-50"
      >
        {loading ? "복제 중..." : "복제"}
      </button>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
