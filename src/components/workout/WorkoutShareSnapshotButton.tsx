import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getWorkoutShareSnapshotData } from "../../domain/analytics/workoutShareSnapshotData";
import {
  WORKOUT_SNAPSHOT_HEIGHT,
  WORKOUT_SNAPSHOT_WIDTH,
} from "../../domain/analytics/workoutSnapshotDimensions";
import type { Exercise } from "../../domain/entities/Exercise";
import type { Workout } from "../../domain/entities/workout";
import { localDateString } from "../../shared";
import {
  captureElementAsJpeg,
  downloadBlob,
  getSnapshotPreviewHeight,
  getSnapshotPreviewScale,
  shareSnapshotFile,
} from "./captureWorkoutShareSnapshot";
import { WorkoutShareSnapshotCard } from "./WorkoutShareSnapshotCard";

type WorkoutShareSnapshotButtonProps = {
  workout: Workout;
  workouts: Workout[];
  exercises: Exercise[];
  unit: "KG" | "LB";
  appName?: string;
};

function snapshotFilename(workout: Workout): string {
  const date = localDateString(new Date(workout.startedAt));
  return `workout-snapshot-${date}.jpg`;
}

export function WorkoutShareSnapshotButton({
  workout,
  workouts,
  exercises,
  unit,
  appName,
}: WorkoutShareSnapshotButtonProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const previewScalerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<"share" | "save" | null>(null);
  const [previewHeight, setPreviewHeight] = useState(
    getSnapshotPreviewHeight(getSnapshotPreviewScale(360)),
  );

  const snapshotData = useMemo(
    () =>
      getWorkoutShareSnapshotData({
        workout,
        workouts,
        exercises,
        unit,
        appName,
      }),
    [workout, workouts, exercises, unit, appName],
  );

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!open) return;

    const scaler = previewScalerRef.current;
    const frame = frameRef.current;
    if (!scaler || !frame) return;

    function updatePreviewScale() {
      const width = scaler!.clientWidth || 360;
      const scale = getSnapshotPreviewScale(width);
      frame!.style.transform = `scale(${scale})`;
      frame!.style.transformOrigin = "top left";
      frame!.style.width = `${WORKOUT_SNAPSHOT_WIDTH}px`;
      frame!.style.height = `${WORKOUT_SNAPSHOT_HEIGHT}px`;
      setPreviewHeight(getSnapshotPreviewHeight(scale));
    }

    updatePreviewScale();

    const observer = new ResizeObserver(updatePreviewScale);
    observer.observe(scaler);
    return () => {
      observer.disconnect();
      frame.style.transform = "";
      frame.style.transformOrigin = "";
    };
  }, [open, snapshotData]);

  function closeModal() {
    setOpen(false);
    setBusyAction(null);
  }

  async function createSnapshotBlob() {
    const frame = frameRef.current;
    if (!frame) {
      throw new Error("Snapshot preview is not ready.");
    }

    const previousTransform = frame.style.transform;
    const previousOrigin = frame.style.transformOrigin;
    frame.style.transform = "none";
    frame.style.transformOrigin = "";

    try {
      return await captureElementAsJpeg(frame);
    } finally {
      frame.style.transform = previousTransform;
      frame.style.transformOrigin = previousOrigin;
    }
  }

  async function handleShare() {
    setBusyAction("share");
    setMessage("");

    try {
      const blob = await createSnapshotBlob();
      const filename = snapshotFilename(workout);
      const shared = await shareSnapshotFile(blob, filename);

      if (shared) {
        setMessage("Snapshot shared.");
        closeModal();
        return;
      }

      downloadBlob(blob, filename);
      setMessage("Snapshot saved — sharing images is not supported here.");
      closeModal();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage("Could not share snapshot.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSave() {
    setBusyAction("save");
    setMessage("");

    try {
      const blob = await createSnapshotBlob();
      downloadBlob(blob, snapshotFilename(workout));
      setMessage("Snapshot saved.");
      closeModal();
    } catch {
      setMessage("Could not save snapshot.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <div className="workout-share-snapshot">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMessage("");
            setOpen(true);
          }}
        >
          Share snapshot
        </button>
        {message && !open && (
          <p className="workout-share-snapshot-message">{message}</p>
        )}
      </div>

      {open &&
        createPortal(
          <div className="progression-popup-layer" role="presentation">
            <button
              type="button"
              className="progression-popup-backdrop"
              aria-label="Close workout snapshot dialog"
              onClick={closeModal}
            />
            <div
              className="progression-popup workout-share-snapshot-modal"
              role="dialog"
              aria-labelledby="workout-share-snapshot-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="progression-popup-close"
                aria-label="Close"
                onClick={closeModal}
              >
                ×
              </button>
              <h3 id="workout-share-snapshot-title">Workout snapshot</h3>
              <p className="progression-popup-subtitle">
                4:5 image sized for Instagram, Facebook, and X. Share it or save
                a copy on your device.
              </p>
              <div className="workout-share-snapshot-body">
                <div className="workout-share-snapshot-preview-wrap">
                  <div
                    ref={previewScalerRef}
                    className="workout-share-snapshot-preview-scaler"
                    style={{ height: previewHeight }}
                  >
                    <WorkoutShareSnapshotCard
                      ref={frameRef}
                      data={snapshotData}
                      unit={unit}
                    />
                  </div>
                </div>
              </div>
              <div className="workout-share-snapshot-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={busyAction !== null}
                  onClick={() => void handleShare()}
                >
                  {busyAction === "share" ? "Sharing…" : "Share"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={busyAction !== null}
                  onClick={() => void handleSave()}
                >
                  {busyAction === "save" ? "Saving…" : "Save locally"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
