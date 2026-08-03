import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { MuscleGroup } from "../domain/types/MuscleGroup";
import { MovementPattern } from "../domain/types/MovementPattern";
import { LoadType } from "../domain/types/LoadType";
import { ExerciseSource } from "../domain/types/exercise-source";
import { exerciseRepository } from "../data/repositories/ExerciseRepository";
import { ExerciseIllustration } from "../components/ExerciseIllustration";
import { formatLabel } from "../shared";

type ExercisesPageProps = {
  exercises: Exercise[];
  workouts: Workout[];
  onRefresh: () => Promise<void>;
  onOpen: (exercise: Exercise) => void;
};

export function ExercisesPage({
  exercises,
  workouts,
  onRefresh,
  onOpen,
}: ExercisesPageProps) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [sortMode, setSortMode] = useState<"frequency" | "alphabetical">("frequency");

  const usageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const workout of workouts) {
      const performedInWorkout = new Set<string>();
      for (const item of workout.exercises) {
        if (item.completedSets.length > 0) performedInWorkout.add(item.exerciseId);
      }
      for (const exerciseId of performedInWorkout) {
        counts.set(exerciseId, (counts.get(exerciseId) ?? 0) + 1);
      }
    }
    return counts;
  }, [workouts]);

  const visible = useMemo(() => {
    const filtered = exercises.filter(
      (exercise) =>
        !exercise.archivedAt &&
        exercise.name.toLowerCase().includes(query.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      if (sortMode === "alphabetical") return a.name.localeCompare(b.name);
      const difference = (usageCounts.get(b.id) ?? 0) - (usageCounts.get(a.id) ?? 0);
      return difference || a.name.localeCompare(b.name);
    });
  }, [exercises, query, sortMode, usageCounts]);

  async function addExercise() {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (
      exercises.some(
        (exercise) =>
          exercise.name.toLowerCase() === trimmed.toLowerCase() &&
          !exercise.archivedAt,
      )
    ) {
      setError("An exercise with this name already exists.");
      return;
    }

    await exerciseRepository.add({
      id: crypto.randomUUID(),
      name: trimmed,
      primaryMuscle: MuscleGroup.UNKNOWN,
      movementPattern: MovementPattern.UNKNOWN,
      loadType: LoadType.UNKNOWN,
      defaultWeightIncrement: null,
      source: ExerciseSource.CUSTOM,
      archivedAt: null,
    });

    setName("");
    setError("");
    setShowAddCustom(false);
    await onRefresh();
  }

  return (
    <section>
      <div className="exercise-page-header">
        <h1 className="page-title">Exercises</h1>
        <button
          type="button"
          className="add-custom-button"
          onClick={() => setShowAddCustom((current) => !current)}
          aria-expanded={showAddCustom}
        >
          <span className="add-custom-icon" aria-hidden="true">
            +
          </span>
          Add custom
        </button>
      </div>

      <input
        className="search exercise-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search exercises…"
        autoFocus
      />
      <div className="exercise-sort-control" role="group" aria-label="Sort exercises">
        <button className={sortMode === "frequency" ? "active" : ""} onClick={() => setSortMode("frequency")}>Most used</button>
        <button className={sortMode === "alphabetical" ? "active" : ""} onClick={() => setSortMode("alphabetical")}>A–Z</button>
      </div>

      {showAddCustom && (
        <div className="card form-card add-custom-panel">
          <h2>Add custom exercise</h2>
          <div className="add-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Exercise name"
              onKeyDown={(event) => {
                if (event.key === "Enter") void addExercise();
              }}
            />
            <button className="primary" onClick={addExercise}>
              Add
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <div className="exercise-list">
        {visible.map((exercise) => (
          <article
            className="card exercise-row exercise-row-clickable"
            key={exercise.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(exercise)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(exercise);
              }
            }}
          >
            <div className="exercise-row-main">
              <ExerciseIllustration
                exerciseId={exercise.id}
                className="exercise-row-thumbnail"
              />
              <div>
                <strong>{exercise.name}</strong>
                <p>
                  {formatLabel(exercise.primaryMuscle)} ·{" "}
                  {formatLabel(exercise.loadType)}
                </p>
              </div>
            </div>

            <span className="exercise-usage-number" title={`${usageCounts.get(exercise.id) ?? 0} workouts performed`}>
              {usageCounts.get(exercise.id) ?? 0}
            </span>

            {exercise.source === ExerciseSource.CUSTOM && (
              <button
                className="danger-text"
                onClick={async (event) => {
                  event.stopPropagation();
                  await exerciseRepository.archive(exercise.id);
                  await onRefresh();
                }}
              >
                Archive
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
