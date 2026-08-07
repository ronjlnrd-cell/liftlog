const REST_TIMER_TAG = "liftlog-rest-timer";
const REST_TIMER_COMPLETE_TAG = "liftlog-rest-timer-complete";
const NOTIFICATION_ICON = "/app-icon.svg";
const TIMER_CACHE = "liftlog-rest-timer-v1";
const TIMER_KEY = "/__rest-timer__";
const STALE_COMPLETION_MS = 60_000;

/** @type {number | null} */
let tickTimeoutId = null;
/** @type {number | null} */
let completeTimeoutId = null;

function formatRestTime(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function remainingSeconds(endAt, now = Date.now()) {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

function msUntilNextSecondBoundary(endAt, now = Date.now()) {
  const secondsLeft = remainingSeconds(endAt, now);
  if (secondsLeft <= 0) return 0;

  const nextBoundary = endAt - (secondsLeft - 1) * 1000;
  return Math.max(0, nextBoundary - now);
}

function clearSchedules() {
  if (tickTimeoutId != null) {
    clearTimeout(tickTimeoutId);
    tickTimeoutId = null;
  }
  if (completeTimeoutId != null) {
    clearTimeout(completeTimeoutId);
    completeTimeoutId = null;
  }
}

async function loadPersistedTimer() {
  try {
    const cache = await caches.open(TIMER_CACHE);
    const response = await cache.match(TIMER_KEY);
    if (!response) return null;
    const parsed = await response.json();
    if (
      typeof parsed?.timerId !== "string" ||
      typeof parsed?.endAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function savePersistedTimer(timer) {
  const cache = await caches.open(TIMER_CACHE);
  if (!timer) {
    await cache.delete(TIMER_KEY);
    return;
  }
  await cache.put(TIMER_KEY, new Response(JSON.stringify(timer)));
}

async function closeRestTimerNotifications() {
  try {
    const notifications = await self.registration.getNotifications();
    notifications
      .filter((notification) => notification.tag === REST_TIMER_TAG)
      .forEach((notification) => notification.close());
  } catch {
    // ignore
  }
}

async function hasVisibleClient() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  return clients.some((client) => client.visibilityState === "visible");
}

async function showProgressNotification(state) {
  const secondsLeft = remainingSeconds(state.endAt);
  if (secondsLeft <= 0) return;

  const title = state.exerciseName
    ? `Rest · ${state.exerciseName}`
    : "Rest timer";

  await self.registration.showNotification(title, {
    body: `${formatRestTime(secondsLeft)} remaining`,
    tag: REST_TIMER_TAG,
    icon: NOTIFICATION_ICON,
    silent: true,
    renotify: true,
    timestamp: Date.now(),
    data: {
      timerId: state.timerId,
      endAt: state.endAt,
      exerciseName: state.exerciseName ?? null,
    },
  });
}

async function notifyClientsComplete(timerId, completedAt, endAt) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  clients.forEach((client) => {
    client.postMessage({
      type: "REST_TIMER_COMPLETE",
      timerId,
      completedAt,
      endAt,
    });
  });
}

async function completeTimer(state) {
  const current = await loadPersistedTimer();
  if (!current || current.timerId !== state.timerId) return;

  const completedAt = Date.now();
  clearSchedules();
  await savePersistedTimer(null);
  await closeRestTimerNotifications();

  const visibleClient = await hasVisibleClient();
  if (!visibleClient) {
    try {
      await self.registration.showNotification(
        state.exerciseName
          ? `Rest complete · ${state.exerciseName}`
          : "Rest complete",
        {
          body: "Time for your next set",
          tag: REST_TIMER_COMPLETE_TAG,
          icon: NOTIFICATION_ICON,
          silent: false,
          vibrate: [200, 100, 200, 100, 400],
        },
      );
    } catch {
      // Notification permission denied or unavailable.
    }
  }

  await notifyClientsComplete(state.timerId, completedAt, state.endAt);
}

async function runTimerCycle() {
  const state = await loadPersistedTimer();
  if (!state) {
    clearSchedules();
    await closeRestTimerNotifications();
    return;
  }

  const now = Date.now();
  if (now >= state.endAt) {
    if (now - state.endAt > STALE_COMPLETION_MS) {
      clearSchedules();
      await savePersistedTimer(null);
      await closeRestTimerNotifications();
      return;
    }

    await completeTimer(state);
    return;
  }

  if (await hasVisibleClient()) {
    await closeRestTimerNotifications();
  } else {
    try {
      await showProgressNotification(state);
    } catch {
      // Notification permission denied or unavailable.
    }
  }

  clearSchedules();

  completeTimeoutId = setTimeout(() => {
    void runTimerCycle();
  }, Math.max(0, state.endAt - now));

  tickTimeoutId = setTimeout(() => {
    void runTimerCycle();
  }, msUntilNextSecondBoundary(state.endAt, now));
}

async function persistAndRun(state) {
  await savePersistedTimer(state);
  clearSchedules();
  await runTimerCycle();
}

async function clearPersistedTimer(timerId) {
  const current = await loadPersistedTimer();
  if (current && current.timerId !== timerId) return;

  clearSchedules();
  await savePersistedTimer(null);
  await closeRestTimerNotifications();
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([self.clients.claim(), runTimerCycle()]),
  );
});

self.addEventListener("message", (event) => {
  const { type, timerId, endAt, exerciseName } = event.data ?? {};

  if (type === "REST_TIMER_START" || type === "REST_TIMER_SYNC") {
    event.waitUntil(
      persistAndRun({
        timerId,
        endAt,
        exerciseName,
      }),
    );
    return;
  }

  if (type === "REST_TIMER_STOP") {
    event.waitUntil(clearPersistedTimer(timerId));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(
    (async () => {
      if (event.notification.tag !== REST_TIMER_TAG) {
        event.notification.close();
      }

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })(),
  );
});
