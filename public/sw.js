const REST_TIMER_TAG = "liftlog-rest-timer";
const REST_TIMER_COMPLETE_TAG = "liftlog-rest-timer-complete";
const NOTIFICATION_ICON = "/app-icon.svg";
const TIMER_CACHE = "liftlog-rest-timer-v1";
const TIMER_KEY = "/__rest-timer__";

/** @type {{ endAt: number, exerciseName?: string } | null} */
let activeTimer = null;
/** @type {number | null} */
let completionTimeoutId = null;
/** @type {number | null} */
let clientWatchIntervalId = null;
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

  if (completionTimeoutId != null) {
    clearTimeout(completionTimeoutId);
    completionTimeoutId = null;
  }

  activeTimer = null;
  void persistTimer(null);

  if (clearNotification) {
    void closeRestTimerNotifications();
  }
}

function scheduleCompletion(endAt) {
  if (completionTimeoutId != null) {
    clearTimeout(completionTimeoutId);
    completionTimeoutId = null;
  }

  const delay = endAt - Date.now();
  if (delay <= 0) {
    void completeRestTimer();
    return;
  }

  completionTimeoutId = setTimeout(() => {
    completionTimeoutId = null;
    if (activeTimer?.endAt === endAt) {
      void completeRestTimer();
    }
  }, delay);
}

function startRestTimer(endAt, exerciseName) {
  stopRestTimerInternal();

  activeTimer = { endAt, exerciseName };
  void persistTimer(activeTimer);
  startClientWatch();
  scheduleCompletion(endAt);
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
    startRestTimer(persisted.endAt, persisted.exerciseName);
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
    startRestTimer(endAt, exerciseName);
    return;
  }
  if (type === "REST_TIMER_SYNC") {
    if (!activeTimer || activeTimer.endAt !== endAt) {
      startRestTimer(endAt, exerciseName);
    }
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
