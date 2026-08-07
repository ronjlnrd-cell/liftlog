export {
  shouldPlayCompletionFeedback,
  prepareCompletionAudio as prepareTimerNotification,
  playCompletionFeedback as notifyTimerComplete,
} from "./services/restTimer/completionFeedback";
export {
  REST_TIMER_STALE_FEEDBACK_MS,
  REST_TIMER_MESSAGE,
} from "./services/restTimer/types";
export {
  registerTimerServiceWorker,
  ensureNotificationPermission,
  clearRestTimerNotification,
  startBackgroundRestTimer,
  syncBackgroundRestTimer,
  stopBackgroundRestTimer,
  subscribeToRestTimerComplete,
} from "./services/restTimer/swBridge";
export { restTimerService } from "./services/restTimer/RestTimerService";
