const REST_TIMER_TAG = "liftlog-rest-timer";
const REST_TIMER_COMPLETE_TAG = "liftlog-rest-timer-complete";
const NOTIFICATION_ICON = "/app-icon.svg";
const TIMER_CACHE = "liftlog-rest-timer-v1";
const TIMER_KEY = "/__rest-timer__";

/** @type {{ endAt: number, exerciseName?: string } | null} */
let activeTimer = null;
/** @type {number | null} */
let updateIntervalId = null;
/** @type {number | null} */
let completionTimeoutId = null;
/** @type {number} */
let lastNotifiedSecond = -1;

function formatRestTime(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
  const notifications = await self.registration.getNotifications({
    tag: REST_TIMER_TAG,
  });
  notifications.forEach((notification) => notification.close());
}

async function updateRestTimerNotification() {
  if (!activeTimer) return;

  const secondsLeft = Math.max(
    0,
    Math.ceil((activeTimer.endAt - Date.now()) / 1000),
  );
  if (secondsLeft <= 0) return;
  if (secondsLeft === lastNotifiedSecond) return;
  lastNotifiedSecond = secondsLeft;

  const title = activeTimer.exerciseName
    ? `Rest · ${activeTimer.exerciseName}`
    : "Rest timer";

  await self.registration.showNotification(title, {
    body: `${formatRestTime(secondsLeft)} remaining`,
    tag: REST_TIMER_TAG,
    icon: NOTIFICATION_ICON,
    silent: true,
  });
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

  await notifyClientsComplete();
}

function stopRestTimerInternal(clearNotification = true) {
  if (updateIntervalId != null) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
  }
  if (completionTimeoutId != null) {
    clearTimeout(completionTimeoutId);
    completionTimeoutId = null;
  }

  activeTimer = null;
  lastNotifiedSecond = -1;
  void persistTimer(null);

  if (clearNotification) {
    void closeRestTimerNotifications();
  }
}

function startRestTimer(endAt, exerciseName) {
  stopRestTimerInternal();

  activeTimer = { endAt, exerciseName };
  void persistTimer(activeTimer);
  void updateRestTimerNotification();

  updateIntervalId = setInterval(() => {
    const secondsLeft = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    if (secondsLeft <= 0) {
      void completeRestTimer();
      return;
    }
    void updateRestTimerNotification();
  }, 1000);

  const delay = endAt - Date.now();
  if (delay <= 0) {
    void completeRestTimer();
    return;
  }

  completionTimeoutId = setTimeout(() => {
    void completeRestTimer();
  }, delay);
}

async function resumePersistedTimer() {
  const persisted = await loadPersistedTimer();
  if (!persisted?.endAt) return;

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
  if (type === "REST_TIMER_STOP") {
    stopRestTimerInternal();
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      }),
  );
});
