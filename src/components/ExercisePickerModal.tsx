import { createPortal } from "react-dom";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { ExercisePickerPanel } from "./ExercisePickerPanel";

type ExercisePickerModalProps = {
  exercises: Exercise[];
  excludedExerciseIds: string[];
  workouts: Workout[];
  currentWorkout?: Workout | null;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
  onExercisesChange?: (createdExercise?: Exercise) => Promise<void>;
};

export function ExercisePickerModal({
  exercises,
  excludedExerciseIds,
  workouts,
  currentWorkout = null,
  onSelect,
  onClose,
  onExercisesChange,
}: ExercisePickerModalProps) {
  function handleSelect(exerciseId: string) {
    onSelect(exerciseId);
    onClose();
  }

  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close exercise picker"
        onClick={onClose}
      />
      <div
        className="progression-popup exercise-picker-modal"
        role="dialog"
        aria-labelledby="exercise-picker-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="progression-popup-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <h3 id="exercise-picker-title">Add exercise</h3>
        <ExercisePickerPanel
          exercises={exercises}
          excludedExerciseIds={excludedExerciseIds}
          workouts={workouts}
          currentWorkout={currentWorkout}
          onSelect={handleSelect}
          onExercisesChange={onExercisesChange}
        />
      </div>
    </div>,
    document.body,
  );
}
