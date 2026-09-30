"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Plus, Receipt, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { NAV_ITEMS } from "./nav-items";
import { useShell } from "./shell-shortcuts";

const PRIMARY_HREFS = ["/", "/expenses", "/budget"];

function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-xs",
        "focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

/** Mobile-only (md:hidden) bottom nav: Home, Expenses, a centered floating "+", Budget, and an overflow "More" sheet. */
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("shell.bottomNav");
  const tNav = useTranslations("shell.nav");
  const { openQuickAdd } = useShell();
  const overflowItems = NAV_ITEMS.filter((item) => !PRIMARY_HREFS.includes(item.href));

  return (
    <nav
      className="border-border/60 bg-background/95 fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] backdrop-blur md:hidden"
      aria-label={t("more")}
    >
      <NavLink href="/" icon={Wallet} label={t("home")} active={isActiveHref(pathname, "/")} />
      <NavLink
        href="/expenses"
        icon={Receipt}
        label={t("expenses")}
        active={isActiveHref(pathname, "/expenses")}
      />
      <button
        type="button"
        onClick={openQuickAdd}
        aria-label={t("addExpense")}
        className="bg-primary text-primary-foreground focus-visible:ring-ring/50 -mt-6 flex size-14 shrink-0 items-center justify-center rounded-full shadow-lg focus-visible:ring-3 focus-visible:outline-none"
      >
        <Plus className="size-6" />
      </button>
      <NavLink
        href="/budget"
        icon={Wallet}
        label={t("budget")}
        active={isActiveHref(pathname, "/budget")}
      />
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={t("more")}
            className={cn(
              "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-xs",
              "focus-visible:ring-ring/50 text-muted-foreground focus-visible:ring-3 focus-visible:outline-none",
            )}
          >
            <MoreHorizontal className="size-5" aria-hidden />
            <span>{t("more")}</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t("more")}</SheetTitle>
            <SheetDescription className="sr-only">{t("more")}</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 p-4 pt-0">
            {overflowItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "border-border/60 flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs",
                  "focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                  isActiveHref(pathname, item.href) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                <span>{tNav(item.key)}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
