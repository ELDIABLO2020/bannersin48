import { redirect } from "next/navigation";

/**
 * V1 confirms the actual uploaded file and configuration before submission.
 * The retired post-order proof action must never render a synthetic preview.
 */
export default function RetiredProofPage({ params }: { params: { id: string } }) {
  redirect(`/orders/${encodeURIComponent(params.id)}`);
}
