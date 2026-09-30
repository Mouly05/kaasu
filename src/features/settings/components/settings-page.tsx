import Image from "next/image";
import { Database, Download, Palette, Plug, Upload, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { GitHubIcon } from "@/components/shared/github-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import type { Locale } from "@/lib/locales";

import type { SettingsProfile } from "../queries";
import { LanguageSelect } from "./language-select";
import { SettingsRow, SettingsSection } from "./settings-section";
import { SignOutButton } from "./sign-out-button";
import { ThemeSelect } from "./theme-select";

interface SettingsPageProps {
  profile: SettingsProfile;
}

const CONNECTIONS = [
  { name: "INDmoney / INDstocks", hint: "Read-only portfolio sync", module: "Investments" },
  { name: "Telegram", hint: "Log expenses and get nudges by chat", module: "Assistant" },
];

export async function SettingsPage({ profile }: SettingsPageProps) {
  const t = await getTranslations("settings");
  const initials = (profile.name ?? profile.email).slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Your profile, preferences and data.</p>
      </header>

      <SettingsSection
        id="profile"
        icon={UserRound}
        title="Profile"
        description="Synced from your GitHub account each time you sign in."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {profile.image ? (
              <Image
                src={profile.image}
                alt=""
                width={48}
                height={48}
                className="ring-border size-12 rounded-full ring-1"
              />
            ) : (
              <span
                aria-hidden
                className="bg-muted grid size-12 place-items-center rounded-full font-medium"
              >
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{profile.name ?? "Unnamed"}</p>
              <p className="text-muted-foreground truncate text-sm">{profile.email}</p>
              {profile.createdAt && (
                <p className="text-muted-foreground text-xs">
                  Member since {formatDay(profile.createdAt, "long")}
                </p>
              )}
            </div>
          </div>
          <SignOutButton />
        </div>
      </SettingsSection>

      <SettingsSection
        id="preferences"
        icon={Palette}
        title="Preferences"
        description="How Kaasu looks and speaks to you."
      >
        <SettingsRow label={t("language.label")} hint={t("language.hint")}>
          <LanguageSelect initial={profile.locale as Locale} />
        </SettingsRow>
        <SettingsRow label={t("theme.label")} hint={t("theme.hint")}>
          <ThemeSelect />
        </SettingsRow>
        <SettingsRow label="Currency and time zone" hint="Amounts and months follow these.">
          <span className="text-muted-foreground text-sm tabular-nums">
            {profile.currency} · {profile.timezone}
          </span>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        id="connections"
        icon={Plug}
        title="Connections"
        description="Accounts Kaasu can read from. Tokens are stored encrypted."
      >
        <SettingsRow label="GitHub" hint="Used to sign in">
          <Badge variant="outline" className="gap-1.5">
            <GitHubIcon className="size-3" />
            Connected
          </Badge>
        </SettingsRow>
        {CONNECTIONS.map((connection) => (
          <SettingsRow key={connection.name} label={connection.name} hint={connection.hint}>
            <Badge variant="secondary">Coming soon</Badge>
          </SettingsRow>
        ))}
      </SettingsSection>

      <SettingsSection
        id="data"
        icon={Database}
        title="Data"
        description="Your data is yours. Take it with you any time."
      >
        <SettingsRow label="Export" hint="Download everything as JSON or CSV.">
          <Button variant="outline" disabled>
            <Download />
            Export
          </Button>
        </SettingsRow>
        <SettingsRow label="Import" hint="Restore from a Kaasu export.">
          <Button variant="outline" disabled>
            <Upload />
            Import
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
