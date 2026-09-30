"use client";

import { useId, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatINR, parseAmount, type Paise } from "@/lib/money";

export interface AmountInputProps {
  /** Current value in paise, or null/undefined for empty. */
  value?: Paise | null;
  onChangePaise: (paise: Paise | null) => void;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
}

/** ₹-prefixed amount field. Accepts plain numbers and shorthand ("1.2k", "2 lakh") via `parseAmount`. */
export function AmountInput({
  value,
  onChangePaise,
  placeholder = "0.00",
  disabled,
  id,
  ...props
}: AmountInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [focused, setFocused] = useState(false);
  // Raw text while the user is typing; formatted display once they blur.
  const [raw, setRaw] = useState<string>(() => (value != null ? String(value / 100) : ""));

  const display = focused ? raw : value != null ? formatDisplay(value) : "";

  function formatDisplay(paise: Paise): string {
    return formatINR(paise, { showPaise: paise % 100 !== 0 }).replace(/^₹\s?/, "");
  }

  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText aria-hidden>₹</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={inputId}
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        value={display}
        aria-label={props["aria-label"] ?? "Amount"}
        onFocus={() => {
          setFocused(true);
          setRaw(value != null ? String(value / 100) : "");
        }}
        onChange={(event) => {
          const next = event.target.value;
          setRaw(next);
          if (next.trim() === "") {
            onChangePaise(null);
            return;
          }
          onChangePaise(parseAmount(next));
        }}
        onBlur={() => setFocused(false)}
      />
    </InputGroup>
  );
}
