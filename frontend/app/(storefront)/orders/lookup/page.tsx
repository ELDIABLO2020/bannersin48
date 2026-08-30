import { redirect } from "next/navigation";

/** Tracking is available only through the authenticated account order history. */
export default function RetiredGuestLookupPage() {
  redirect("/orders");
}
