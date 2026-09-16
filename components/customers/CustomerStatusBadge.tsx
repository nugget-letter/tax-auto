import { Badge } from "@seed-design/react";
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from "@/lib/customers/types";

const TONES: Record<CustomerStatus, "informative" | "warning" | "positive" | "neutral"> = {
  new: "informative",
  trial: "warning",
  converted: "positive",
  churned: "neutral",
};

export default function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge tone={TONES[status]} variant="weak">
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}
