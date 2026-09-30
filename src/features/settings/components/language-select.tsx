"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/locales";

import { updatePreferences } from "../actions";

export function LanguageSelect({ initial }: { initial: Locale }) {
  const [value, setValue] = useState<Locale>(initial);
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const previous = value;
    setValue(next as Locale);
    startTransition(async () => {
      const result = await updatePreferences({ locale: next });
      if (result.ok) {
        toast.success("Language saved");
      } else {
        setValue(previous);
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="w-40" aria-label="Language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale} lang={locale}>
            {LOCALE_LABELS[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
