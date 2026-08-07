import { REST_TIMER_MESSAGE } from "./types";

const REST_TIMER_TAG = "liftlog-rest-timer";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

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

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function clearRestTimerNotification() {
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
  await postToServiceWorker({
    type: REST_TIMER_MESSAGE.START,
    endAt,
    exerciseName,
  });
}

export async function syncBackgroundRestTimer(
  endAt: number,
  exerciseName?: string,
) {
  await postToServiceWorker({
    type: REST_TIMER_MESSAGE.SYNC,
    endAt,
    exerciseName,
  });
}

export async function stopBackgroundRestTimer() {
  await postToServiceWorker({ type: REST_TIMER_MESSAGE.STOP });
}

export function subscribeToRestTimerComplete(
  callback: (completedAt: number, endAt: number | null) => void,
): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type !== REST_TIMER_MESSAGE.COMPLETE) return;

    callback(
      typeof event.data.completedAt === "number"
        ? event.data.completedAt
        : Date.now(),
      typeof event.data.endAt === "number" ? event.data.endAt : null,
    );
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
