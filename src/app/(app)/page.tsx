import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/auth-helpers";

export default async function HomePage() {
  const { user } = await requirePageUser();
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm" lang="ta">
          வணக்கம்
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Hi, ${firstName}` : "Welcome"}
        </h1>
      </div>
      <div className="border-border rounded-2xl border border-dashed p-8 text-center">
        <p className="font-medium">Your dashboard is on its way</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Expenses, budgets and goals will show up here as they’re built.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/settings">
            Review settings
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
