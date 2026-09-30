"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSelect } from "@/features/settings/components/language-select";
import { ThemeSelect } from "@/features/settings/components/theme-select";
import { signOutAction } from "@/lib/auth/actions";
import type { Locale } from "@/lib/locales";

export interface UserMenuProps {
  name: string | null;
  email: string;
  image: string | null;
  locale: Locale;
}

export function UserMenu({ name, email, image, locale }: UserMenuProps) {
  const t = useTranslations("shell.userMenu");
  const initials = (name ?? email).slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("open")}
        >
          {image ? (
            <Image src={image} alt="" width={32} height={32} className="rounded-full" />
          ) : (
            <span className="bg-muted grid size-8 place-items-center rounded-full text-sm font-medium">
              {initials}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{name ?? email}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span>{t("theme")}</span>
          <ThemeSelect />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span>{t("language")}</span>
          <LanguageSelect initial={locale} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon />
            {t("settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => void signOutAction()}>
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
