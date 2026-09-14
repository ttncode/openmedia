import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TrimEditor } from "./TrimEditor";

describe("TrimEditor", () => {
  it("moves handles with the keyboard and accepts typed times", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TrimEditor
        duration={120}
        value={null}
        onChange={onChange}
        thumbnail=""
      />,
    );
    const start = screen.getByRole("slider", { name: "Start point" });
    expect(start).toHaveAttribute("aria-valuetext", "0:00");
    start.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ start: 1, end: 120 });
    const end = screen.getByLabelText("End");
    await user.clear(end);
    await user.type(end, "1:00{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ start: 0, end: 60 });
  });

  it("shows the selected length between the start and end fields", () => {
    render(
      <TrimEditor
        duration={120}
        value={{ start: 5, end: 12 }}
        onChange={vi.fn()}
        thumbnail=""
      />,
    );
    const length = screen.getByText("Length 0:07");
    const row = length.parentElement;
    expect(row?.children).toHaveLength(3);
    expect(row?.children[1]).toBe(length);
    expect(row?.children[2]).toContainElement(screen.getByLabelText("End"));
  });

  it("reports a full range as no trim", async () => {
    const onChange = vi.fn();
    render(
      <TrimEditor
        duration={120}
        value={{ start: 0, end: 119 }}
        onChange={onChange}
        thumbnail=""
      />,
    );
    screen.getByRole("slider", { name: "End point" }).focus();
    await userEvent.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
