let audioContext: AudioContext | null = null;

const REST_TIMER_MESSAGE = {
  START: "REST_TIMER_START",
  STOP: "REST_TIMER_STOP",
  COMPLETE: "REST_TIMER_COMPLETE",
} as const;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

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
  registration?.active?.postMessage(message);
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

export async function startBackgroundRestTimer(
  endAt: number,
  exerciseName?: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  await postToServiceWorker({
    type: REST_TIMER_MESSAGE.START,
    endAt,
    exerciseName,
  });
}

export function stopBackgroundRestTimer() {
  void postToServiceWorker({ type: REST_TIMER_MESSAGE.STOP });
}

export function subscribeToRestTimerComplete(
  callback: () => void,
): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type === REST_TIMER_MESSAGE.COMPLETE) {
      callback();
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
