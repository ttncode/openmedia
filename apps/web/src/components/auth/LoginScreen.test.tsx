import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api, ApiRequestError } from "@/lib/api/client";
import { StoreProvider } from "@/state/StoreProvider";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("shows an error for a wrong password", async () => {
    vi.spyOn(api, "session").mockResolvedValue({
      auth_required: true,
      authenticated: false,
      limits: { max_filesize_mb: 1, max_playlist_items: 1 },
    });
    vi.spyOn(api, "signIn").mockRejectedValue(
      new ApiRequestError(401, "invalid_password", "no", null),
    );
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <LoginScreen />
      </StoreProvider>,
    );
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The password is not correct.",
      ),
    );
  });
});
