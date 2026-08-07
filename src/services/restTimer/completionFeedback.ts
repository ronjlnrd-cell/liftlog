import { REST_TIMER_STALE_FEEDBACK_MS } from "./types";

let audioContext: AudioContext | null = null;

export function shouldPlayCompletionFeedback(
  endAt: number,
  completedAt = Date.now(),
): boolean {
  if (completedAt < endAt) return false;
  return completedAt - endAt <= REST_TIMER_STALE_FEEDBACK_MS;
}

export function prepareCompletionAudio() {
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

export function playCompletionFeedback() {
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
