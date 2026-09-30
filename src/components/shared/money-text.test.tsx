import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatINR } from "@/lib/money";

import { MoneyText } from "./money-text";

describe("MoneyText", () => {
  it("renders positive paise with the positive colour and data-sign", () => {
    render(<MoneyText paise={150000} />);
    const el = screen.getByText(formatINR(150000));
    expect(el).toHaveAttribute("data-sign", "1");
    expect(el.className).toContain("text-positive");
  });

  it("renders negative paise with the negative colour and data-sign", () => {
    render(<MoneyText paise={-45000} />);
    const el = screen.getByText(formatINR(-45000));
    expect(el).toHaveAttribute("data-sign", "-1");
    expect(el.className).toContain("text-negative");
  });

  it("renders zero with no sign colour", () => {
    render(<MoneyText paise={0} />);
    const el = screen.getByText(formatINR(0));
    expect(el).toHaveAttribute("data-sign", "0");
    expect(el.className).not.toContain("text-positive");
    expect(el.className).not.toContain("text-negative");
  });

  it("delegates compact formatting to formatINR", () => {
    render(<MoneyText paise={12345600} compact />);
    expect(screen.getByText(formatINR(12345600, { compact: true }))).toBeInTheDocument();
  });

  it("always applies tabular-nums", () => {
    render(<MoneyText paise={1000} />);
    expect(screen.getByText(formatINR(1000)).className).toContain("tabular-nums");
  });

  it("colorBySign=false renders without sign colouring even for negative amounts", () => {
    render(<MoneyText paise={-1000} colorBySign={false} />);
    const el = screen.getByText(formatINR(-1000));
    expect(el.className).not.toContain("text-negative");
  });
});
