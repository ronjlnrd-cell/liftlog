import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import {
  estimated1RM,
  getWorkoutPRs,
  prLabel,
  setKey,
} from "../domain/analytics/personalRecords";
import { formatDate } from "../shared";
import { getProgressionRecommendation } from "../domain/analytics/progression";

type WorkoutSummaryPageProps = {
  workout: Workout;
  workouts: Workout[];
  exercises: Exercise[];
  unit: "KG" | "LB";
  onDone: () => void;
  onSaveTemplate: () => void;
};

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "—";

  const totalMinutes = Math.max(
    0,
    Math.round(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) /
        60_000,
    ),
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function WorkoutSummaryPage({
  workout,
  workouts,
  exercises,
  unit,
  onDone,
  onSaveTemplate,
}: WorkoutSummaryPageProps) {
  const allPRs = getWorkoutPRs(workouts);
  const workoutPRs = [...allPRs.values()].filter(
    (record) => record.workoutId === workout.id,
  );

  const totalSets = workout.exercises.reduce(
    (sum, item) => sum + item.completedSets.length,
    0,
  );

  const volume = workout.exercises.reduce(
    (workoutTotal, item) =>
      workoutTotal +
      item.completedSets.reduce(
        (exerciseTotal, set) => exerciseTotal + set.weight * set.reps,
        0,
      ),
    0,
  );

  return (
    <section className="workout-summary-page">
      <div className="summary-hero">
        <p className="eyebrow">WORKOUT COMPLETE</p>
        <h1>Nice work.</h1>
        <p>{formatDate(workout.startedAt)}</p>
      </div>

      <div className="summary-stats">
        <article className="card">
          <span>Duration</span>
          <strong>
            {formatDuration(workout.startedAt, workout.completedAt)}
          </strong>
        </article>
        <article className="card">
          <span>Sets</span>
          <strong>{totalSets}</strong>
        </article>
        <article className="card">
          <span>Volume</span>
          <strong>
            {Math.round(volume).toLocaleString()} {unit.toLowerCase()}
          </strong>
        </article>
      </div>

      {workoutPRs.length > 0 && (
        <article className="card summary-section">
          <h2>Personal records</h2>
          <div className="summary-pr-list">
            {workout.exercises.flatMap((item) =>
              item.completedSets.flatMap((set) => {
                const record = allPRs.get(
                  setKey(workout.id, item.id, set.order),
                );
                if (!record) return [];

                const exercise = exercises.find(
                  (candidate) => candidate.id === item.exerciseId,
                );
                const shows1RM = record.types.includes("estimated1RM");

                return [
                  <div
                    className="summary-pr"
                    key={`${item.id}-${set.order}`}
                  >
                    <span>🏆</span>
                    <div>
                      <strong>{exercise?.name ?? "Exercise"}</strong>
                      <p>
                        {prLabel(record.types)}
                        {shows1RM
                          ? ` · ${estimated1RM(set).toFixed(1)} ${unit.toLowerCase()}`
                          : ""}
                      </p>
                    </div>
                  </div>,
                ];
              }),
            )}
          </div>
        </article>
      )}

      <article className="card summary-section">
        <h2>Exercises</h2>
        <div className="summary-exercises">
          {workout.exercises.map((item) => {
            const exercise = exercises.find(
              (candidate) => candidate.id === item.exerciseId,
            );
            const recommendation = exercise
              ? getProgressionRecommendation(item, exercise)
              : null;

            return (
              <div className="summary-exercise" key={item.id}>
                <div>
                  <strong>{exercise?.name ?? "Exercise"}</strong>
                  <span>{item.completedSets.length} sets</span>
                </div>
                <p>
                  {item.completedSets
                    .map(
                      (set) =>
                        `${set.weight} ${unit.toLowerCase()} × ${set.reps}`,
                    )
                    .join("  ·  ")}
                </p>

                {recommendation && (
                  <div className="progression-recommendation">
                    <strong className="progression-title">
                      Choose one progression
                    </strong>
                    <div className="progression-options">
                      {recommendation.options.map((option, index) => (
                        <div key={option.label}>
                          {index > 0 && <div className="progression-or">or</div>}
                          <div className="progression-option">
                            <span>•</span>
                            <div>
                              <strong>{option.label}</strong>
                              <p>
                                {option.detail} {unit.toLowerCase()}
                                {option.recommended && (
                                  <em> · Recommended</em>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </article>

      <div className="summary-actions">
        <button className="text-button" onClick={onSaveTemplate}>
          Save as template
        </button>
        <button className="primary" onClick={onDone}>
          Done
        </button>
      </div>
    </section>
  );
}
