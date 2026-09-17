"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

type Props = { id: string; name: string };

export default function DeleteCustomerButton({ id, name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(`"${name}" 고객을 삭제할까요? 되돌릴 수 없어요.`)) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${id}`, { method: "DELETE" });

      if (!response.ok) {
        setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

      router.push("/admin/customers");
      router.refresh();
    } catch {
      setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <ActionButton
        type="button"
        variant="ghost"
        size="xsmall"
        color="fg.critical"
        onClick={handleClick}
        loading={loading}
        disabled={loading}
        className="btn-danger focus-flame"
      >
        삭제
      </ActionButton>
      {error && (
        <Text as="p" textStyle="t2Regular" color="fg.critical" className="mt-1 text-right">
          {error}
        </Text>
      )}
    </div>
  );
}
