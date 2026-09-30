import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/auth-helpers";

export default async function HomePage() {
  const { user } = await requirePageUser();
  const t = await getTranslations("shell.home");
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">{t("greeting")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? t("hiName", { name: firstName }) : t("welcome")}
        </h1>
      </div>
      <div className="border-border rounded-2xl border border-dashed p-8 text-center">
        <p className="font-medium">{t("dashboardComingTitle")}</p>
        <p className="text-muted-foreground mt-1 text-sm">{t("dashboardComingBody")}</p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/settings">
            {t("reviewSettings")}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
