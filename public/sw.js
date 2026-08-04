const REST_TIMER_TAG = "liftlog-rest-timer";
const REST_TIMER_COMPLETE_TAG = "liftlog-rest-timer-complete";
const NOTIFICATION_ICON = "/app-icon.svg";
const TIMER_CACHE = "liftlog-rest-timer-v1";
const TIMER_KEY = "/__rest-timer__";

/** @type {{ endAt: number, exerciseName?: string } | null} */
let activeTimer = null;
/** @type {number | null} */
let tickTimeoutId = null;
/** @type {number | null} */
let clientWatchIntervalId = null;
/** @type {(() => void) | null} */
let sleepResolve = null;
/** @type {number} */
let restTimerEpoch = 0;

async function hasWindowClients() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  return clients.length > 0;
}

function stopClientWatch() {
  if (clientWatchIntervalId != null) {
    clearInterval(clientWatchIntervalId);
    clientWatchIntervalId = null;
  }
}

function startClientWatch() {
  stopClientWatch();

  clientWatchIntervalId = setInterval(() => {
    void (async () => {
      if (!activeTimer) return;
      if (await hasWindowClients()) return;
      stopRestTimerInternal();
    })();
  }, 1000);
}

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
  if (sleepResolve) {
    sleepResolve();
    sleepResolve = null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    sleepResolve = resolve;
    tickTimeoutId = setTimeout(() => {
      tickTimeoutId = null;
      sleepResolve = null;
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

async function updateRestTimerNotification() {
  if (!activeTimer) return;

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

async function notifyClientsComplete() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  clients.forEach((client) => {
    client.postMessage({ type: "REST_TIMER_COMPLETE" });
  });
}

async function completeRestTimer() {
  const exerciseName = activeTimer?.exerciseName;
  stopRestTimerInternal(false);
  await closeRestTimerNotifications();

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

  await closeRestTimerNotifications();
  await notifyClientsComplete();
}

function stopRestTimerInternal(clearNotification = true) {
  restTimerEpoch += 1;
  stopClientWatch();
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
  startClientWatch();

  while (activeTimer && activeTimer.endAt === endAt) {
    const now = Date.now();
    if (now >= endAt) {
      await completeRestTimer();
      return;
    }

    await updateRestTimerNotification();

    const secondsLeft = Math.ceil((endAt - now) / 1000);
    const nextSecondBoundary = endAt - (secondsLeft - 1) * 1000;
    const delay = Math.min(1000, Math.max(250, nextSecondBoundary - Date.now()));

    await sleep(delay);

    if (!activeTimer || activeTimer.endAt !== endAt) return;
  }
}

function startRestTimer(endAt, exerciseName) {
  stopRestTimerInternal();
  return runRestTimer(endAt, exerciseName);
}

async function resumePersistedTimer() {
  const persisted = await loadPersistedTimer();
  if (!persisted?.endAt) return;

  const clientsOpen = await hasWindowClients();

  if (!clientsOpen) {
    await persistTimer(null);
    await closeRestTimerNotifications();
    return;
  }

  if (persisted.endAt <= Date.now()) {
    activeTimer = persisted;
    await completeRestTimer();
    return;
  }

  if (!activeTimer) {
    await runRestTimer(persisted.endAt, persisted.exerciseName);
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
  const { type, endAt, exerciseName } = event.data ?? {};
  if (type === "REST_TIMER_START") {
    event.waitUntil(startRestTimer(endAt, exerciseName));
    return;
  }
  if (type === "REST_TIMER_SYNC") {
    if (!activeTimer || activeTimer.endAt !== endAt) {
      event.waitUntil(startRestTimer(endAt, exerciseName));
      return;
    }
    event.waitUntil(updateRestTimerNotification());
    return;
  }
  if (type === "REST_TIMER_STOP") {
    stopRestTimerInternal();
  }
});

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(
    (async () => {
      if (event.notification.tag === REST_TIMER_TAG) {
        const endAt = event.notification.data?.endAt;
        const exerciseName = event.notification.data?.exerciseName ?? undefined;
        if (typeof endAt === "number" && endAt > Date.now()) {
          activeTimer = { endAt, exerciseName };
          await updateRestTimerNotification();
        } else {
          event.notification.close();
        }
      } else {
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
