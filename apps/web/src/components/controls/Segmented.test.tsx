import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Segmented } from "./Segmented";

function Harness(): React.ReactNode {
  const [value, setValue] = useState<"video" | "audio">("video");
  return (
    <Segmented
      label="Type"
      value={value}
      onChange={setValue}
      options={[
        { value: "video", label: "Video" },
        { value: "audio", label: "Audio" },
      ]}
    />
  );
}

describe("Segmented", () => {
  it("selects with clicks and arrow keys and moves the thumb", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: "Type" });
    expect(screen.getByRole("radio", { name: "Video" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(screen.getByRole("radio", { name: "Audio" }));
    expect(screen.getByRole("radio", { name: "Audio" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(group.style.getPropertyValue("--index")).toBe("1");
    screen.getByRole("radio", { name: "Audio" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Video" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Video" })).toHaveFocus();
  });
});
