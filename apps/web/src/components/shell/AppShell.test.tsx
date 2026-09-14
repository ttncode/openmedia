import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TABLET_QUERY } from "@/hooks/useMediaQuery";
import { api } from "@/lib/api/client";
import { StoreProvider } from "@/state/StoreProvider";
import { AppShell } from "./AppShell";

function mockTabletServer(): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === TABLET_QUERY,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.spyOn(api, "session").mockResolvedValue({
    auth_required: false,
    authenticated: true,
    limits: { max_filesize_mb: 1, max_playlist_items: 1 },
  });
  vi.spyOn(api, "settings").mockResolvedValue({
    retention_minutes: 60,
    max_concurrent: 3,
  });
  vi.spyOn(api, "cookies").mockResolvedValue({
    present: false,
    domains: [],
    expires_at: null,
    uploaded_at: null,
  });
  vi.spyOn(api, "storage").mockResolvedValue({
    used_bytes: 0,
    limit_bytes: null,
    free_bytes: 1,
  });
  vi.spyOn(api, "jobs").mockResolvedValue([]);
}

describe("AppShell on tablet", () => {
  it("keeps the closed sidebar out of focus and closes it with Escape", async () => {
    mockTabletServer();
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <AppShell />
      </StoreProvider>,
    );
    await waitFor(() => expect(api.jobs).toHaveBeenCalled());
    const sidebar = screen.getByRole("complementary", {
      name: "Downloads",
      hidden: true,
    });
    expect(sidebar).toHaveAttribute("inert");
    await user.click(screen.getByRole("button", { name: "Show sidebar" }));
    expect(sidebar).not.toHaveAttribute("inert");
    await user.keyboard("{Escape}");
    expect(sidebar).toHaveAttribute("inert");
  });
});
