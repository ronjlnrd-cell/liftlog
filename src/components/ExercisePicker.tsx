import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { createCustomExercise } from "../domain/exercises/createCustomExercise";
import { formatLabel } from "../shared";
import { AddCustomExerciseModal } from "./AddCustomExerciseModal";

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
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"frequency" | "az">("frequency");
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);

  const availableExercises = useMemo(() => {
    const excluded = new Set(excludedExerciseIds);
    const normalizedQuery = query.trim().toLowerCase();

    const frequency = new Map<string, number>();
    for (const workout of workouts ?? []) {
      const performedInWorkout = new Set<string>();
      for (const item of workout.exercises) {
        if (item.completedSets.length > 0) {
          performedInWorkout.add(item.exerciseId);
        }
      }
      for (const exerciseId of performedInWorkout) {
        frequency.set(exerciseId, (frequency.get(exerciseId) ?? 0) + 1);
      }
    }

    return exercises
      .filter((exercise) => !excluded.has(exercise.id))
      .filter((exercise) =>
        !normalizedQuery ||
        exercise.name.toLowerCase().includes(normalizedQuery) ||
        formatLabel(exercise.primaryMuscle).toLowerCase().includes(normalizedQuery),
      )
      .sort((a, b) => {
        if (sortMode === "az") return a.name.localeCompare(b.name);
        const difference = (frequency.get(b.id) ?? 0) - (frequency.get(a.id) ?? 0);
        return difference || a.name.localeCompare(b.name);
      });
  }, [exercises, excludedExerciseIds, query, sortMode, workouts]);

  function selectExercise(exerciseId: string) {
    onSelect(exerciseId);
    setQuery("");
    setOpen(false);
  }

  function openAddModal() {
    setAddError("");
    setShowAddModal(true);
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
    <div className="card form-card">
      <button className="primary" type="button" onClick={() => setOpen((current) => !current)}>
        {open ? "Close exercise picker" : "Add exercise"}
      </button>

      {open && (
        <>
          <input
            className="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by exercise or muscle…"
          />

          <div className="exercise-sort-control" role="group" aria-label="Sort exercises">
            <button type="button" className={sortMode === "frequency" ? "active" : ""} onClick={() => setSortMode("frequency")}>Most used</button>
            <button type="button" className={sortMode === "az" ? "active" : ""} onClick={() => setSortMode("az")}>A–Z</button>
          </div>

          <div className="exercise-list">
            <button
              className="card exercise-row exercise-row-add-new"
              type="button"
              onClick={openAddModal}
            >
              <div>
                <strong>Add new exercise</strong>
                <p>Create a custom exercise</p>
              </div>
              <span className="add-custom-icon" aria-hidden="true">+</span>
            </button>

            {availableExercises.slice(0, 30).map((exercise) => (
              <button
                className="card exercise-row"
                key={exercise.id}
                type="button"
                onClick={() => selectExercise(exercise.id)}
              >
                <div>
                  <strong>{exercise.name}</strong>
                  <p>{formatLabel(exercise.primaryMuscle)}</p>
                </div>
                <span>＋</span>
              </button>
            ))}

            {availableExercises.length === 0 && (
              <p className="muted-center">No matching exercises.</p>
            )}
          </div>
        </>
      )}

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
