import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import {
  compareExercisesByUsage,
  getExerciseUsageCounts,
} from "../domain/analytics/exerciseUsage";
import { createCustomExercise } from "../domain/exercises/createCustomExercise";
import { formatLabel } from "../shared";
import { matchesExerciseSearch } from "../shared/exerciseSearch";
import { AddCustomExerciseModal } from "./AddCustomExerciseModal";
import { ExerciseIllustration } from "./ExerciseIllustration";

type ExercisePickerPanelProps = {
  exercises: Exercise[];
  excludedExerciseIds: string[];
  onSelect: (exerciseId: string) => void;
  workouts: Workout[];
  currentWorkout?: Workout | null;
  onExercisesChange?: () => Promise<void>;
};

export function ExercisePickerPanel({
  exercises,
  excludedExerciseIds,
  onSelect,
  workouts,
  currentWorkout = null,
  onExercisesChange,
}: ExercisePickerPanelProps) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"frequency" | "az">("frequency");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);

  const usageCounts = useMemo(
    () =>
      getExerciseUsageCounts(workouts, {
        extraWorkouts: currentWorkout ? [currentWorkout] : undefined,
      }),
    [workouts, currentWorkout],
  );

  const availableExercises = useMemo(() => {
    const excluded = new Set(excludedExerciseIds);

    return exercises
      .filter((exercise) => !excluded.has(exercise.id))
      .filter((exercise) =>
        matchesExerciseSearch(
          query,
          exercise.name,
          formatLabel(exercise.primaryMuscle),
        ),
      )
      .sort((a, b) => compareExercisesByUsage(a, b, usageCounts, sortMode));
  }, [exercises, excludedExerciseIds, query, sortMode, usageCounts]);

  function selectExercise(exerciseId: string) {
    onSelect(exerciseId);
    setQuery("");
  }

  async function handleCreateExercise(name: string) {
    setAddingExercise(true);
    setAddError("");

    const result = await createCustomExercise(name, exercises);
    if (!result.ok) {
      setAddError(result.error);
      setAddingExercise(false);
      return;
    }

    await onExercisesChange?.();
    setAddingExercise(false);
    setShowAddModal(false);
    selectExercise(result.exercise.id);
  }

  return (
    <div className="exercise-picker-panel">
      <input
        className="search"
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by exercise or muscle…"
      />

      <div
        className="exercise-sort-control"
        role="group"
        aria-label="Sort exercises"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={sortMode === "frequency" ? "active" : ""}
          onClick={() => setSortMode("frequency")}
        >
          Most used
        </button>
        <button
          type="button"
          className={sortMode === "az" ? "active" : ""}
          onClick={() => setSortMode("az")}
        >
          A–Z
        </button>
      </div>

      <div className="exercise-list exercise-picker-modal-list">
        <button
          className="card exercise-row exercise-row-add-new"
          type="button"
          onClick={() => {
            setAddError("");
            setShowAddModal(true);
          }}
        >
          <div>
            <strong>Add new exercise</strong>
            <p>Create a custom exercise</p>
          </div>
          <span className="add-custom-icon" aria-hidden="true">
            +
          </span>
        </button>

        {availableExercises.slice(0, 30).map((exercise) => (
          <button
            className="card exercise-row exercise-picker-row"
            key={exercise.id}
            type="button"
            onClick={() => selectExercise(exercise.id)}
          >
            <div className="exercise-row-main">
              <ExerciseIllustration
                exerciseId={exercise.id}
                className="exercise-row-thumbnail"
              />
              <div>
                <strong>{exercise.name}</strong>
                <p>{formatLabel(exercise.primaryMuscle)}</p>
              </div>
            </div>

            {sortMode === "frequency" && (
              <span
                className="exercise-picker-usage"
                title={`${usageCounts.get(exercise.id) ?? 0} workouts performed`}
              >
                {usageCounts.get(exercise.id) ?? 0}
              </span>
            )}

            <span className="exercise-picker-add-icon" aria-hidden="true">
              ＋
            </span>
          </button>
        ))}

        {availableExercises.length === 0 && (
          <p className="muted-center">No matching exercises.</p>
        )}
      </div>

      {showAddModal && (
        <AddCustomExerciseModal
          error={addError}
          saving={addingExercise}
          onClose={() => {
            if (addingExercise) return;
            setShowAddModal(false);
            setAddError("");
          }}
          onConfirm={handleCreateExercise}
        />
      )}
    </div>
  );
}
