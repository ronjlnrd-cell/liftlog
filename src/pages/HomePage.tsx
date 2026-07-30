import type { WorkoutTemplate } from "../domain/entities/Template";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { formatDate, formatLabel } from "../shared";

type HomePageProps = {
  activeWorkout: Workout | null;
  exercises: Exercise[];
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
  exercises,
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
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const weeklyMuscleSets = new Map<string, number>();

  workouts
    .filter((workout) => workout.completedAt && new Date(workout.completedAt).getTime() >= sevenDaysAgo)
    .forEach((workout) => {
      workout.exercises.forEach((item) => {
        const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
        if (!exercise || exercise.primaryMuscle === "UNKNOWN") return;
        weeklyMuscleSets.set(
          exercise.primaryMuscle,
          (weeklyMuscleSets.get(exercise.primaryMuscle) ?? 0) + item.completedSets.length,
        );
      });
    });

  const muscleVolume = [...weeklyMuscleSets.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
  const maxMuscleSets = Math.max(1, ...muscleVolume.map((item) => item.sets));

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
          <div>
            <h2>Weekly muscle volume</h2>
            <p className="section-subtitle">Completed sets in the last 7 days</p>
          </div>
        </div>
        {muscleVolume.length === 0 ? (
          <p>No completed sets in the last 7 days.</p>
        ) : (
          <div className="muscle-volume-list">
            {muscleVolume.map(({ muscle, sets }) => (
              <div className="muscle-volume-row" key={muscle}>
                <div className="muscle-volume-label">
                  <strong>{formatLabel(muscle)}</strong>
                  <span>{sets} {sets === 1 ? "set" : "sets"}</span>
                </div>
                <div className="muscle-volume-track">
                  <div className="muscle-volume-fill" style={{ width: `${(sets / maxMuscleSets) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

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
