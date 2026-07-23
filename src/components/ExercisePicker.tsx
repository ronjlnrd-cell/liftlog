import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import { formatLabel } from "../shared";

type ExercisePickerProps = {
  exercises: Exercise[];
  excludedExerciseIds: string[];
  onSelect: (exerciseId: string) => void;
};

export function ExercisePicker({ exercises, excludedExerciseIds, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const availableExercises = useMemo(() => {
    const excluded = new Set(excludedExerciseIds);
    const normalizedQuery = query.trim().toLowerCase();

    return exercises
      .filter((exercise) => !excluded.has(exercise.id))
      .filter((exercise) =>
        !normalizedQuery ||
        exercise.name.toLowerCase().includes(normalizedQuery) ||
        formatLabel(exercise.primaryMuscle).toLowerCase().includes(normalizedQuery),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, excludedExerciseIds, query]);

  function selectExercise(exerciseId: string) {
    onSelect(exerciseId);
    setQuery("");
    setOpen(false);
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

          <div className="exercise-list">
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
    </div>
  );
}
