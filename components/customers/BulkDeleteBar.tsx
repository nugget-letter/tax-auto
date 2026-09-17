"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

type Props = { ids: string[]; onCleared: () => void };

export default function BulkDeleteBar({ ids, onCleared }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (loading) return;
    if (!window.confirm(`선택한 고객 ${ids.length}명을 삭제할까요? 되돌릴 수 없어요.`)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customers/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }
      onCleared();
      router.refresh();
    } catch {
      setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-xl">
      <Text as="span" textStyle="t4Medium" color="fg.neutral">
        {ids.length}명 선택됨
      </Text>
      <div className="flex items-center gap-2">
        {error && (
          <Text as="span" textStyle="t4Regular" color="fg.critical">
            {error}
          </Text>
        )}
        <ActionButton
          type="button"
          variant="ghost"
          size="small"
          onClick={onCleared}
          disabled={loading}
          className="btn-quiet focus-flame"
        >
          선택 해제
        </ActionButton>
        <ActionButton
          type="button"
          variant="criticalSolid"
          size="small"
          onClick={handleDelete}
          loading={loading}
          disabled={loading}
          className="btn-danger focus-flame"
        >
          선택 삭제
        </ActionButton>
      </div>
    </div>
  );
}
