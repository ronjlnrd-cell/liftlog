import type { Exercise } from "../domain/entities/Exercise";
import type { WorkoutTemplate } from "../domain/entities/Template";
import type { Workout } from "../domain/entities/workout";
import { estimated1RM, getWorkoutPRs, prLabel, setKey } from "../domain/analytics/personalRecords";
import { formatDate } from "../shared";
import { EmptyState } from "./components/EmptyState";

type HistoryPageProps = {
  workouts: Workout[];
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  unit: "KG" | "LB";
  onOpen: (workout: Workout) => void;
  onSaveTemplate: (workout: Workout) => void;
  onEdit: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
};

export function HistoryPage({
  workouts,
  exercises,
  templates,
  unit,
  onOpen,
  onSaveTemplate,
  onEdit,
  onDelete,
}: HistoryPageProps) {
  const prs = getWorkoutPRs(workouts);

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
          {workouts.map((workout) => {
            const workoutPRCount = workout.exercises.reduce(
              (count, item) =>
                count +
                item.completedSets.filter((set) =>
                  prs.has(setKey(workout.id, item.id, set.order)),
                ).length,
              0,
            );
            const sourceTemplate = workout.sourceTemplateId
              ? templates.find((template) => template.id === workout.sourceTemplateId)
              : null;

            return (
              <article
                className="card history-card history-card-clickable"
                key={workout.id}
                onClick={() => onOpen(workout)}
              >
                <div className="section-heading history-heading">
                  <div>
                    <strong>
                      {formatDate(workout.startedAt)}
                      {sourceTemplate && (
                        <span className="history-template-label">
                          {" "}
                          · {sourceTemplate.name}
                        </span>
                      )}
                    </strong>
                    <p>
                      {workout.exercises.reduce(
                        (sum, exercise) => sum + exercise.completedSets.length,
                        0,
                      )}{" "}
                      sets
                      {workoutPRCount > 0 && (
                        <span className="history-pr-count"> · 🏆 {workoutPRCount} PR{workoutPRCount === 1 ? "" : "s"}</span>
                      )}
                    </p>
                  </div>

                  <div className="header-actions history-actions">
                    {!workout.sourceTemplateId && (
                      <button className="text-button" onClick={(event) => { event.stopPropagation(); onSaveTemplate(workout); }}>
                        Save as template
                      </button>
                    )}
                    <button className="text-button" onClick={(event) => { event.stopPropagation(); onEdit(workout); }}>
                      Edit
                    </button>
                    <button className="danger-text" onClick={(event) => { event.stopPropagation(); onDelete(workout); }}>
                      Delete
                    </button>
                  </div>
                </div>

                {workout.exercises.map((item) => (
                  <div className="history-exercise" key={item.id}>
                    <strong>
                      {exercises.find((exercise) => exercise.id === item.exerciseId)?.name ?? "Exercise"}
                    </strong>
                    <div className="history-set-chips">
                      {item.completedSets.map((set) => {
                        const pr = prs.get(setKey(workout.id, item.id, set.order));
                        return (
                          <span className={pr ? "history-set-chip pr" : "history-set-chip"} key={set.order}>
                            {set.weight}×{set.reps}
                            {pr && (
                              <span className="pr-badge" title={prLabel(pr.types)}>
                                🏆 {pr.types.includes("estimated1RM")
                                  ? `${prLabel(pr.types)} · ${estimated1RM(set).toFixed(1)} ${unit.toLowerCase()}`
                                  : prLabel(pr.types)}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
