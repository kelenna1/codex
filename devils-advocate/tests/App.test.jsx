import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App.jsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Devil's Advocate interaction", () => {
  it("sends the selected fixture and prediction, then renders the challenge", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        counterargument:
          "A compact defensive shape could deny the spaces Brazil need, while one transition may be enough to punish an aggressive setup.",
        what_would_change_my_mind:
          "Confirmed evidence that Brazil can consistently progress through a deep, narrow block would weaken this counter-case.",
        confidence: "low",
      }),
    });

    render(<App />);

    const challengeButton = screen.getByRole("button", {
      name: "Challenge my pick",
    });
    expect(challengeButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Away: Spain" }));
    expect(challengeButton).toBeEnabled();
    await user.click(challengeButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      fixture: {
        id: "bra-esp",
        homeTeam: "Brazil",
        awayTeam: "Spain",
      },
      prediction: "away",
    });
    expect(await screen.findByText("The counter-case")).toBeInTheDocument();
    expect(screen.getByText("low confidence")).toBeInTheDocument();
  });

  it("resets the pick and prior result when the fixture changes", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        counterargument: "A draw could emerge if neither side finds control.",
        what_would_change_my_mind: "Clear tactical evidence would weaken it.",
        confidence: "low",
      }),
    });

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Draw: Level score" }));
    await user.click(screen.getByRole("button", { name: "Challenge my pick" }));
    expect(await screen.findByText("The counter-case")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Argentina vs France" }),
    );

    expect(screen.queryByText("The counter-case")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Challenge my pick" }),
    ).toBeDisabled();
  });

  it("shows a useful inline failure state", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: "challenge_unavailable",
          message: "The challenge service is not configured.",
        },
      }),
    });

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Home: Brazil" }));
    await user.click(screen.getByRole("button", { name: "Challenge my pick" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The challenge service is not configured.",
    );
    expect(
      screen.getByRole("button", { name: "Challenge my pick" }),
    ).toBeEnabled();
  });
});
