import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { StoreProvider } from "@/state/StoreProvider";
import { SettingsSheet } from "./SettingsSheet";

function mockServer(): void {
  vi.spyOn(api, "session").mockResolvedValue({
    auth_required: false,
    authenticated: true,
    limits: { max_filesize_mb: 4096, max_playlist_items: 50 },
  });
  vi.spyOn(api, "settings").mockResolvedValue({
    retention_minutes: 60,
    max_concurrent: 3,
  });
  vi.spyOn(api, "storage").mockResolvedValue({
    used_bytes: 1_800_000_000,
    limit_bytes: null,
    free_bytes: 18_200_000_000,
  });
  vi.spyOn(api, "cookies").mockResolvedValue({
    present: false,
    domains: [],
    expires_at: null,
    uploaded_at: null,
  });
  vi.spyOn(api, "jobs").mockResolvedValue([]);
}

describe("SettingsSheet", () => {
  it("uploads cookies and saves server settings", async () => {
    mockServer();
    const upload = vi.spyOn(api, "uploadCookies").mockResolvedValue({
      present: true,
      domains: ["youtube.com"],
      expires_at: "2030-01-01T00:00:00Z",
      uploaded_at: "2026-09-14T00:00:00Z",
    });
    const save = vi
      .spyOn(api, "updateSettings")
      .mockResolvedValue({ retention_minutes: 360, max_concurrent: 3 });
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <SettingsSheet open onClose={vi.fn()} focusCookies={false} />
      </StoreProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("No cookies yet")).toBeInTheDocument(),
    );
    const file = new File(["# Netscape HTTP Cookie File"], "cookies.txt", {
      type: "text/plain",
    });
    await user.upload(screen.getByLabelText("Choose cookies.txt"), file);
    expect(upload).toHaveBeenCalledWith(file);
    await user.click(screen.getByRole("radio", { name: "6 hours" }));
    expect(save).toHaveBeenCalledWith({ retention_minutes: 360 });
  });

  it("switches the accent color immediately", async () => {
    mockServer();
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <SettingsSheet open onClose={vi.fn()} focusCookies={false} />
      </StoreProvider>,
    );
    await user.click(screen.getByRole("radio", { name: "Pink" }));
    await waitFor(() =>
      expect(document.documentElement.dataset.accent).toBe("pink"),
    );
  });
});
