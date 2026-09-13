import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

describe("Sheet", () => {
  it("renders a labelled dialog, moves focus inside and closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Sheet
        open
        onClose={onClose}
        title="Settings"
        labelledById="settings-title"
      >
        <button type="button">Inside</button>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <Sheet open={false} onClose={vi.fn()} title="Settings" labelledById="s">
        <p>Hidden</p>
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
