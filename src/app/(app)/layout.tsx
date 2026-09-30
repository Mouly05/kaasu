import { getTranslations } from "next-intl/server";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { CommandPaletteTrigger } from "@/components/shared/command-palette-trigger";
import { ShellShortcuts } from "@/components/shared/shell-shortcuts";
import { UserMenu } from "@/components/shared/user-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { listAccounts, listCategories } from "@/features/settings/queries";
import { requirePageUser } from "@/lib/auth-helpers";
import { getSessionPreferences } from "@/lib/session-preferences";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId, user } = await requirePageUser();
  const [{ locale }, t, categories, accounts] = await Promise.all([
    getSessionPreferences(),
    getTranslations("commandPalette"),
    listCategories(userId, { kind: "expense" }),
    listAccounts(userId),
  ]);

  return (
    <SidebarProvider>
      <ShellShortcuts categories={categories} accounts={accounts}>
        <AppSidebar />
        <SidebarInset>
          <header className="border-border/60 bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
            <SidebarTrigger />
            <CommandPaletteTrigger label={t("trigger")} />
            <div className="ml-auto flex items-center gap-2">
              <UserMenu
                name={user.name ?? null}
                email={user.email ?? ""}
                image={user.image ?? null}
                locale={locale}
              />
            </div>
          </header>
          <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 md:pb-8">{children}</div>
          <BottomNav />
        </SidebarInset>
      </ShellShortcuts>
    </SidebarProvider>
  );
}
