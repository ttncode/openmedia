import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShortcutsHud } from "./ShortcutsHud";

function pasteKeys(): string[] {
  const row = screen.getByText("Paste and get info").parentElement;
  return [...(row?.querySelectorAll("kbd") ?? [])].map(
    (key) => key.textContent ?? "",
  );
}

describe("ShortcutsHud", () => {
  it("shows the Command key on Apple platforms", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    render(<ShortcutsHud open onClose={vi.fn()} />);
    expect(pasteKeys()).toEqual(["⌘", "V"]);
  });

  it("shows Ctrl on other platforms", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
    render(<ShortcutsHud open onClose={vi.fn()} />);
    expect(pasteKeys()).toEqual(["Ctrl", "V"]);
  });
});
