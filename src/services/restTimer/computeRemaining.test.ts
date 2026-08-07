import { describe, expect, it } from "vitest";
import {
  formatRestTime,
  getRemainingMs,
  getRemainingSeconds,
  hasTimerExpired,
  msUntilNextSecondBoundary,
} from "./computeRemaining";
import { shouldPlayCompletionFeedback } from "./completionFeedback";

describe("rest timer computeRemaining", () => {
  it("derives remaining time from end timestamp", () => {
    expect(getRemainingMs(10_000, 7_500)).toBe(2_500);
    expect(getRemainingSeconds(10_000, 7_500)).toBe(3);
  });

  it("never returns negative remaining time", () => {
    expect(getRemainingMs(1_000, 2_000)).toBe(0);
    expect(getRemainingSeconds(1_000, 2_000)).toBe(0);
    expect(hasTimerExpired(1_000, 2_000)).toBe(true);
  });

  it("formats rest time labels", () => {
    expect(formatRestTime(125)).toBe("2:05");
    expect(formatRestTime(5)).toBe("0:05");
  });

  it("schedules the next tick on second boundaries", () => {
    expect(msUntilNextSecondBoundary(10_000, 9_700)).toBe(300);
  });
});

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
