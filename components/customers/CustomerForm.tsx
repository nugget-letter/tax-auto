"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type CustomerInput,
  type CustomerRecord,
  type CustomerStatus,
} from "@/lib/customers/types";
import { formatDDay, getTrialDDay, getTrialEndsOn, todayInSeoul } from "@/lib/customers/trial";
import CustomerStatusBadge from "./CustomerStatusBadge";
import DateField from "./DateField";
import DeleteCustomerButton from "./DeleteCustomerButton";

type Props =
  | { mode: "create" }
  | { mode: "edit"; initial: CustomerRecord; sourcePage: { id: string; title: string } | null };

const EMPTY: CustomerInput = {
  name: "",
  office: "",
  phone: "",
  email: "",
  consented: false,
  source: "직접 추가",
  status: "new",
  trialStartedOn: null,
  kakaoAdminSetOn: null,
  reminded1On: null,
  reminded2On: null,
  memo: "",
};

const inputClass = "w-full rounded border border-gray-300 px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-gray-700";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function CustomerForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : null;

  const [form, setForm] = useState<CustomerInput>(
    initial
      ? {
          name: initial.name,
          office: initial.office,
          phone: initial.phone,
          email: initial.email,
          consented: initial.consented,
          source: initial.source,
          status: initial.status,
          trialStartedOn: initial.trialStartedOn,
          kakaoAdminSetOn: initial.kakaoAdminSetOn,
          reminded1On: initial.reminded1On,
          reminded2On: initial.reminded2On,
          memo: initial.memo,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const today = todayInSeoul();
  const endsOn = getTrialEndsOn(form.trialStartedOn);
  const dday = getTrialDDay(form.trialStartedOn, today);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const url = initial ? `/api/customers/${initial.id}` : "/api/customers";
    const method = initial ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("세션이 만료되었어요. 다시 로그인해주세요.");
        } else if (response.status === 400) {
          setError("입력값을 확인해주세요. 이름과 연락처는 필수예요.");
        } else {
          setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      router.push("/admin/customers");
      router.refresh();
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* initial은 서버에서 불러온 원본 스냅샷이라 저장 전에는 갱신되지 않는다.
              제목/뱃지는 옆의 이름 입력·상태 select와 같은 화면을 보고 있다는
              인상을 줘야 하므로 화면에 반영 중인 form 값을 따라가게 한다. */}
          <h1 className="text-xl font-bold text-gray-900">
            {initial ? form.name.trim() || "이름 없음" : "고객 추가"}
          </h1>
          {initial && <CustomerStatusBadge status={form.status} />}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as CustomerStatus)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {CUSTOMER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CUSTOMER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {initial && <DeleteCustomerButton id={initial.id} name={initial.name} />}
        </div>
      </div>

      <section className="space-y-3 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900">기본 정보</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>이름 *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>사무실</label>
            <input
              value={form.office}
              onChange={(e) => set("office", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>연락처 *</label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>이메일</label>
            <input
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>유입경로</label>
            <input
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className={inputClass}
            />
            {props.mode === "edit" && props.sourcePage && (
              <p className="mt-1 text-xs text-gray-500">
                신청 페이지:{" "}
                <Link href={`/admin/${props.sourcePage.id}/edit`} className="underline">
                  {props.sourcePage.title} →
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>개인정보 수집 동의</label>
            {initial ? (
              <p className="py-2 text-sm text-gray-700">{initial.consented ? "동의함" : "동의 안 함"}</p>
            ) : (
              <label className="flex items-center gap-2 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.consented}
                  onChange={(e) => set("consented", e.target.checked)}
                />
                동의 받음
              </label>
            )}
          </div>
        </div>
        {initial && (
          <div>
            <label className={labelClass}>접수시각</label>
            <p className="py-2 text-sm text-gray-700">{formatDateTime(initial.submittedAt)}</p>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900">진행</h2>
        <DateField
          label="한 달 무료 체험 시작일"
          value={form.trialStartedOn}
          onChange={(v) => set("trialStartedOn", v)}
          hint={
            endsOn && dday !== null
              ? `종료 예정 ${endsOn} (${formatDDay(dday)})`
              : "시작일을 넣으면 상태가 '신규'일 때 '체험중'으로 자동 전환돼요."
          }
        />
        <DateField
          label="카카오 어드민 설정일"
          value={form.kakaoAdminSetOn}
          onChange={(v) => set("kakaoAdminSetOn", v)}
        />
        <DateField
          label="1차 리마인드 발송일"
          value={form.reminded1On}
          onChange={(v) => set("reminded1On", v)}
        />
        <DateField
          label="2차 리마인드 발송일"
          value={form.reminded2On}
          onChange={(v) => set("reminded2On", v)}
        />
      </section>

      <section className="space-y-2 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900">메모</h2>
        <textarea
          rows={5}
          value={form.memo}
          onChange={(e) => set("memo", e.target.value)}
          className={inputClass}
        />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Link href="/admin/customers" className="rounded border border-gray-300 px-4 py-2 text-sm">
          취소
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
