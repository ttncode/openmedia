import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Capsule } from "./Capsule";

describe("Capsule", () => {
  it("does not emit an undefined class for the default gray variant", () => {
    render(<Capsule>Paste</Capsule>);
    const button = screen.getByRole("button", { name: "Paste" });
    expect(button.className).not.toMatch(/undefined/);
  });
});
