let audioContext: AudioContext | null = null;
let keepAliveOscillator: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;
let notificationTickInterval: number | null = null;
let activeNotificationTimer: { endAt: number; exerciseName?: string } | null =
  null;

export const REST_TIMER_MESSAGE = {
  START: "REST_TIMER_START",
  STOP: "REST_TIMER_STOP",
  SYNC: "REST_TIMER_SYNC",
  VISIBILITY: "REST_TIMER_VISIBILITY",
  COMPLETE: "REST_TIMER_COMPLETE",
} as const;

export const REST_TIMER_STALE_FEEDBACK_MS = 3000;

const REST_TIMER_TAG = "liftlog-rest-timer";
const NOTIFICATION_ICON = "/app-icon.svg";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;
let lastNotifiedSecond = -1;

export function registerTimerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;

  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    registrationPromise = Promise.resolve(null);
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  })();

  return registrationPromise;
}

async function postToServiceWorker(message: Record<string, unknown>) {
  const registration = await registerTimerServiceWorker();
  if (!registration) return;

  const active = registration.active;
  if (active) {
    active.postMessage(message);
    return;
  }

  const installing = registration.installing ?? registration.waiting;
  if (!installing) return;

  await new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (installing.state !== "activated") return;
      installing.removeEventListener("statechange", onStateChange);
      registration.active?.postMessage(message);
      resolve();
    };
    installing.addEventListener("statechange", onStateChange);
    if (installing.state === "activated") {
      onStateChange();
    }
  });
}

function formatRestTime(secondsLeft: number): string {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function syncPageVisibilityWithServiceWorker() {
  if (typeof document === "undefined") return;

  void postToServiceWorker({
    type: REST_TIMER_MESSAGE.VISIBILITY,
    visible: document.visibilityState === "visible",
  });
}

function startRestTimerKeepAlive() {
  if (typeof window === "undefined") return;

  try {
    audioContext ??= new AudioContext();
    void audioContext.resume().then(() => {
      if (!audioContext || keepAliveOscillator) return;

      keepAliveOscillator = audioContext.createOscillator();
      keepAliveGain = audioContext.createGain();
      keepAliveOscillator.type = "sine";
      keepAliveOscillator.frequency.value = 1;
      keepAliveGain.gain.value = 0.00001;
      keepAliveOscillator.connect(keepAliveGain);
      keepAliveGain.connect(audioContext.destination);
      keepAliveOscillator.start();
    });
  } catch {
    // Audio unavailable or blocked until a later user gesture.
  }
}

function stopRestTimerKeepAlive() {
  try {
    keepAliveOscillator?.stop();
  } catch {
    // Oscillator may already be stopped.
  }
  keepAliveOscillator = null;
  keepAliveGain = null;
}

function stopRestTimerNotificationLoop() {
  activeNotificationTimer = null;
  if (notificationTickInterval != null) {
    window.clearInterval(notificationTickInterval);
    notificationTickInterval = null;
  }
  stopRestTimerKeepAlive();
}

function tickRestTimerNotification() {
  const timer = activeNotificationTimer;
  if (!timer) return;

  syncPageVisibilityWithServiceWorker();

  const secondsLeft = Math.max(
    0,
    Math.ceil((timer.endAt - Date.now()) / 1000),
  );

  if (document.visibilityState === "visible") {
    void clearRestTimerNotification();
    return;
  }

  if (secondsLeft <= 0) return;

  void updateRestTimerNotification(
    secondsLeft,
    timer.exerciseName,
    timer.endAt,
  );
}

function startRestTimerNotificationLoop(endAt: number, exerciseName?: string) {
  stopRestTimerNotificationLoop();
  activeNotificationTimer = { endAt, exerciseName };
  startRestTimerKeepAlive();
  syncPageVisibilityWithServiceWorker();

  tickRestTimerNotification();
  notificationTickInterval = window.setInterval(tickRestTimerNotification, 1000);
}

export function prepareTimerNotification() {
  if (typeof window === "undefined") return;

  void registerTimerServiceWorker();

  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
  } catch {
    // Audio unavailable or blocked until a later user gesture.
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function updateRestTimerNotification(
  secondsLeft: number,
  exerciseName?: string,
  endAt?: number,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  if (secondsLeft <= 0) {
    await clearRestTimerNotification();
    return;
  }

  if (secondsLeft === lastNotifiedSecond) return;
  lastNotifiedSecond = secondsLeft;

  const registration = await registerTimerServiceWorker();
  if (!registration) return;

  const title = exerciseName ? `Rest · ${exerciseName}` : "Rest timer";
  const body = `${formatRestTime(secondsLeft)} remaining`;
  const timerEndAt = endAt ?? Date.now() + secondsLeft * 1000;

  try {
    await registration.showNotification(title, {
      body,
      tag: REST_TIMER_TAG,
      icon: NOTIFICATION_ICON,
      silent: true,
      renotify: true,
      timestamp: Date.now(),
      data: { endAt: timerEndAt, exerciseName: exerciseName ?? null },
    });
  } catch {
    // Notifications unavailable in this context.
  }
}

export async function clearRestTimerNotification() {
  lastNotifiedSecond = -1;

  const registration = await registerTimerServiceWorker();
  if (!registration) return;

  try {
    const notifications = await registration.getNotifications();
    notifications
      .filter((notification) => notification.tag === REST_TIMER_TAG)
      .forEach((notification) => notification.close());
  } catch {
    // ignore
  }
}

export async function startBackgroundRestTimer(
  endAt: number,
  exerciseName?: string,
) {
  if (typeof window === "undefined") return;

  lastNotifiedSecond = -1;
  startRestTimerNotificationLoop(endAt, exerciseName);

  await postToServiceWorker({
    type: REST_TIMER_MESSAGE.START,
    endAt,
    exerciseName,
  });
}

export function syncBackgroundRestTimer(endAt: number, exerciseName?: string) {
  if (
    !activeNotificationTimer ||
    activeNotificationTimer.endAt !== endAt ||
    activeNotificationTimer.exerciseName !== exerciseName
  ) {
    startRestTimerNotificationLoop(endAt, exerciseName);
  } else {
    syncPageVisibilityWithServiceWorker();
  }

  void postToServiceWorker({
    type: REST_TIMER_MESSAGE.SYNC,
    endAt,
    exerciseName,
  });
}

export function stopBackgroundRestTimer() {
  lastNotifiedSecond = -1;
  stopRestTimerNotificationLoop();
  void clearRestTimerNotification();
  void postToServiceWorker({ type: REST_TIMER_MESSAGE.STOP });
}

export function subscribeToRestTimerComplete(
  callback: (completedAt: number) => void,
): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type === REST_TIMER_MESSAGE.COMPLETE) {
      callback(
        typeof event.data.completedAt === "number"
          ? event.data.completedAt
          : Date.now(),
      );
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}

export function notifyTimerComplete() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      // Vibration unavailable or disabled in system settings.
    }
  }

  playCompletionChime();
}

function playCompletionChime() {
  if (typeof window === "undefined") return;

  try {
    audioContext ??= new AudioContext();

    void audioContext.resume().then(() => {
      if (!audioContext) return;

      beep(audioContext, 880, audioContext.currentTime, 0.45);
      beep(audioContext, 1175, audioContext.currentTime + 0.55, 0.45);
    });
  } catch {
    // Silent mode, autoplay policy, or missing audio hardware.
  }
}

function beep(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(context.destination);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

export function shouldPlayCompletionFeedback(
  endAt: number,
  completedAt = Date.now(),
): boolean {
  if (completedAt < endAt) return false;
  return completedAt - endAt <= REST_TIMER_STALE_FEEDBACK_MS;
}
