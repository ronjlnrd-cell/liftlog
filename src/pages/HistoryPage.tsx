import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { formatDate } from "../shared";
import { EmptyState } from "./components/EmptyState";

type HistoryPageProps = {
  workouts: Workout[];
  exercises: Exercise[];
  onSaveTemplate: (workout: Workout) => void;
};

export function HistoryPage({
  workouts,
  exercises,
  onSaveTemplate,
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
              <div className="section-heading">
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

                <button
                  className="text-button"
                  onClick={() => onSaveTemplate(workout)}
                >
                  Save as template
                </button>
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
