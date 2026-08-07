import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRemainingSeconds,
  hasTimerExpired,
} from "./computeRemaining";
import { shouldPlayCompletionFeedback } from "./completionFeedback";
import { RestTimerService } from "./RestTimerService";
import type { RestTimerState } from "./types";

const swCalls = {
  starts: [] as RestTimerState[],
  syncs: [] as RestTimerState[],
  stops: [] as string[],
  clearedNotifications: 0,
};

vi.mock("./swBridge", () => ({
  registerTimerServiceWorker: vi.fn().mockResolvedValue(null),
  ensureNotificationPermission: vi.fn().mockResolvedValue(true),
  clearRestTimerNotification: vi.fn().mockImplementation(async () => {
    swCalls.clearedNotifications += 1;
  }),
  postRestTimerStart: vi.fn().mockImplementation(async (state: RestTimerState) => {
    swCalls.starts.push(state);
  }),
  postRestTimerSync: vi.fn().mockImplementation(async (state: RestTimerState) => {
    swCalls.syncs.push(state);
  }),
  postRestTimerStop: vi.fn().mockImplementation(async (timerId: string) => {
    swCalls.stops.push(timerId);
  }),
  subscribeToRestTimerComplete: vi.fn().mockReturnValue(() => {}),
}));

vi.mock("./completionFeedback", async (importOriginal) => {
  const original = await importOriginal<typeof import("./completionFeedback")>();
  return {
    ...original,
    playCompletionFeedback: vi.fn(),
    prepareCompletionAudio: vi.fn(),
  };
});

vi.mock("./storage", () => ({
  loadRestTimerState: vi.fn().mockReturnValue(null),
  saveRestTimerState: vi.fn(),
}));

function createHarness(initialNow = 0) {
  let now = initialNow;
  let visible = true;

  const service = new RestTimerService({
    clock: { now: () => now },
    isDocumentVisible: () => visible,
  });

  return {
    service,
    advance: (ms: number) => {
      now += ms;
    },
    setVisible: (value: boolean) => {
      visible = value;
    },
  };
}

describe("RestTimerService", () => {
  beforeEach(() => {
    swCalls.starts = [];
    swCalls.syncs = [];
    swCalls.stops = [];
    swCalls.clearedNotifications = 0;
    vi.clearAllMocks();
  });

  it("derives remaining time from endAt as clock advances", async () => {
    const { service, advance } = createHarness(0);

    await service.start(120_000, "Bench press");
    expect(service.getSnapshot()?.remainingSeconds).toBe(120);

    advance(30_000);
    await service.reconcile();
    expect(service.getSnapshot()?.remainingSeconds).toBe(90);
  });

  it("returns a stable snapshot between updates", async () => {
    const { service } = createHarness(0);

    await service.start(60_000, "Squat");
    const first = service.getSnapshot();
    const second = service.getSnapshot();

    expect(first).toBe(second);
    expect(first?.remainingSeconds).toBe(60);
  });

  it("returns an updated snapshot after the clock advances", async () => {
    const { service, advance } = createHarness(0);

    await service.start(10_000, "Row");
    const first = service.getSnapshot();

    advance(3_000);
    await service.reconcile();

    const second = service.getSnapshot();
    expect(second?.remainingSeconds).toBe(7);
    expect(first).not.toBe(second);
  });

  it("completes exactly once when time expires in the foreground", async () => {
    const { service, advance } = createHarness(0);
    const onComplete = vi.fn();
    service.onComplete(onComplete);

    await service.start(5_000, "Deadlift");
    const timerId = service.getSnapshot()?.timerId;
    expect(timerId).toBeTruthy();

    advance(5_000);
    await service.reconcile();

    expect(service.isActive()).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(swCalls.stops).toEqual([timerId]);
  });

  it("ignores stale service worker completion messages by timerId", async () => {
    const { service, advance } = createHarness(0);

    await service.start(10_000, "Row");
    const staleTimerId = service.getSnapshot()?.timerId;

    await service.start(10_000, "Press");
    const currentTimerId = service.getSnapshot()?.timerId;
    expect(currentTimerId).not.toBe(staleTimerId);

    (
      service as unknown as {
        handleServiceWorkerComplete: (payload: {
          timerId: string;
          completedAt: number;
          endAt: number;
        }) => void;
      }
    ).handleServiceWorkerComplete({
      timerId: staleTimerId!,
      completedAt: 10_000,
      endAt: 10_000,
    });

    expect(service.isActive()).toBe(true);
    expect(service.getSnapshot()?.timerId).toBe(currentTimerId);

    advance(10_000);
    await service.reconcile();
    expect(service.isActive()).toBe(false);
  });

  it("reconciles correctly after background resume", async () => {
    const { service, advance, setVisible } = createHarness(0);

    await service.start(120_000, "OHP");
    setVisible(false);
    advance(90_000);
    setVisible(true);

    await service.reconcile();
    expect(service.getSnapshot()?.remainingSeconds).toBe(30);
    expect(hasTimerExpired(service.getSnapshot()!.endAt, 90_000)).toBe(false);
  });

  it("restores persisted timer state on init", async () => {
    const saved: RestTimerState = {
      timerId: "restore-id",
      endAt: 90_000,
      exerciseName: "Curl",
    };

    const storage = await import("./storage");
    vi.mocked(storage.loadRestTimerState).mockReturnValue(saved);

    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: vi.fn(),
    });

    const service = new RestTimerService({
      clock: { now: () => 0 },
      isDocumentVisible: () => true,
    });

    service.init();

    expect(service.getSnapshot()?.timerId).toBe("restore-id");
    expect(service.getSnapshot()?.remainingSeconds).toBe(90);
  });
});

describe("shouldPlayCompletionFeedback", () => {
  it("plays feedback when completion happens right at timer end", () => {
    expect(shouldPlayCompletionFeedback(1000, 1000)).toBe(true);
  });

  it("suppresses delayed feedback after the stale window", () => {
    expect(shouldPlayCompletionFeedback(1000, 5000)).toBe(false);
  });
});

describe("computeRemaining", () => {
  it("never returns negative remaining seconds", () => {
    expect(getRemainingSeconds(1_000, 5_000)).toBe(0);
  });
});
