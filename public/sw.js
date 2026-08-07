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
/** @type {number | null} */
let completeTimeoutId = null;
/** @type {number} */
let restTimerEpoch = 0;

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

async function showProgressNotification(secondsLeft, exerciseName) {
  const title = exerciseName ? `Rest · ${exerciseName}` : "Rest timer";

  await self.registration.showNotification(title, {
    body: `${formatRestTime(secondsLeft)} remaining`,
    tag: REST_TIMER_TAG,
    icon: NOTIFICATION_ICON,
    silent: true,
    renotify: true,
    timestamp: Date.now(),
    data: {
      endAt: activeTimer?.endAt ?? null,
      exerciseName: exerciseName ?? null,
    },
  });
}

async function refreshNotificationIfBackground() {
  if (!activeTimer) return;
  if (await hasVisibleClient()) {
    await closeRestTimerNotifications();
    return;
  }

  const secondsLeft = remainingSeconds(activeTimer.endAt);
  if (secondsLeft <= 0) return;

  try {
    await showProgressNotification(secondsLeft, activeTimer.exerciseName);
  } catch {
    // Notification permission denied or unavailable.
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
  if (!activeTimer) return;

  const exerciseName = activeTimer.exerciseName;
  const timerEndAt = activeTimer.endAt;
  const completedAt = Date.now();

  disarmTimer(false);
  await closeRestTimerNotifications();

  const visibleClient = await hasVisibleClient();
  if (!visibleClient) {
    try {
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
    } catch {
      // Notification permission denied or unavailable.
    }
  }

  await notifyClientsComplete(completedAt, timerEndAt);
}

function disarmTimer(clearNotification = true) {
  restTimerEpoch += 1;
  clearSchedules();
  activeTimer = null;
  void persistTimer(null);

  if (clearNotification) {
    void closeRestTimerNotifications();
  }
}

function scheduleTimerLoop() {
  clearSchedules();
  if (!activeTimer) return;

  const epoch = restTimerEpoch;
  const { endAt, exerciseName } = activeTimer;

  const runTick = async () => {
    if (!activeTimer || activeTimer.endAt !== endAt || epoch !== restTimerEpoch) {
      return;
    }

    if (Date.now() >= endAt) {
      await completeRestTimer();
      return;
    }

    await refreshNotificationIfBackground();

    if (!activeTimer || activeTimer.endAt !== endAt || epoch !== restTimerEpoch) {
      return;
    }

    tickTimeoutId = setTimeout(() => {
      void runTick();
    }, msUntilNextSecondBoundary(endAt));
  };

  completeTimeoutId = setTimeout(() => {
    void completeRestTimer();
  }, Math.max(0, endAt - Date.now()));

  void runTick();
}

function armTimer(endAt, exerciseName) {
  restTimerEpoch += 1;
  activeTimer = { endAt, exerciseName };
  void persistTimer(activeTimer);
  scheduleTimerLoop();
}

function replanTimer() {
  if (!activeTimer) return;
  scheduleTimerLoop();
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

  armTimer(persisted.endAt, persisted.exerciseName);
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
  const { type, endAt, exerciseName } = event.data ?? {};

  if (type === "REST_TIMER_START") {
    event.waitUntil(Promise.resolve().then(() => armTimer(endAt, exerciseName)));
    return;
  }

  if (type === "REST_TIMER_SYNC") {
    event.waitUntil(
      Promise.resolve().then(() => {
        if (
          !activeTimer ||
          activeTimer.endAt !== endAt ||
          activeTimer.exerciseName !== exerciseName
        ) {
          armTimer(endAt, exerciseName);
          return;
        }

        replanTimer();
      }),
    );
    return;
  }

  if (type === "REST_TIMER_STOP") {
    disarmTimer();
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
