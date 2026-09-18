"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { initialQuery: string; status: string | null };

export default function CustomerSearch({ initialQuery, status }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  // 뒤로가기 등 소프트 내비게이션에서는 컴포넌트가 그대로 마운트된 채 prop만
  // 바뀌므로, 렌더 중에 이전 prop 값과 비교해 입력창을 URL의 실제 ?q=와 다시 맞춘다.
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setValue(initialQuery);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (value.trim()) params.set("q", value.trim());
    const query = params.toString();
    router.push(query ? `/admin/customers?${query}` : "/admin/customers");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="이름 / 사무실 / 연락처 / 이메일"
        className="glass-field focus-flame w-64 px-3 py-2 text-sm text-[#111827]"
      />
      <button type="submit" className="btn-quiet focus-flame px-3 py-1.5 text-sm">
        검색
      </button>
    </form>
  );
}
