import { useEffect, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";

type HistoryWorkoutEditorPageProps = {
  workout: Workout | null;
  exercises: Exercise[];
  onCancel: () => void;
  onSave: (workout: Workout) => Promise<void>;
};

function cloneWorkout(workout: Workout): Workout {
  return {
    ...workout,
    startedAt: new Date(workout.startedAt),
    completedAt: workout.completedAt ? new Date(workout.completedAt) : null,
    exercises: workout.exercises.map((item) => ({
      ...item,
      plannedSets: item.plannedSets.map((set) => ({ ...set })),
      completedSets: item.completedSets.map((set) => ({ ...set })),
    })),
  };
}

function toLocalDateTimeInput(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function HistoryWorkoutEditorPage({
  workout,
  exercises,
  onCancel,
  onSave,
}: HistoryWorkoutEditorPageProps) {
  const [draft, setDraft] = useState<Workout | null>(
    workout ? cloneWorkout(workout) : null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(workout ? cloneWorkout(workout) : null);
  }, [workout]);

  if (!draft) {
    return (
      <section>
        <h1 className="page-title">Edit Workout</h1>
        <div className="empty card">
          <h2>Workout not found</h2>
          <p>It may have already been deleted.</p>
          <button className="primary" onClick={onCancel}>
            Back to History
          </button>
        </div>
      </section>
    );
  }

  const setCount = draft.exercises.reduce(
    (sum, item) => sum + item.completedSets.length,
    0,
  );

  function updateSet(
    workoutExerciseId: string,
    setOrder: number,
    field: "weight" | "reps",
    value: number,
  ) {
    if (value < 0 || (field === "reps" && value < 1)) return;

    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item) =>
              item.id === workoutExerciseId
                ? {
                    ...item,
                    completedSets: item.completedSets.map((set) =>
                      set.order === setOrder ? { ...set, [field]: value } : set,
                    ),
                  }
                : item,
            ),
          }
        : current,
    );
  }

  function deleteSet(workoutExerciseId: string, setOrder: number) {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises
              .map((item) =>
                item.id === workoutExerciseId
                  ? {
                      ...item,
                      completedSets: item.completedSets
                        .filter((set) => set.order !== setOrder)
                        .map((set, index) => ({ ...set, order: index })),
                    }
                  : item,
              )
              .filter((item) => item.completedSets.length > 0)
              .map((item, index) => ({ ...item, order: index })),
          }
        : current,
    );
  }

  function deleteExercise(workoutExerciseId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises
              .filter((item) => item.id !== workoutExerciseId)
              .map((item, index) => ({ ...item, order: index })),
          }
        : current,
    );
  }

  async function save() {
    if (saving || setCount === 0) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="section-heading history-editor-heading">
        <div>
          <p className="eyebrow">WORKOUT HISTORY</p>
          <h1 className="page-title">Edit Workout</h1>
        </div>
        <div className="header-actions">
          <button className="text-button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={save}
            disabled={saving || setCount === 0}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <article className="card history-editor-details">
        <label>
          Workout date and time
          <input
            type="datetime-local"
            value={toLocalDateTimeInput(draft.startedAt)}
            onChange={(event) => {
              const nextDate = new Date(event.target.value);
              if (!Number.isNaN(nextDate.getTime())) {
                setDraft({ ...draft, startedAt: nextDate });
              }
            }}
          />
        </label>
        <label>
          Bodyweight
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="Not recorded"
            value={draft.bodyweight ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                bodyweight:
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
              })
            }
          />
        </label>
      </article>

      <div className="stack">
        {draft.exercises.map((item) => {
          const exercise = exercises.find(
            (candidate) => candidate.id === item.exerciseId,
          );

          return (
            <article className="card history-editor-exercise" key={item.id}>
              <div className="section-heading">
                <div>
                  <h2>{exercise?.name ?? "Exercise"}</h2>
                  <p>{item.completedSets.length} sets</p>
                </div>
                <button
                  className="danger-text"
                  onClick={() => deleteExercise(item.id)}
                >
                  Remove exercise
                </button>
              </div>

              <div className="history-set-list">
                {item.completedSets.map((set, index) => (
                  <div className="history-set-row" key={set.order}>
                    <strong>Set {index + 1}</strong>
                    <label>
                      Weight
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={set.weight}
                        onChange={(event) =>
                          updateSet(
                            item.id,
                            set.order,
                            "weight",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      Reps
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={set.reps}
                        onChange={(event) =>
                          updateSet(
                            item.id,
                            set.order,
                            "reps",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <button
                      className="icon-button"
                      aria-label={`Delete set ${index + 1}`}
                      title="Delete set"
                      onClick={() => deleteSet(item.id, set.order)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {setCount === 0 && (
        <p className="error history-editor-warning">
          A saved workout must contain at least one completed set.
        </p>
      )}
    </section>
  );
}
