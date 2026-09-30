"use client";

import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay, todayIST } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface DatePickerISTProps {
  value?: Date;
  onChange: (date: Date) => void;
  "aria-label"?: string;
  className?: string;
}

/** A date button + popover calendar; dates are always shown/compared in IST via `src/lib/dates.ts`. */
export function DatePickerIST({ value, onChange, className, ...props }: DatePickerISTProps) {
  const selected = value ?? todayIST();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start font-normal", className)}
          aria-label={props["aria-label"] ?? "Date"}
        >
          <CalendarIcon className="size-4" />
          {formatDay(selected, "long")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && onChange(date)}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
