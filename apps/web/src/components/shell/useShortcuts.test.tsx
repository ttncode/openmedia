import { act, render } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useShortcuts } from "./useShortcuts";

function Harness({
  onShortcuts,
  overlayOpen,
}: {
  onShortcuts: () => void;
  overlayOpen: boolean;
}): ReactNode {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useShortcuts({ inputRef, onShortcuts, overlayOpen });
  return <textarea ref={inputRef} />;
}

function fireKey(key: string): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

describe("useShortcuts", () => {
  it("focuses the input on / and opens shortcuts on ? when nothing is open", () => {
    const onShortcuts = vi.fn();
    render(<Harness onShortcuts={onShortcuts} overlayOpen={false} />);
    act(() => fireKey("/"));
    expect(document.activeElement?.tagName).toBe("TEXTAREA");
    act(() => fireKey("?"));
    expect(onShortcuts).toHaveBeenCalledTimes(1);
  });

  it("ignores / and ? while an overlay is open", () => {
    const onShortcuts = vi.fn();
    render(<Harness onShortcuts={onShortcuts} overlayOpen={true} />);
    act(() => fireKey("/"));
    expect(document.activeElement?.tagName).not.toBe("TEXTAREA");
    act(() => fireKey("?"));
    expect(onShortcuts).not.toHaveBeenCalled();
  });
});
