import { useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { ExercisePickerPanel } from "./ExercisePickerPanel";

type ExercisePickerProps = {
  exercises: Exercise[];
  excludedExerciseIds: string[];
  onSelect: (exerciseId: string) => void;
  workouts: Workout[];
  onExercisesChange?: () => Promise<void>;
};

export function ExercisePicker({
  exercises,
  excludedExerciseIds,
  onSelect,
  workouts,
  onExercisesChange,
}: ExercisePickerProps) {
  const [open, setOpen] = useState(false);

  function selectExercise(exerciseId: string) {
    onSelect(exerciseId);
    setOpen(false);
  }

  return (
    <div className="card form-card">
      <button
        className="primary"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Close exercise picker" : "Add exercise"}
      </button>

      {open && (
        <ExercisePickerPanel
          exercises={exercises}
          excludedExerciseIds={excludedExerciseIds}
          workouts={workouts}
          onSelect={selectExercise}
          onExercisesChange={onExercisesChange}
        />
      )}
    </div>
  );
}
