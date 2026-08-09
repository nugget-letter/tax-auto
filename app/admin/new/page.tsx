import { generateSlug } from "@/lib/pages/slug";
import PageEditorForm from "@/components/editor/PageEditorForm";

export default function NewPagePage() {
  return <PageEditorForm mode="create" initialSlug={generateSlug()} />;
}
