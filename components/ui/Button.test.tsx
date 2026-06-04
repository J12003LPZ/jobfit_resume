import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children and applies the variant class", () => {
    render(<Button variant="primary">Analyze Job</Button>);
    const btn = screen.getByRole("button", { name: "Analyze Job" });
    expect(btn).toBeInTheDocument();
  });
  it("is disabled when disabled prop set", () => {
    render(<Button disabled>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
  });
});
