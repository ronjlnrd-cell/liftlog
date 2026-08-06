const REST_TIMER_TAG = "liftlog-rest-timer";
const REST_TIMER_COMPLETE_TAG = "liftlog-rest-timer-complete";
const NOTIFICATION_ICON = "/app-icon.svg";
const TIMER_CACHE = "liftlog-rest-timer-v1";
const TIMER_KEY = "/__rest-timer__";
const STALE_COMPLETION_MS = 60_000;

/** @type {{ endAt: number, exerciseName?: string } | null} */
let activeTimer = null;
/** @type {number | null} */
let tickTimeoutId = null;
/** @type {number} */
let restTimerEpoch = 0;
/** @type {boolean} */
let pageVisible = false;

function formatRestTime(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function cancelSleep() {
  if (tickTimeoutId != null) {
    clearTimeout(tickTimeoutId);
    tickTimeoutId = null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    tickTimeoutId = setTimeout(() => {
      tickTimeoutId = null;
      resolve();
    }, ms);
  });
}

async function persistTimer(timer) {
  const cache = await caches.open(TIMER_CACHE);
  if (timer) {
    await cache.put(TIMER_KEY, new Response(JSON.stringify(timer)));
    return;
  }
  await cache.delete(TIMER_KEY);
}

async function loadPersistedTimer() {
  try {
    const cache = await caches.open(TIMER_CACHE);
    const response = await cache.match(TIMER_KEY);
    if (!response) return null;
    return response.json();
  } catch {
    return null;
  }
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

async function updateRestTimerNotification() {
  if (!activeTimer || pageVisible) return;

  const epoch = restTimerEpoch;
  const secondsLeft = Math.max(
    0,
    Math.ceil((activeTimer.endAt - Date.now()) / 1000),
  );
  if (secondsLeft <= 0) return;
  if (epoch !== restTimerEpoch) return;

  const title = activeTimer.exerciseName
    ? `Rest · ${activeTimer.exerciseName}`
    : "Rest timer";

  await self.registration.showNotification(title, {
    body: `${formatRestTime(secondsLeft)} remaining`,
    tag: REST_TIMER_TAG,
    icon: NOTIFICATION_ICON,
    silent: true,
    renotify: true,
    timestamp: Date.now(),
    data: {
      endAt: activeTimer.endAt,
      exerciseName: activeTimer.exerciseName ?? null,
    },
  });

  if (epoch !== restTimerEpoch) {
    await closeRestTimerNotifications();
  }
}

async function notifyClientsComplete(completedAt, endAt) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  clients.forEach((client) => {
    client.postMessage({
      type: "REST_TIMER_COMPLETE",
      completedAt,
      endAt,
    });
  });
}

async function completeRestTimer() {
  const exerciseName = activeTimer?.exerciseName;
  const timerEndAt = activeTimer?.endAt ?? null;
  const completedAt = Date.now();
  stopRestTimerInternal(false);
  await closeRestTimerNotifications();

  const visibleClient = await hasVisibleClient();
  if (!visibleClient) {
    await self.registration.showNotification(
      exerciseName ? `Rest complete · ${exerciseName}` : "Rest complete",
      {
        body: "Time for your next set",
        tag: REST_TIMER_COMPLETE_TAG,
        icon: NOTIFICATION_ICON,
        silent: false,
        vibrate: [200, 100, 200, 100, 400],
      },
    );
  }

  await notifyClientsComplete(completedAt, timerEndAt);
}

function stopRestTimerInternal(clearNotification = true) {
  restTimerEpoch += 1;
  cancelSleep();

  activeTimer = null;
  void persistTimer(null);

  if (clearNotification) {
    void closeRestTimerNotifications();
  }
}

async function runRestTimer(endAt, exerciseName) {
  activeTimer = { endAt, exerciseName };
  await persistTimer(activeTimer);

  while (activeTimer && activeTimer.endAt === endAt) {
    const now = Date.now();
    if (now >= endAt) {
      await completeRestTimer();
      return;
    }

    if (!pageVisible) {
      await updateRestTimerNotification();
    } else {
      await closeRestTimerNotifications();
    }

    const secondsLeft = Math.ceil((endAt - now) / 1000);
    const nextSecondBoundary = endAt - (secondsLeft - 1) * 1000;
    const delay = Math.min(1000, Math.max(250, nextSecondBoundary - Date.now()));

    await sleep(delay);

    if (!activeTimer || activeTimer.endAt !== endAt) return;
  }
}

function startRestTimer(endAt, exerciseName) {
  if (
    activeTimer?.endAt === endAt &&
    activeTimer?.exerciseName === exerciseName
  ) {
    return Promise.resolve();
  }

  stopRestTimerInternal();
  return runRestTimer(endAt, exerciseName);
}

async function resumePersistedTimer() {
  const persisted = await loadPersistedTimer();
  if (!persisted?.endAt) return;

  if (persisted.endAt <= Date.now()) {
    if (Date.now() - persisted.endAt > STALE_COMPLETION_MS) {
      await persistTimer(null);
      return;
    }

    activeTimer = persisted;
    await completeRestTimer();
    return;
  }

  if (!activeTimer) {
    await runRestTimer(persisted.endAt, persisted.exerciseName);
  }
}

function setPageVisible(visible) {
  pageVisible = visible;
  if (visible) {
    void closeRestTimerNotifications();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([self.clients.claim(), resumePersistedTimer()]),
  );
});

self.addEventListener("message", (event) => {
  const { type, endAt, exerciseName, visible } = event.data ?? {};
  if (type === "REST_TIMER_START") {
    event.waitUntil(startRestTimer(endAt, exerciseName));
    return;
  }
  if (type === "REST_TIMER_SYNC") {
    if (!activeTimer || activeTimer.endAt !== endAt) {
      event.waitUntil(startRestTimer(endAt, exerciseName));
    }
    return;
  }
  if (type === "REST_TIMER_VISIBILITY") {
    setPageVisible(Boolean(visible));
    return;
  }
  if (type === "REST_TIMER_STOP") {
    stopRestTimerInternal();
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
