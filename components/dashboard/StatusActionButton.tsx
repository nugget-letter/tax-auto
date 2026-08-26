"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
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
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_ACTION[status];

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.status }),
      });

      if (!response.ok) {
        setError("상태 변경에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

      router.refresh();
    } catch {
      setError("상태 변경에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <ActionButton
        type="button"
        variant="ghost"
        size="small"
        color="fg.informative"
        onClick={handleClick}
        loading={loading}
        disabled={loading}
      >
        {next.label}
      </ActionButton>
      {error && (
        <Text as="p" textStyle="t10Regular" color="fg.critical" className="mt-1 text-right">
          {error}
        </Text>
      )}
    </div>
  );
}
