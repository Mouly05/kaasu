import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-border/60 bg-card rounded-2xl border p-5 sm:p-6"
    >
      <header className="mb-5 flex items-start gap-3">
        <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-xl">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <h2 id={`${id}-title`} className="font-medium">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border/60 flex flex-col gap-3 border-t py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
