"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SwipeableRowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  tone?: "default" | "destructive";
}

export interface SwipeableRowProps {
  children: ReactNode;
  actions: SwipeableRowAction[];
  className?: string;
}

const ACTION_WIDTH = 72;
const OPEN_THRESHOLD = 40;

/** A row that reveals action buttons on a left swipe. Raw Pointer Events + CSS
 * transitions only — no gesture library. Snaps fully open or fully closed. */
export function SwipeableRow({ children, actions, className }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const maxOffset = actions.length * ACTION_WIDTH;

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    startX.current = event.clientX;
    startOffset.current = offset;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const delta = startX.current - event.clientX;
    setOffset(Math.min(maxOffset, Math.max(0, startOffset.current + delta)));
  }

  function handlePointerUp() {
    setDragging(false);
    setOffset((current) => (current > OPEN_THRESHOLD ? maxOffset : 0));
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-y-0 right-0 flex" aria-hidden={offset === 0}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              action.onClick();
              setOffset(0);
            }}
            style={{ width: ACTION_WIDTH }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium text-white",
              action.tone === "destructive" ? "bg-destructive" : "bg-muted-foreground",
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${-offset}px)` }}
        className={cn(
          "bg-background relative touch-pan-y",
          !dragging && "motion-safe:transition-transform motion-safe:duration-200",
        )}
      >
        {children}
      </div>
    </div>
  );
}
