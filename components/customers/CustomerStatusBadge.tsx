import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from "@/lib/customers/types";
import type { Tone } from "@/lib/ui/tones";
import Chip from "@/components/ui/Chip";

const TONES: Record<CustomerStatus, Tone> = {
  new: "indigo",
  trial: "blue",
  converted: "green",
  churned: "gray",
};

export default function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return <Chip tone={TONES[status]}>{CUSTOMER_STATUS_LABELS[status]}</Chip>;
}
