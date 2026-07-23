import type { WorkoutTemplate } from "../domain/entities/Template";
import type { Workout } from "../domain/entities/workout";
import { formatDate } from "../shared";

type HomePageProps = {
  activeWorkout: Workout | null;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onStart: () => void;
  onStartTemplate: (template: WorkoutTemplate) => void;
  onResume: () => void;
  onHistory: () => void;
  onTemplates: () => void;
};

export function HomePage({
  activeWorkout,
  workouts,
  templates,
  onStart,
  onStartTemplate,
  onResume,
  onHistory,
  onTemplates,
}: HomePageProps) {
  const last = workouts[0];
  const recentTemplates = templates.slice(0, 3);

  return (
    <section>
      <div className="hero-card">
        <p className="eyebrow">READY TO TRAIN?</p>
        <h1>
          {activeWorkout
            ? "Your workout is in progress"
            : "Build strength, one set at a time."}
        </h1>
        <p>Fast logging without distractions.</p>
        <button
          className="primary large"
          onClick={activeWorkout ? onResume : onStart}
        >
          {activeWorkout ? "Resume Workout" : "Start Empty Workout"}
        </button>
      </div>

      {!activeWorkout && recentTemplates.length > 0 && (
        <article className="card section-card">
          <div className="section-heading">
            <h2>Start from template</h2>
            <button className="text-button" onClick={onTemplates}>
              View all
            </button>
          </div>

          <div className="template-quick-list">
            {recentTemplates.map((template) => (
              <button
                key={template.id}
                className="template-quick-button"
                onClick={() => onStartTemplate(template)}
              >
                <strong>{template.name}</strong>
                <span>{template.exercises.length} exercises</span>
              </button>
            ))}
          </div>
        </article>
      )}

      <div className="stat-grid">
        <article className="card">
          <span>Total workouts</span>
          <strong>{workouts.length}</strong>
        </article>

        <article className="card">
          <span>This week</span>
          <strong>
            {
              workouts.filter(
                (workout) =>
                  Date.now() -
                    new Date(workout.startedAt).getTime() <
                  7 * 86_400_000,
              ).length
            }
          </strong>
        </article>
      </div>

      <article className="card section-card">
        <div className="section-heading">
          <h2>Last workout</h2>
          <button className="text-button" onClick={onHistory}>
            View history
          </button>
        </div>

        {last ? (
          <>
            <strong>{formatDate(last.startedAt)}</strong>
            <p>
              {last.exercises.length} exercises ·{" "}
              {last.exercises.reduce(
                (sum, exercise) =>
                  sum + exercise.completedSets.length,
                0,
              )}{" "}
              sets
            </p>
          </>
        ) : (
          <p>No completed workouts yet.</p>
        )}
      </article>
    </section>
  );
}
