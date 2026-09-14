import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { StoreProvider } from "@/state/StoreProvider";
import type { QueueItem } from "@/state/types";
import { QueueRow } from "./QueueRow";

const media = {
  url: "https://youtu.be/a",
  title: "Pho",
  thumbnail: "",
  duration: 60,
  uploader: "Bep",
  platform: "youtube" as const,
};
const options = {
  kind: "video" as const,
  container: "mp4" as const,
  qualityHeight: null,
  audioFormat: "m4a" as const,
  audioQuality: "best" as const,
  trim: null,
  subtitleLanguages: [],
  subtitleMode: "embed" as const,
  embedMetadata: true,
};

function wrap(children: ReactNode): ReactNode {
  return <StoreProvider>{children}</StoreProvider>;
}

describe("QueueRow", () => {
  it("offers cookie settings for a bot check error", async () => {
    vi.spyOn(api, "session").mockResolvedValue({
      auth_required: false,
      authenticated: true,
      limits: { max_filesize_mb: 1, max_playlist_items: 1 },
    });
    vi.spyOn(api, "settings").mockResolvedValue({
      retention_minutes: 60,
      max_concurrent: 3,
    });
    vi.spyOn(api, "storage").mockResolvedValue({
      used_bytes: 0,
      limit_bytes: null,
      free_bytes: 1,
    });
    vi.spyOn(api, "cookies").mockResolvedValue({
      present: false,
      domains: [],
      expires_at: null,
      uploaded_at: null,
    });
    vi.spyOn(api, "jobs").mockResolvedValue([]);
    const onOpenCookies = vi.fn();
    const item: QueueItem = {
      type: "job",
      id: "j",
      media,
      formats: [],
      options,
      job: {
        job_id: "j",
        url: media.url,
        title: "Pho",
        status: "error",
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
        error: "bot",
        error_code: "bot_check",
        created_at: "2026-09-14T00:00:00Z",
        finished_at: null,
        expires_at: null,
      },
      linkedAt: 0,
    };
    render(
      wrap(
        <QueueRow
          item={item}
          selected={false}
          onSelect={vi.fn()}
          onOpenCookies={onOpenCookies}
        />,
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: "Fix" }));
    expect(onOpenCookies).toHaveBeenCalled();
  });

  it("links done jobs to their file", () => {
    const item: QueueItem = {
      type: "job",
      id: "d",
      media,
      formats: [],
      options,
      job: {
        job_id: "d",
        url: media.url,
        title: "Pho",
        status: "done",
        progress: 100,
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
        filename: "Pho.mp4",
        files: [{ index: 0, name: "Pho.mp4", kind: "media", size_bytes: 10 }],
        error: null,
        error_code: null,
        created_at: "2026-09-14T00:00:00Z",
        finished_at: "2026-09-14T00:01:00Z",
        expires_at: "2026-09-14T01:01:00Z",
      },
      linkedAt: 0,
    };
    render(
      wrap(
        <QueueRow
          item={item}
          selected={false}
          onSelect={vi.fn()}
          onOpenCookies={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole("link", { name: "Save" })).toHaveAttribute(
      "href",
      "/api/file/d",
    );
  });
});
