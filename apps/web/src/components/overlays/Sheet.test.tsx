import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

HTMLElement.prototype.setPointerCapture = function setPointerCapture(): void {};
HTMLElement.prototype.hasPointerCapture =
  function hasPointerCapture(): boolean {
    return true;
  };

function mockMatchesPhone(matches: boolean): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

function dragHandle(
  handle: HTMLElement,
  distance: number,
  elapsedMs: number,
): void {
  const now = vi.spyOn(performance, "now");
  now.mockReturnValueOnce(0).mockReturnValueOnce(elapsedMs);
  fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(handle, { clientY: distance, pointerId: 1 });
  fireEvent.pointerUp(handle, { clientY: distance, pointerId: 1 });
}

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

  describe("on phone", () => {
    beforeEach(() => {
      mockMatchesPhone(true);
    });

    it("closes when the handle is dragged past the dismiss distance", () => {
      const onClose = vi.fn();
      render(
        <Sheet open onClose={onClose} title="Settings" labelledById="s">
          <p>Body</p>
        </Sheet>,
      );
      const handle = screen.getByRole("heading", { name: "Settings" })
        .parentElement!.parentElement!;
      dragHandle(handle, 200, 500);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("leaves the pointer with the Done button so its click lands", () => {
      const onClose = vi.fn();
      const capture = vi.spyOn(HTMLElement.prototype, "setPointerCapture");
      render(
        <Sheet open onClose={onClose} title="Settings" labelledById="s">
          <p>Body</p>
        </Sheet>,
      );
      const done = screen.getByRole("button", { name: "Done" });
      fireEvent.pointerDown(done, { clientY: 0, pointerId: 1 });
      expect(capture).not.toHaveBeenCalled();
      fireEvent.click(done);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close on a short drag", () => {
      const onClose = vi.fn();
      render(
        <Sheet open onClose={onClose} title="Settings" labelledById="s">
          <p>Body</p>
        </Sheet>,
      );
      const handle = screen.getByRole("heading", { name: "Settings" })
        .parentElement!.parentElement!;
      dragHandle(handle, 20, 500);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
