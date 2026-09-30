import { redirect } from "next/navigation";

import { requirePageUser } from "@/lib/auth-helpers";
import { monthKey } from "@/lib/dates";

/** `/budget` always redirects to the current IST month's planner. */
export default async function BudgetPage() {
  await requirePageUser();
  redirect(`/budget/${monthKey()}`);
}
