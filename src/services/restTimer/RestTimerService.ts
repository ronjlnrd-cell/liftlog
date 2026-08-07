import {
  getRemainingSeconds,
  hasTimerExpired,
} from "./computeRemaining";
import {
  playCompletionFeedback,
  prepareCompletionAudio,
  shouldPlayCompletionFeedback,
} from "./completionFeedback";
import {
  loadRestTimerState,
  saveRestTimerState,
} from "./storage";
import {
  clearRestTimerNotification,
  ensureNotificationPermission,
  registerTimerServiceWorker,
  startBackgroundRestTimer,
  stopBackgroundRestTimer,
  subscribeToRestTimerComplete,
  syncBackgroundRestTimer,
} from "./swBridge";
import type { RestTimerState } from "./types";

type RestTimerSnapshot = RestTimerState | null;

const HIDDEN_KEEPALIVE_MS = 15_000;

class RestTimerService {
  private state: RestTimerState | null = null;
  private listeners = new Set<() => void>();
  private completeListeners = new Set<() => void>();
  private uiTickHandle: number | null = null;
  private hiddenKeepaliveHandle: number | null = null;
  private completedEndAt: number | null = null;
  private initialized = false;
  private unsubscribeComplete: (() => void) | null = null;

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

  getSnapshot = (): RestTimerSnapshot => this.state;

  getRemainingSeconds(now = Date.now()): number {
    if (!this.state) return 0;
    return getRemainingSeconds(this.state.endAt, now);
  }

  isActive(): boolean {
    return this.state != null;
  }

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    void registerTimerServiceWorker();

    this.unsubscribeComplete = subscribeToRestTimerComplete(
      (completedAt, endAt) => {
        if (!this.state) return;
        if (endAt != null && endAt !== this.state.endAt) return;

        this.finish(
          document.visibilityState === "visible" &&
            shouldPlayCompletionFeedback(this.state.endAt, completedAt),
          completedAt,
        );
      },
    );

    const restored = loadRestTimerState();
    if (restored) {
      this.state = restored;
      this.completedEndAt = null;

      if (hasTimerExpired(restored.endAt)) {
        this.finish(false);
      } else {
        void syncBackgroundRestTimer(restored.endAt, restored.exerciseName);
        this.startUiTick();
      }
    }

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pageshow", this.handlePageShow);
    window.addEventListener("focus", this.reconcile);
  }

  async start(endAt: number, exerciseName?: string) {
    prepareCompletionAudio();
    await ensureNotificationPermission();

    this.state = { endAt, exerciseName };
    this.completedEndAt = null;
    saveRestTimerState(this.state);

    await startBackgroundRestTimer(endAt, exerciseName);
    this.startUiTick();
    this.notify();

    if (document.visibilityState === "hidden") {
      this.startHiddenKeepalive();
    }
  }

  async stop() {
    if (!this.state) return;

    this.state = null;
    this.completedEndAt = null;
    saveRestTimerState(null);

    this.stopUiTick();
    this.stopHiddenKeepalive();
    await stopBackgroundRestTimer();
    await clearRestTimerNotification();
    this.notify();
  }

  async adjust(deltaSeconds: number) {
    if (!this.state) return;

    const nextEndAt = Math.max(
      Date.now(),
      this.state.endAt + deltaSeconds * 1000,
    );
    this.state = { ...this.state, endAt: nextEndAt };
    this.completedEndAt = null;
    saveRestTimerState(this.state);

    await syncBackgroundRestTimer(nextEndAt, this.state.exerciseName);
    this.notify();
  }

  reconcile = () => {
    if (!this.state) return;

    if (hasTimerExpired(this.state.endAt)) {
      this.finish(shouldPlayCompletionFeedback(this.state.endAt));
      return;
    }

    void clearRestTimerNotification();
    void syncBackgroundRestTimer(this.state.endAt, this.state.exerciseName);
    this.notify();
  };

  private finish(playFeedback: boolean, completedAt = Date.now()) {
    if (!this.state) return;
    if (this.completedEndAt === this.state.endAt) return;

    const { endAt } = this.state;
    this.completedEndAt = endAt;
    this.state = null;
    saveRestTimerState(null);

    this.stopUiTick();
    this.stopHiddenKeepalive();

    void stopBackgroundRestTimer();
    void clearRestTimerNotification();

    if (playFeedback) {
      playCompletionFeedback();
    }

    this.notify();
    this.completeListeners.forEach((listener) => listener());
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      if (this.state) {
        void syncBackgroundRestTimer(this.state.endAt, this.state.exerciseName);
        this.startHiddenKeepalive();
      }
      return;
    }

    this.stopHiddenKeepalive();
    this.reconcile();
  };

  private handlePageShow = () => {
    this.reconcile();
  };

  private startUiTick() {
    this.stopUiTick();
    if (typeof window === "undefined") return;

    this.uiTickHandle = window.setInterval(() => {
      if (!this.state) {
        this.stopUiTick();
        return;
      }

      if (hasTimerExpired(this.state.endAt)) {
        if (document.visibilityState === "visible") {
          this.finish(shouldPlayCompletionFeedback(this.state.endAt));
        }
        return;
      }

      this.notify();
    }, 250);
  }

  private stopUiTick() {
    if (this.uiTickHandle != null) {
      window.clearInterval(this.uiTickHandle);
      this.uiTickHandle = null;
    }
  }

  private startHiddenKeepalive() {
    this.stopHiddenKeepalive();
    if (typeof window === "undefined" || !this.state) return;

    const tick = () => {
      if (document.visibilityState !== "hidden" || !this.state) {
        this.stopHiddenKeepalive();
        return;
      }

      if (hasTimerExpired(this.state.endAt)) {
        return;
      }

      void syncBackgroundRestTimer(this.state.endAt, this.state.exerciseName);
      this.hiddenKeepaliveHandle = window.setTimeout(tick, HIDDEN_KEEPALIVE_MS);
    };

    this.hiddenKeepaliveHandle = window.setTimeout(tick, HIDDEN_KEEPALIVE_MS);
  }

  private stopHiddenKeepalive() {
    if (this.hiddenKeepaliveHandle != null) {
      window.clearTimeout(this.hiddenKeepaliveHandle);
      this.hiddenKeepaliveHandle = null;
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const restTimerService = new RestTimerService();
