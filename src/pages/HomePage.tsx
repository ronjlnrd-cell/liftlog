import type { WorkoutTemplate } from "../domain/entities/Template";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { getWeeklyMuscleSetCounts } from "../domain/analytics/weeklyMuscleVolume";
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
  const weeklyMuscleSets = getWeeklyMuscleSetCounts(exercises, workouts, {
    activeWorkout,
  });

  const muscleVolume = [...weeklyMuscleSets.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort(
      (a, b) =>
        b.sets - a.sets ||
        formatLabel(a.muscle).localeCompare(formatLabel(b.muscle)),
    );
  const maxMuscleSets = Math.max(1, ...muscleVolume.map((item) => item.sets));
  const DAY = 86_400_000;
  const now = Date.now();
  const previousWeekStart = now - 14 * DAY;
  const previousWeekEnd = now - 7 * DAY;
  const lastWeekWorkouts = workouts.filter((workout) => {
    if (!workout.completedAt) return false;
    const time = new Date(workout.completedAt).getTime();
    return time >= previousWeekStart && time < previousWeekEnd;
  }).length;

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

        <article className="card">
          <span>Last week</span>
          <strong>{lastWeekWorkouts}</strong>
        </article>
      </div>

      <article className="card section-card">
        <div className="section-heading">
          <div>
            <h2>Weekly muscle volume</h2>
            <p className="section-subtitle">Completed sets in the last 7 days</p>
          </div>
        </div>
        <div className="muscle-volume-list">
          {muscleVolume.map(({ muscle, sets }) => (
            <div className="muscle-volume-row" key={muscle}>
              <div className="muscle-volume-label">
                <strong>{formatLabel(muscle)}</strong>
                <span>{sets} {sets === 1 ? "set" : "sets"}</span>
              </div>
              <div className="muscle-volume-track">
                <div
                  className="muscle-volume-fill"
                  style={{ width: sets === 0 ? "0%" : `${(sets / maxMuscleSets) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
