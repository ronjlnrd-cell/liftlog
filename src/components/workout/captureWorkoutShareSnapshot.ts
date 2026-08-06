import { toJpeg } from "html-to-image";
import {
  WORKOUT_SNAPSHOT_HEIGHT,
  WORKOUT_SNAPSHOT_WIDTH,
} from "../../domain/analytics/workoutSnapshotDimensions";

function resetTransforms(frame: HTMLElement) {
  frame.style.transform = "";
  frame.style.transformOrigin = "";

  const card = frame.querySelector(".workout-snapshot-card") as HTMLElement | null;
  if (card) {
    card.style.transform = "";
    card.style.transformOrigin = "";
  }
}

function fitCardToFrame(frame: HTMLElement) {
  const card = frame.querySelector(".workout-snapshot-card") as HTMLElement | null;
  if (!card) return;

  const framePadding = 48;
  const watermarkReserve = 96;
  const availableHeight = WORKOUT_SNAPSHOT_HEIGHT - framePadding - watermarkReserve;
  const scale = Math.min(1, availableHeight / card.scrollHeight);

  if (scale < 1) {
    card.style.transform = `scale(${scale})`;
    card.style.transformOrigin = "top center";
  }
}

export async function captureElementAsJpeg(
  frame: HTMLElement,
): Promise<Blob> {
  resetTransforms(frame);
  fitCardToFrame(frame);

  try {
    const dataUrl = await toJpeg(frame, {
      quality: 0.92,
      pixelRatio: 1,
      width: WORKOUT_SNAPSHOT_WIDTH,
      height: WORKOUT_SNAPSHOT_HEIGHT,
      backgroundColor: "#fff7f7",
      cacheBust: true,
    });

    const response = await fetch(dataUrl);
    return response.blob();
  } finally {
    resetTransforms(frame);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareSnapshotFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/jpeg" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Workout snapshot",
    });
    return true;
  }

  return false;
}

export function getSnapshotPreviewScale(containerWidth: number): number {
  return containerWidth / WORKOUT_SNAPSHOT_WIDTH;
}

export function getSnapshotPreviewHeight(scale: number): number {
  return WORKOUT_SNAPSHOT_HEIGHT * scale;
}
