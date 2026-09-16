"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { initialQuery: string; status: string | null };

export default function CustomerSearch({ initialQuery, status }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

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
        className="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm"
      />
      <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
        검색
      </button>
    </form>
  );
}
