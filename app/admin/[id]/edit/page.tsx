import { notFound } from "next/navigation";
import { getPageById } from "@/lib/pages/repository";
import PageEditorForm from "@/components/editor/PageEditorForm";

export const dynamic = "force-dynamic";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();

  return <PageEditorForm mode="edit" initialSlug={page.slug} initialPage={page} />;
}
