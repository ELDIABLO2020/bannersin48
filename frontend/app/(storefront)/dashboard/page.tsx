import { redirect } from "next/navigation";

/** The account area moved to `/account` (plan §4.3); old links and bookmarks keep working. */
export default function DashboardPage() {
  redirect("/account");
}
