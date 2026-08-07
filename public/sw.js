const REST_TIMER_COMPLETE_TAG = "liftlog-rest-timer-complete";
const NOTIFICATION_ICON = "/app-icon.svg";
const TIMER_CACHE = "liftlog-rest-timer-v1";
const TIMER_KEY = "/__rest-timer__";
const STALE_COMPLETION_MS = 60_000;

/** @type {number | null} */
let completeTimeoutId = null;

function clearCompletionSchedule() {
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

async function closeLegacyProgressNotifications() {
  try {
    const notifications = await self.registration.getNotifications();
    notifications
      .filter((notification) => notification.tag === "liftlog-rest-timer")
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
  clearCompletionSchedule();
  await savePersistedTimer(null);
  await closeLegacyProgressNotifications();

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

async function scheduleCompletion() {
  clearCompletionSchedule();
  await closeLegacyProgressNotifications();

  const state = await loadPersistedTimer();
  if (!state) return;

  const now = Date.now();
  if (now >= state.endAt) {
    if (now - state.endAt > STALE_COMPLETION_MS) {
      await savePersistedTimer(null);
      return;
    }

    await completeTimer(state);
    return;
  }

  completeTimeoutId = setTimeout(() => {
    void scheduleCompletion();
  }, Math.max(0, state.endAt - now));
}

async function persistAndSchedule(state) {
  await savePersistedTimer(state);
  await scheduleCompletion();
}

async function clearPersistedTimer(timerId) {
  const current = await loadPersistedTimer();
  if (current && current.timerId !== timerId) return;

  clearCompletionSchedule();
  await savePersistedTimer(null);
  await closeLegacyProgressNotifications();
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([self.clients.claim(), scheduleCompletion()]),
  );
});

self.addEventListener("message", (event) => {
  const { type, timerId, endAt, exerciseName } = event.data ?? {};

  if (type === "REST_TIMER_START" || type === "REST_TIMER_SYNC") {
    event.waitUntil(
      persistAndSchedule({
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
  event.notification.close();
  event.waitUntil(
    (async () => {
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
