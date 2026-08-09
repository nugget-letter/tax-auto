import { generateSlug } from "@/lib/pages/slug";
import PageEditorForm from "@/components/editor/PageEditorForm";

// 정적 프리렌더링되면 빌드 시점의 슬러그가 고정되어 모든 방문자가 같은 슬러그를
// 받게 되고, 두 번째 저장부터 slug unique 제약에 걸린다.
export const dynamic = "force-dynamic";

export default function NewPagePage() {
  return <PageEditorForm mode="create" initialSlug={generateSlug()} />;
}
