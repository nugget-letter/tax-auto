"use client";

import type { FormBlock } from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: FormBlock;
  onChange: (block: FormBlock) => void;
};

const inputClass = "w-full rounded border border-gray-300 px-2 py-1 text-sm";

export default function FormBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">신청 폼</p>
      <p className="text-xs text-gray-400">
        방문자가 이름·사무실·연락처·이메일을 남기면 어드민 &ldquo;고객 신청&rdquo;에 쌓여요.
      </p>
      <input
        type="text"
        placeholder="폼 제목 (예: 한 달 무료로 써보기) — 비워도 돼요"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="버튼 문구"
        value={block.buttonLabel}
        onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })}
        className={inputClass}
      />
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">버튼 색상</label>
        <input
          type="color"
          value={block.buttonColor}
          onChange={(e) => onChange({ ...block, buttonColor: e.target.value })}
          className="h-8 w-12"
        />
      </div>
      <input
        type="text"
        placeholder="동의 문구"
        value={block.consentText}
        onChange={(e) => onChange({ ...block, consentText: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="제출 완료 메시지"
        value={block.successMessage}
        onChange={(e) => onChange({ ...block, successMessage: e.target.value })}
        className={inputClass}
      />
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
