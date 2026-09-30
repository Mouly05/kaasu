"use client";

import { useRouter } from "next/navigation";
import { CalendarRange, Sparkles as AdvisorIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { NAV_ITEMS } from "./nav-items";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: () => void;
}

export function CommandPalette({ open, onOpenChange, onAddExpense }: CommandPaletteProps) {
  const router = useRouter();
  const tNav = useTranslations("shell.nav");
  const t = useTranslations("commandPalette");

  function runAndClose(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("trigger")}
      description={t("placeholder")}
    >
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("empty")}</CommandEmpty>
        <CommandGroup heading={t("groupActions")}>
          <CommandItem onSelect={() => runAndClose(onAddExpense)}>
            {t("actions.addExpense")}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAndClose(() => toast.info(t("comingSoon"), { description: t("actions.planMonth") }))
            }
          >
            <CalendarRange />
            {t("actions.planMonth")}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAndClose(() => toast.info(t("comingSoon"), { description: t("actions.askAdvisor") }))
            }
          >
            <AdvisorIcon />
            {t("actions.askAdvisor")}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("groupNavigate")}>
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.href} onSelect={() => runAndClose(() => router.push(item.href))}>
              <item.icon />
              {tNav(item.key)}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
