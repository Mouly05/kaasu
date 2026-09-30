import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AmountInput } from "./amount-input";

describe("AmountInput", () => {
  it("shows a ₹ prefix outside the editable value", () => {
    render(<AmountInput value={null} onChangePaise={() => {}} />);
    expect(screen.getByText("₹")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("displays an initial paise value with Indian digit grouping (round-trip)", () => {
    render(<AmountInput value={123456} onChangePaise={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("1,234.56");
  });

  it("resolves a plain number to paise as the user types", () => {
    const onChangePaise = vi.fn();
    render(<AmountInput value={null} onChangePaise={onChangePaise} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "500" } });
    expect(onChangePaise).toHaveBeenLastCalledWith(50000);
  });

  it("resolves Indian shorthand ('1.2k') to paise", () => {
    const onChangePaise = vi.fn();
    render(<AmountInput value={null} onChangePaise={onChangePaise} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "1.2k" } });
    expect(onChangePaise).toHaveBeenLastCalledWith(120000);
  });

  it("calls onChangePaise(null) for unparseable input instead of throwing", () => {
    const onChangePaise = vi.fn();
    render(<AmountInput value={null} onChangePaise={onChangePaise} />);
    expect(() =>
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "abc" } }),
    ).not.toThrow();
    expect(onChangePaise).toHaveBeenLastCalledWith(null);
  });

  it("clears to null when the field is emptied", () => {
    const onChangePaise = vi.fn();
    render(<AmountInput value={500} onChangePaise={onChangePaise} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChangePaise).toHaveBeenLastCalledWith(null);
  });
});
