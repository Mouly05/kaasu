import { formatINR, type Paise } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface MoneyTextProps {
  paise: Paise;
  /** Indian compact notation: ₹1.2K, ₹3.4L, ₹5.6Cr. */
  compact?: boolean;
  /** Force (true) or hide (false) paise. Defaults to `formatINR`'s own rule (show only if non-zero). */
  showPaise?: boolean;
  /** Emerald when positive, rose when negative, neutral when zero. Defaults to on. */
  colorBySign?: boolean;
  className?: string;
}

/** Renders paise as `formatINR`, with tabular-nums and optional sign colouring. Never reimplements formatting. */
export function MoneyText({
  paise,
  compact,
  showPaise,
  colorBySign = true,
  className,
}: MoneyTextProps) {
  const sign = Math.sign(paise);
  return (
    <span
      data-sign={sign}
      className={cn(
        "tabular-nums",
        colorBySign && sign > 0 && "text-positive",
        colorBySign && sign < 0 && "text-negative",
        className,
      )}
    >
      {formatINR(paise, { compact, showPaise })}
    </span>
  );
}
