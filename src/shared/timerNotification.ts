let audioContext: AudioContext | null = null;

const REST_TIMER_TAG = "liftlog-rest-timer";
let restTimerNotification: Notification | null = null;
let lastNotifiedSecond = -1;

export function prepareTimerNotification() {
  if (typeof window === "undefined") return;

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

function formatRestTime(secondsLeft: number): string {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function updateRestTimerNotification(
  secondsLeft: number,
  exerciseName?: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if (secondsLeft <= 0) {
    clearRestTimerNotification();
    return;
  }

  if (secondsLeft === lastNotifiedSecond) return;
  lastNotifiedSecond = secondsLeft;

  const title = exerciseName ? `Rest · ${exerciseName}` : "Rest timer";
  const body = `${formatRestTime(secondsLeft)} remaining`;

  try {
    restTimerNotification?.close();
    restTimerNotification = new Notification(title, {
      body,
      tag: REST_TIMER_TAG,
      silent: true,
    });
  } catch {
    // Notifications unavailable in this context.
  }
}

export function clearRestTimerNotification() {
  lastNotifiedSecond = -1;

  try {
    restTimerNotification?.close();
  } catch {
    // ignore
  }

  restTimerNotification = null;
}

export function notifyTimerComplete() {
  clearRestTimerNotification();

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
