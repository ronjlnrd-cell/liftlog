import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { formatDate } from "../shared";
import { EmptyState } from "./components/EmptyState";

type HistoryPageProps = {
  workouts: Workout[];
  exercises: Exercise[];
  onSaveTemplate: (workout: Workout) => void;
  onEdit: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
};

export function HistoryPage({
  workouts,
  exercises,
  onSaveTemplate,
  onEdit,
  onDelete,
}: HistoryPageProps) {
  return (
    <section>
      <h1 className="page-title">History</h1>

      {workouts.length === 0 ? (
        <EmptyState
          title="No workout history"
          text="Your completed workouts will appear here."
        />
      ) : (
        <div className="stack">
          {workouts.map((workout) => (
            <article className="card history-card" key={workout.id}>
              <div className="section-heading history-heading">
                <div>
                  <strong>{formatDate(workout.startedAt)}</strong>
                  <p>
                    {workout.exercises.reduce(
                      (sum, exercise) =>
                        sum + exercise.completedSets.length,
                      0,
                    )}{" "}
                    sets
                  </p>
                </div>

                <div className="header-actions history-actions">
                  <button
                    className="text-button"
                    onClick={() => onSaveTemplate(workout)}
                  >
                    Save as template
                  </button>
                  <button
                    className="text-button"
                    onClick={() => onEdit(workout)}
                  >
                    Edit
                  </button>
                  <button
                    className="danger-text"
                    onClick={() => onDelete(workout)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {workout.exercises.map((item) => (
                <p key={item.id}>
                  {exercises.find(
                    (exercise) => exercise.id === item.exerciseId,
                  )?.name ?? "Exercise"}
                  :{" "}
                  {item.completedSets
                    .map((set) => `${set.weight}×${set.reps}`)
                    .join(", ")}
                </p>
              ))}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
