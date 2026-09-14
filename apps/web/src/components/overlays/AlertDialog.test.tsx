import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlertDialog } from "./AlertDialog";

describe("AlertDialog", () => {
  it("closes on Escape while open", async () => {
    const onCancel = vi.fn();
    render(
      <AlertDialog
        open
        title="Clear history?"
        message="This cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        destructive
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByRole("alertdialog", { name: "Clear history?" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
