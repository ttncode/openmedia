import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { vi as viMessages } from "@/lib/i18n/vi";
import type { PlaylistScope } from "@/state/types";
import { Importer } from "./Importer";

function Harness({
  onSubmit,
}: {
  onSubmit: (urls: string[], scope: PlaylistScope) => void;
}): ReactNode {
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<PlaylistScope>("single");
  return (
    <Importer
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      scope={scope}
      onScopeChange={setScope}
      inputRef={createRef()}
    />
  );
}

describe("Importer", () => {
  it("detects platforms, asks about playlists and submits on Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    const field = screen.getByLabelText("Links to download");
    await user.type(
      field,
      "https://www.youtube.com/watch?v=a&list=PL1 https://soundcloud.com/a/b",
    );
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("SoundCloud")).toBeInTheDocument();
    await user.click(
      screen.getByRole("radio", { name: "Whole playlist (up to 50 videos)" }),
    );
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith(
      [
        "https://www.youtube.com/watch?v=a&list=PL1",
        "https://soundcloud.com/a/b",
      ],
      "playlist",
    );
  });

  it("keeps Shift+Enter as a new line", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText("Links to download"),
      "https://youtu.be/a{Shift>}{Enter}{/Shift}",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when Enter is pressed on the paste button", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText("Links to download"),
      "https://youtu.be/a",
    );
    screen.getByRole("button", { name: "Paste" }).focus();
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shakes the field once on an invalid submit and clears on animationend", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByLabelText("Links to download");
    await user.type(input, "not a link");
    await user.keyboard("{Enter}");
    const field = input.parentElement as HTMLElement;
    expect(field).toHaveClass("shaking");
    fireEvent.animationEnd(field);
    expect(field).not.toHaveClass("shaking");
  });

  it("localizes the generic platform chip label", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <I18nProvider locale="vi">
        <Harness onSubmit={onSubmit} />
      </I18nProvider>,
    );
    await user.type(
      screen.getByLabelText(viMessages.importer.label),
      "https://example.com",
    );
    expect(
      screen.getByText(viMessages.importer.platformOther),
    ).toBeInTheDocument();
  });
});
