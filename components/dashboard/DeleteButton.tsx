"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";

type Props = { id: string; title: string; slug: string; publishedAt: string | null };

export default function DeleteButton({ id, title, slug, publishedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmMessage =
      publishedAt !== null
        ? `"${title}" 페이지를 삭제할까요? 이미 배포한 /c/${slug} 링크가 동작하지 않게 되고 발행 기록도 사라져요. 되돌릴 수 없어요.`
        : `"${title}" 페이지를 삭제할까요? 되돌릴 수 없어요.`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${id}`, { method: "DELETE" });

      if (!response.ok) {
        setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

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
        size="small"
        color="fg.critical"
        onClick={handleClick}
        loading={loading}
        disabled={loading}
      >
        삭제
      </ActionButton>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
