"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PageStatus } from "@/lib/pages/types";

type Props = { id: string; status: PageStatus };

const NEXT_ACTION: Record<PageStatus, { label: string; status: PageStatus }> = {
  draft: { label: "발행하기", status: "published" },
  published: { label: "보관하기", status: "archived" },
  archived: { label: "임시저장으로 복원", status: "draft" },
};

export default function StatusActionButton({ id, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = NEXT_ACTION[status];

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/pages/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next.status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
    >
      {loading ? "처리 중..." : next.label}
    </button>
  );
}
