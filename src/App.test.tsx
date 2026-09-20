// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});

afterEach(() => cleanup());

describe("App shell smoke tests", () => {
  it("navigates from the landing page to grading and preserves the URL", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Grade Now/i }));
    expect(window.location.pathname).toBe("/grade");
    expect(screen.getByRole("heading", { name: "Fabric Grading" })).toBeTruthy();
  });

  it("responds to browser back navigation", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Grade Now/i }));
    window.history.replaceState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => expect(screen.getByRole("heading", { name: /The grade both sides can trust/i })).toBeTruthy());
    expect(window.location.pathname).toBe("/");
  });

  it("opens the verify route directly", () => {
    window.history.replaceState({}, "", "/verify");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Report & Server Verification/i })).toBeTruthy();
  });
});
