import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import type { Job } from "@/lib/api/types";
import { StoreProvider, useStore } from "./StoreProvider";

const INFO = {
  id: "a",
  title: "Pho",
  thumbnail: "",
  duration: 60,
  uploader: "",
  platform: "Youtube",
  webpage_url: "",
  formats: [],
  subtitle_languages: [],
  has_chapters: false,
};

function job(id: string, status: Job["status"] = "error"): Job {
  return {
    job_id: id,
    url: "https://youtu.be/a",
    title: "Pho",
    status,
    progress: 0,
    speed_bps: null,
    eta_seconds: null,
    downloaded_bytes: null,
    total_bytes: null,
    queue_position: 0,
    options: {
      kind: "video",
      container: "mp4",
      quality_height: null,
      format_id: null,
      audio_format: null,
      audio_quality: null,
      trim: null,
      subtitles: null,
      embed_metadata: true,
    },
    filename: null,
    files: [],
    error: null,
    error_code: null,
    created_at: "2026-09-14T00:00:00Z",
    finished_at: null,
    expires_at: null,
  };
}

let latest: ReturnType<typeof useStore> | null = null;
function Probe(): null {
  const store = useStore();
  useEffect(() => {
    latest = store;
  });
  return null;
}

function mockServer(): void {
  vi.spyOn(api, "session").mockResolvedValue({
    auth_required: false,
    authenticated: true,
    limits: { max_filesize_mb: 1, max_playlist_items: 1 },
  });
  vi.spyOn(api, "settings").mockResolvedValue({} as never);
  vi.spyOn(api, "storage").mockResolvedValue({} as never);
  vi.spyOn(api, "cookies").mockResolvedValue({
    present: false,
    domains: [],
    expires_at: null,
    uploaded_at: null,
  });
  vi.spyOn(api, "jobs").mockResolvedValue([]);
}

describe("StoreProvider", () => {
  it("shows the fetched notice on the first fetch", async () => {
    mockServer();
    vi.spyOn(api, "info").mockResolvedValue(INFO);
    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    await act(async () => {
      await latest!.commands.fetchLinks(["https://youtu.be/a"], "single");
    });
    expect(latest!.state.items.map((item) => item.type)).toEqual(["ready"]);
    expect(latest!.state.notice?.message).toBe("fetched");
  });

  it("retries a job by starting a fresh download", async () => {
    mockServer();
    vi.spyOn(api, "info").mockResolvedValue(INFO);
    vi.spyOn(api, "download")
      .mockResolvedValueOnce({ job_id: "j1", job: job("j1", "queued") })
      .mockResolvedValueOnce({ job_id: "j2", job: job("j2", "queued") });
    const remove = vi.spyOn(api, "removeJob").mockResolvedValue(undefined);
    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    await act(async () => {
      await latest!.commands.fetchLinks(["https://youtu.be/a"], "single");
    });
    await act(async () => {
      await latest!.commands.startDownload(latest!.state.items[0].id);
    });
    await act(async () => {
      await latest!.commands.retryJob("j1");
    });
    expect(remove).toHaveBeenCalledWith("j1");
    expect(api.download).toHaveBeenCalledTimes(2);
    expect(latest!.state.items[0]).toMatchObject({ type: "job", id: "j2" });
  });

  it("does not restart the polling interval on unrelated state changes", async () => {
    mockServer();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    await waitFor(() => expect(latest!.state.session).not.toBeNull());
    await waitFor(() => expect(api.jobs).toHaveBeenCalled());
    const before = setIntervalSpy.mock.calls.length;
    for (let index = 0; index < 5; index += 1) {
      act(() => latest!.dispatch({ type: "item/selected", id: `x${index}` }));
    }
    expect(setIntervalSpy.mock.calls.length - before).toBe(0);
  });
});
