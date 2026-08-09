import DOMPurify from "isomorphic-dompurify";
import type { PageInput } from "./pages/types";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "span", "mark"];
const ALLOWED_ATTR = ["style"];

export function sanitizeBodyHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

export function sanitizePageInputHtml(input: PageInput): PageInput {
  return {
    ...input,
    blocks: input.blocks.map((block) =>
      block.type === "text" ? { ...block, bodyHtml: sanitizeBodyHtml(block.bodyHtml) } : block
    ),
  };
}
