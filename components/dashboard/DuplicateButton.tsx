"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
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
      router.refresh();
      router.push(`/admin/${record.id}/edit`);
    } catch {
      setError("복제에 실패했어요. 다시 로그인해야 할 수 있어요.");
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
        onClick={handleClick}
        loading={loading}
        disabled={loading}
      >
        복제
      </ActionButton>
      {error && (
        <Text as="p" textStyle="t2Regular" color="fg.critical" className="mt-1 text-right">
          {error}
        </Text>
      )}
    </div>
  );
}
