import { describe, expect, it } from "vitest";
import { shouldPlayCompletionFeedback } from "./timerNotification";

describe("shouldPlayCompletionFeedback", () => {
  it("plays feedback when completion happens right at timer end", () => {
    expect(shouldPlayCompletionFeedback(1000, 1000)).toBe(true);
  });

  it("plays feedback within the stale window", () => {
    expect(shouldPlayCompletionFeedback(1000, 2500)).toBe(true);
  });

  it("suppresses delayed feedback after the stale window", () => {
    expect(shouldPlayCompletionFeedback(1000, 5000)).toBe(false);
  });
});
