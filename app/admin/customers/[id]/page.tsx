import { notFound } from "next/navigation";
import { getCustomerById } from "@/lib/customers/repository";
import { getPageById } from "@/lib/pages/repository";
import CustomerForm from "@/components/customers/CustomerForm";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const page = customer.sourcePageId ? await getPageById(customer.sourcePageId) : null;
  const sourcePage = page ? { id: page.id, title: page.title } : null;

  return <CustomerForm mode="edit" initial={customer} sourcePage={sourcePage} />;
}
