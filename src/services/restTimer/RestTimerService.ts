import { systemClock, type Clock } from "./clock";
import {
  getRemainingSeconds,
  hasTimerExpired,
} from "./computeRemaining";
import {
  playCompletionFeedback,
  prepareCompletionAudio,
  shouldPlayCompletionFeedback,
} from "./completionFeedback";
import { logTimerDebug } from "./debug";
import {
  loadRestTimerState,
  saveRestTimerState,
} from "./storage";
import {
  clearRestTimerNotification,
  ensureNotificationPermission,
  postRestTimerStart,
  postRestTimerStop,
  postRestTimerSync,
  registerTimerServiceWorker,
  subscribeToRestTimerComplete,
} from "./swBridge";
import type { RestTimerState, RestTimerView } from "./types";

const DISPLAY_PULSE_MS = 250;

export type RestTimerServiceDeps = {
  clock: Clock;
  isDocumentVisible: () => boolean;
};

function createTimerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `timer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class RestTimerService {
  private state: RestTimerState | null = null;
  private snapshot: RestTimerView | null = null;
  private completedTimerId: string | null = null;
  private listeners = new Set<() => void>();
  private completeListeners = new Set<() => void>();
  private displayPulseHandle: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private unsubscribeComplete: (() => void) | null = null;
  private readonly clock: Clock;
  private readonly isDocumentVisible: () => boolean;

  constructor(deps: RestTimerServiceDeps = {
    clock: systemClock,
    isDocumentVisible: () =>
      typeof document === "undefined" || document.visibilityState === "visible",
  }) {
    this.clock = deps.clock;
    this.isDocumentVisible = deps.isDocumentVisible;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  onComplete = (listener: () => void) => {
    this.completeListeners.add(listener);
    return () => {
      this.completeListeners.delete(listener);
    };
  };

  getSnapshot = (): RestTimerView | null => this.snapshot;

  isActive(): boolean {
    return this.state != null;
  }

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    void registerTimerServiceWorker();

    this.unsubscribeComplete = subscribeToRestTimerComplete((payload) => {
      this.handleServiceWorkerComplete(payload);
    });

    const restored = loadRestTimerState();
    if (restored) {
      logTimerDebug("RESTORE", restored);
      this.state = restored;
      this.completedTimerId = null;

      if (hasTimerExpired(restored.endAt, this.clock.now())) {
        void this.complete(restored.timerId, false);
      } else {
        this.rebuildSnapshot();
        void postRestTimerSync(restored);
        this.startDisplayPulse();
      }
    }

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pageshow", this.reconcile);
    window.addEventListener("focus", this.reconcile);
  }

  async start(endAt: number, exerciseName?: string) {
    prepareCompletionAudio();
    await ensureNotificationPermission();

    const state: RestTimerState = {
      timerId: createTimerId(),
      endAt,
      exerciseName,
    };

    this.applyState(state);
    logTimerDebug("START", state);

    await postRestTimerStart(state);
    this.startDisplayPulse();
    this.notify();
  }

  async stop() {
    if (!this.state) return;
    await this.clearTimer(this.state.timerId);
  }

  async adjust(deltaSeconds: number) {
    if (!this.state) return;

    const nextState: RestTimerState = {
      ...this.state,
      endAt: Math.max(
        this.clock.now(),
        this.state.endAt + deltaSeconds * 1000,
      ),
    };

    this.applyState(nextState);
    logTimerDebug("SYNC", nextState);

    await postRestTimerSync(nextState);
    this.notify();
  }

  reconcile = async () => {
    if (!this.state) return;

    if (hasTimerExpired(this.state.endAt, this.clock.now())) {
      await this.complete(
        this.state.timerId,
        shouldPlayCompletionFeedback(this.state.endAt, this.clock.now()),
      );
      return;
    }

    void clearRestTimerNotification();
    void postRestTimerSync(this.state);
    this.startDisplayPulse();
    this.notify();
  };

  private applyState(state: RestTimerState) {
    this.state = state;
    this.completedTimerId = null;
    saveRestTimerState(state);
  }

  private async clearTimer(timerId: string) {
    if (!this.state || this.state.timerId !== timerId) return;

    logTimerDebug("STOP", { timerId });
    this.state = null;
    this.completedTimerId = timerId;
    saveRestTimerState(null);
    this.stopDisplayPulse();

    await postRestTimerStop(timerId);
    await clearRestTimerNotification();
    this.notify();
  }

  private async complete(
    timerId: string,
    playFeedback: boolean,
    completedAt = this.clock.now(),
  ) {
    if (!this.state || this.state.timerId !== timerId) return;
    if (this.completedTimerId === timerId) return;

    logTimerDebug("COMPLETE", {
      timerId,
      playFeedback,
      completedAt,
    });

    this.completedTimerId = timerId;
    const endAt = this.state.endAt;
    this.state = null;
    saveRestTimerState(null);
    this.stopDisplayPulse();

    await postRestTimerStop(timerId);
    await clearRestTimerNotification();

    if (
      playFeedback &&
      shouldPlayCompletionFeedback(endAt, completedAt)
    ) {
      playCompletionFeedback();
    }

    this.notify();
    this.completeListeners.forEach((listener) => listener());
  }

  private handleServiceWorkerComplete(payload: {
    timerId: string;
    completedAt: number;
    endAt: number;
  }) {
    if (!this.state || this.state.timerId !== payload.timerId) return;

    void this.complete(
      payload.timerId,
      this.isDocumentVisible() &&
        shouldPlayCompletionFeedback(payload.endAt, payload.completedAt),
      payload.completedAt,
    );
  }

  private handleVisibilityChange = () => {
    if (!this.state) return;

    if (!this.isDocumentVisible()) {
      this.stopDisplayPulse();
      void postRestTimerSync(this.state);
      logTimerDebug("SYNC", { reason: "hidden", timerId: this.state.timerId });
      return;
    }

    this.reconcile();
  };

  private startDisplayPulse() {
    this.stopDisplayPulse();
    if (typeof window === "undefined" || !this.state) return;

    this.displayPulseHandle = setInterval(() => {
      if (!this.state) {
        this.stopDisplayPulse();
        return;
      }

      if (hasTimerExpired(this.state.endAt, this.clock.now())) {
        if (this.isDocumentVisible()) {
          void this.complete(
            this.state.timerId,
            shouldPlayCompletionFeedback(
              this.state.endAt,
              this.clock.now(),
            ),
          );
        }
        return;
      }

      if (this.isDocumentVisible()) {
        this.notify();
      }
    }, DISPLAY_PULSE_MS);
  }

  private stopDisplayPulse() {
    if (this.displayPulseHandle != null) {
      clearInterval(this.displayPulseHandle);
      this.displayPulseHandle = null;
    }
  }

  private notify() {
    this.rebuildSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  private rebuildSnapshot() {
    if (!this.state) {
      this.snapshot = null;
      return;
    }

    this.snapshot = {
      timerId: this.state.timerId,
      endAt: this.state.endAt,
      exerciseName: this.state.exerciseName,
      remainingSeconds: getRemainingSeconds(
        this.state.endAt,
        this.clock.now(),
      ),
    };

    logTimerDebug("UI_RENDER", this.snapshot);
  }
}

export const restTimerService = new RestTimerService();
