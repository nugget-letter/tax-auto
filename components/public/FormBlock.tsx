"use client";

import { useState } from "react";
import type { FormBlock as FormBlockType } from "@/lib/pages/types";
import { getReadableTextColor } from "@/lib/contrast";

type Props = {
  block: FormBlockType;
  pageSlug: string;
  isPublished: boolean;
  hasBorderAfter: boolean;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none";

export default function FormBlock({ block, pageSlug, isPublished, hasBorderAfter }: Props) {
  const [name, setName] = useState("");
  const [office, setOffice] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug, name, office, phone, email, consented, website }),
      });

      if (!response.ok) {
        setError("제출에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("제출에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const wrapperClass = `mx-auto max-w-xl px-6 py-10 ${hasBorderAfter ? "border-b border-gray-100" : ""}`;

  if (submitted) {
    return (
      <div className={wrapperClass}>
        <div className="rounded-lg bg-gray-50 px-4 py-6 text-center font-medium text-gray-900">
          {block.successMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {block.title && (
        <h2 className="mb-4 font-serif text-lg font-bold text-gray-900">{block.title}</h2>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          required
          placeholder="이름 *"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          name="office"
          placeholder="사무실 이름"
          autoComplete="organization"
          value={office}
          onChange={(e) => setOffice(e.target.value)}
          className={inputClass}
        />
        <input
          type="tel"
          name="phone"
          required
          placeholder="연락처 *"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
          name="email"
          placeholder="이메일"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        {/* honeypot: 사람 눈에는 안 보이고 자동완성도 막는다 */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            required
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5"
          />
          <span>{block.consentText}</span>
        </label>
        <button
          type="submit"
          disabled={!isPublished || submitting}
          className="inline-block w-full rounded-full px-6 py-4 text-base font-bold disabled:opacity-50"
          style={{ backgroundColor: block.buttonColor, color: getReadableTextColor(block.buttonColor) }}
        >
          {submitting ? "제출 중..." : block.buttonLabel}
        </button>
        {!isPublished && (
          <p className="text-center text-xs text-amber-600">미리보기에서는 제출할 수 없어요.</p>
        )}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
