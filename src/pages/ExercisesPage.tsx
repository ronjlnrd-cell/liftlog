import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import { MuscleGroup } from "../domain/types/MuscleGroup";
import { MovementPattern } from "../domain/types/MovementPattern";
import { LoadType } from "../domain/types/LoadType";
import { ExerciseSource } from "../domain/types/exercise-source";
import { exerciseRepository } from "../data/repositories/ExerciseRepository";
import { formatLabel } from "../shared";

type ExercisesPageProps = {
  exercises: Exercise[];
  onRefresh: () => Promise<void>;
};

export function ExercisesPage({
  exercises,
  onRefresh,
}: ExercisesPageProps) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const visible = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          !exercise.archivedAt &&
          exercise.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [exercises, query],
  );

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
    await onRefresh();
  }

  return (
    <section>
      <h1 className="page-title">Exercises</h1>

      <div className="card form-card">
        <h2>Add custom exercise</h2>
        <div className="add-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Exercise name"
          />
          <button className="primary" onClick={addExercise}>
            Add
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <input
        className="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search exercises…"
      />

      <div className="exercise-list">
        {visible.map((exercise) => (
          <article className="card exercise-row" key={exercise.id}>
            <div>
              <strong>{exercise.name}</strong>
              <p>
                {formatLabel(exercise.primaryMuscle)} ·{" "}
                {formatLabel(exercise.loadType)}
              </p>
            </div>

            {exercise.source === ExerciseSource.CUSTOM && (
              <button
                className="danger-text"
                onClick={async () => {
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
