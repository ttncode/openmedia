import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StoreProvider } from "@/state/StoreProvider";
import { Toolbar } from "./Toolbar";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function mockSystemScheme(): (dark: boolean) => void {
  let dark = false;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return query === DARK_QUERY && dark;
        },
        media: query,
        addEventListener: (_type: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) =>
          listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  return (next) => {
    dark = next;
    listeners.forEach((listener) => listener());
  };
}

describe("Toolbar", () => {
  it("follows the system scheme when it changes while the page is open", async () => {
    const setSystemDark = mockSystemScheme();
    render(
      <StoreProvider>
        <Toolbar
          scrolled={false}
          title="Queue"
          sidebarOpen={false}
          onToggleSidebar={vi.fn()}
          onOpenShortcuts={vi.fn()}
        />
      </StoreProvider>,
    );
    const toggle = screen.getByRole("button", { name: "Switch light or dark" });
    const lightIcon = toggle.innerHTML;
    act(() => setSystemDark(true));
    expect(toggle.innerHTML).not.toBe(lightIcon);
    await userEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
