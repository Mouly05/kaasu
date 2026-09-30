"use client";

import { useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHydrated } from "@/hooks/use-hydrated";
import { THEMES } from "@/lib/db/enums";

import { updateTheme } from "../actions";

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const THEME_LABELS = { light: "Light", dark: "Dark", system: "System" } as const;

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();
  // Avoids an uncontrolled → controlled Select warning: `theme` is undefined
  // until next-themes reads localStorage on mount.
  const mounted = useHydrated();

  function onChange(next: string) {
    setTheme(next);
    startTransition(async () => {
      const result = await updateTheme({ theme: next });
      if (!result.ok) {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Select value={mounted ? (theme ?? "system") : "system"} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="w-40" aria-label="Theme">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {THEMES.map((value) => {
          const Icon = THEME_ICONS[value];
          return (
            <SelectItem key={value} value={value}>
              <Icon className="size-4" aria-hidden />
              {THEME_LABELS[value]}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
