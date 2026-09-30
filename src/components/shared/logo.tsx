import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "lg";
  className?: string;
}

/** Wordmark: "Kaasu" with the Tamil "காசு" beneath (or beside, when small). */
export function Logo({ size = "sm", className }: LogoProps) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", large && "flex-col gap-4", className)}>
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
          large ? "size-14" : "size-8 rounded-xl",
        )}
      >
        <Coins className={large ? "size-7" : "size-4"} />
      </span>
      <span
        className={cn("flex items-baseline gap-2 leading-none", large && "flex-col items-center")}
      >
        <span className={cn("font-semibold tracking-tight", large ? "text-3xl" : "text-base")}>
          Kaasu
        </span>
        <span lang="ta" className={cn("text-muted-foreground", large ? "text-base" : "text-sm")}>
          காசு
        </span>
      </span>
    </div>
  );
}
