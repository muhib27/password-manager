import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Login } from "../routes/Login";

vi.mock("../lib/ipc", () => ({
  api: {
    unlock: vi.fn(),
  },
}));

import { api } from "../lib/ipc";

describe("Login", () => {
  it("shows a generic error when unlock fails", async () => {
    vi.mocked(api.unlock).mockRejectedValueOnce(new Error("fail"));
    render(<Login onUnlocked={() => undefined} />);

    await userEvent.type(screen.getByLabelText(/master password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /unlock/i }));

    expect(
      await screen.findByText(/could not unlock the vault/i),
    ).toBeInTheDocument();
  });
});
