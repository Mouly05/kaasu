import {
  FileText,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  PiggyBank,
  Receipt,
  Repeat,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Key under the `shell.nav` message namespace. */
  key: string;
  icon: LucideIcon;
}

/** The 11 primary destinations, shared by the sidebar, bottom-nav overflow, and the command palette. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/expenses", key: "expenses", icon: Receipt },
  { href: "/budget", key: "budget", icon: PiggyBank },
  { href: "/recurring", key: "recurring", icon: Repeat },
  { href: "/debts", key: "debts", icon: HandCoins },
  { href: "/goals", key: "goals", icon: Target },
  { href: "/statements", key: "statements", icon: FileText },
  { href: "/investments", key: "investments", icon: TrendingUp },
  { href: "/advisor", key: "advisor", icon: Sparkles },
  { href: "/tasks", key: "tasks", icon: ListChecks },
  { href: "/settings", key: "settings", icon: Settings },
];
