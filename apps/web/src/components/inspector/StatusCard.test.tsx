import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Job } from "@/lib/api/types";
import { StoreProvider } from "@/state/StoreProvider";
import type { JobItem } from "@/state/types";
import { StatusCard } from "./StatusCard";

function jobItem(overrides: Partial<Job>): JobItem {
  return {
    type: "job",
    id: "j",
    media: {
      url: "https://youtu.be/a",
      title: "Pho",
      thumbnail: "",
      duration: 60,
      uploader: "",
      platform: "youtube",
    },
    formats: [],
    options: {
      kind: "video",
      container: "mp4",
      qualityHeight: null,
      audioFormat: "m4a",
      audioQuality: "best",
      trim: null,
      subtitleLanguages: [],
      subtitleMode: "embed",
      embedMetadata: true,
    },
    job: {
      job_id: "j",
      url: "https://youtu.be/a",
      title: "Pho",
      status: "downloading",
      progress: 10,
      speed_bps: 1_000_000,
      eta_seconds: 30,
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
      ...overrides,
    },
    linkedAt: 0,
  };
}

function card(item: JobItem): ReactNode {
  return (
    <StoreProvider>
      <StatusCard item={item} />
    </StoreProvider>
  );
}

describe("StatusCard", () => {
  it("announces status changes but not speed and time left", () => {
    const { container, rerender } = render(card(jobItem({})));
    const live = container.querySelectorAll("[aria-live]");
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveTextContent("Downloading MP4");
    expect(screen.getByText(/30 s left/).closest("[aria-live]")).toBeNull();
    rerender(card(jobItem({ progress: 50, eta_seconds: 12 })));
    expect(container.querySelector("[aria-live]")).toBe(live[0]);
    expect(live[0]).toHaveTextContent("Downloading MP4");
    rerender(card(jobItem({ status: "done", progress: 100 })));
    expect(container.querySelector("[aria-live]")).toBe(live[0]);
    expect(live[0]).toHaveTextContent("Download complete");
  });
});
