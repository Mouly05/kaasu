import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  /** 0–100. Values outside this range are clamped. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  tone?: "positive" | "warning" | "negative" | "neutral";
  label?: string;
  className?: string;
}

const TONE_CLASS: Record<NonNullable<ProgressRingProps["tone"]>, string> = {
  positive: "text-positive",
  warning: "text-warning",
  negative: "text-negative",
  neutral: "text-foreground",
};

/** Pure-SVG progress ring — no chart library needed for a single value. */
export function ProgressRing({
  percent,
  size = 64,
  strokeWidth = 6,
  tone = "neutral",
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "fill-none motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500",
            TONE_CLASS[tone],
          )}
          stroke="currentColor"
        />
      </svg>
      <span className="absolute text-sm font-medium tabular-nums">{Math.round(clamped)}%</span>
    </div>
  );
}
