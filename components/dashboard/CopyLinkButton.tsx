"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";

export default function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/c/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ActionButton type="button" variant="ghost" size="small" onClick={handleCopy}>
      {copied ? "복사됨!" : "URL 복사"}
    </ActionButton>
  );
}
