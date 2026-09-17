"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import DateField from "@/components/customers/DateField";
import { MAX_SEND_TAGS, normalizeSendTags } from "@/lib/pages/types";

type Props = {
  pageId: string;
  initialSentOn: string | null;
  initialTags: string[];
  /** 이미 다른 페이지에서 쓰인 태그들. 오타로 같은 뜻의 태그가 갈라지는 것을 줄인다. */
  tagSuggestions: string[];
};

export default function SendControls({ pageId, initialSentOn, initialTags, tagSuggestions }: Props) {
  const router = useRouter();
  const [sentOn, setSentOn] = useState(initialSentOn);
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextSentOn: string | null, nextTags: string[]) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/pages/${pageId}/send`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentOn: nextSentOn, sendTags: nextTags }),
      });
      if (!response.ok) {
        setError("저장에 실패했어요. 다시 시도해주세요.");
        return;
      }
      router.refresh();
    } catch {
      setError("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  function changeSentOn(value: string | null) {
    setSentOn(value);
    save(value, tags);
  }

  function addTag() {
    const next = normalizeSendTags([...tags, draft]);
    setDraft("");
    // 빈 값이거나 이미 붙어 있는 태그면 저장할 것이 없다.
    if (next.length === tags.length) return;
    if (next.length > MAX_SEND_TAGS) {
      setError(`태그는 ${MAX_SEND_TAGS}개까지 붙일 수 있어요.`);
      return;
    }
    setTags(next);
    save(sentOn, next);
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    save(sentOn, next);
  }

  return (
    <div className={`mt-2 space-y-2 ${saving ? "opacity-50" : ""}`}>
      <DateField label="전송일" value={sentOn} onChange={changeSentOn} />

      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`${tag} 태그 삭제`}
              className="text-gray-400 hover:text-gray-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          list={`tag-suggestions-${pageId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="+ 태그 입력"
          className="w-28 rounded border border-gray-300 px-2 py-0.5 text-xs"
        />
        <datalist id={`tag-suggestions-${pageId}`}>
          {tagSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>

      {error && (
        <Text as="p" textStyle="t2Regular" color="fg.critical">
          {error}
        </Text>
      )}
    </div>
  );
}
