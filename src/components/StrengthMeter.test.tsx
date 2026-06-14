import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StrengthMeter } from "./StrengthMeter";

describe("StrengthMeter", () => {
  it("renders the strength label", () => {
    render(<StrengthMeter label="strong" />);
    expect(screen.getByText(/strength: strong/i)).toBeInTheDocument();
  });
});
