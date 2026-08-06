import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import type { WorkoutTemplate } from "../domain/entities/Template";
import { ExerciseSource } from "../domain/types/exercise-source";
import { estimated1RM } from "../domain/analytics/personalRecords";
import { getStrengthLevel, hasStrengthStandard } from "../domain/analytics/strengthStandards";
import { updateCustomExercise } from "../domain/exercises/updateCustomExercise";
import type { EditCustomExerciseInput } from "../components/EditCustomExerciseModal";
import { EditCustomExerciseModal } from "../components/EditCustomExerciseModal";
import { formatDate as formatWorkoutDate, formatLabel } from "../shared";
import { getCoachingWorkoutTemplateContext } from "../domain/coaching/coachingTemplateContext";

type ExerciseDetailsPageProps = {
  exercise: Exercise | null;
  exercises: Exercise[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  unit: "KG" | "LB";
  gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  onBack: () => void;
  onRefresh: (updatedExercise?: Exercise) => Promise<void>;
};

type ProgressPoint = {
  workoutId: string;
  date: Date;
  value: number;
};

type BestSet = {
  weight: number;
  reps: number;
  estimated1RM: number;
  bodyweight: number | null;
  date: Date;
};

type HistoryRow = {
  workoutId: string;
  date: Date;
  workoutLabel: string;
  parameters: string;
};

export function ExerciseDetailsPage({
  exercise,
  exercises,
  workouts,
  templates,
  unit,
  gender,
  onBack,
  onRefresh,
}: ExerciseDetailsPageProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const stats = useMemo(() => {
    if (!exercise) return null;

    let bestSet: BestSet | null = null;
    let heaviestWeight = 0;
    let lastPerformed: Date | null = null;
    const progress: ProgressPoint[] = [];

    const chronological = [...workouts].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

    for (const workout of chronological) {
      let workoutBest = 0;
      let performed = false;

      for (const item of workout.exercises) {
        if (item.exerciseId !== exercise.id || item.completedSets.length === 0) {
          continue;
        }

        performed = true;
        for (const set of item.completedSets) {
          const e1rm = estimated1RM(set);
          workoutBest = Math.max(workoutBest, e1rm);
          heaviestWeight = Math.max(heaviestWeight, set.weight);

          if (!bestSet || e1rm > bestSet.estimated1RM) {
            bestSet = {
              weight: set.weight,
              reps: set.reps,
              estimated1RM: e1rm,
              bodyweight: workout.bodyweight,
              date: new Date(workout.startedAt),
            };
          }
        }
      }

      if (performed) {
        const date = new Date(workout.startedAt);
        if (!lastPerformed || date.getTime() > lastPerformed.getTime()) {
          lastPerformed = date;
        }
        progress.push({ workoutId: workout.id, date, value: workoutBest });
      }
    }

    return { bestSet, heaviestWeight, lastPerformed, progress };
  }, [exercise, workouts]);

  const historyRows = useMemo(() => {
    if (!exercise) return [];

    const rows: HistoryRow[] = [];

    for (const workout of workouts) {
      const item = workout.exercises.find(
        (candidate) =>
          candidate.exerciseId === exercise.id &&
          candidate.completedSets.length > 0,
      );
      if (!item) continue;

      const weight = Math.max(...item.completedSets.map((set) => set.weight));
      const reps = Math.min(...item.completedSets.map((set) => set.reps));
      const sets = item.completedSets.length;
      const { workoutLabel } = getCoachingWorkoutTemplateContext(
        workout.id,
        workouts,
        templates,
      );

      rows.push({
        workoutId: workout.id,
        date: new Date(workout.completedAt ?? workout.startedAt),
        workoutLabel,
        parameters: `${formatWeight(weight)}×${reps}×${sets}`,
      });
    }

    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [exercise, workouts, templates]);

  if (!exercise) {
    return (
      <section>
        <button className="text-button" onClick={onBack}>← Exercises</button>
        <div className="card empty">
          <h2>Exercise not found</h2>
          <p>This exercise may have been removed.</p>
        </div>
      </section>
    );
  }

  const unitLabel = unit === "KG" ? "kg" : "lb";
  const bestSet = stats?.bestSet ?? null;
  const relative =
    bestSet?.bodyweight && bestSet.bodyweight > 0
      ? (bestSet.estimated1RM / bestSet.bodyweight) * 100
      : null;
  const strengthLevel = bestSet
    ? getStrengthLevel(exercise.id, bestSet.estimated1RM, bestSet.bodyweight, gender)
    : null;

  async function saveExerciseEdit(input: EditCustomExerciseInput) {
    setSavingEdit(true);
    setEditError("");

    const result = await updateCustomExercise(input, exercises);
    if (!result.ok) {
      setEditError(result.error);
      setSavingEdit(false);
      return;
    }

    setShowEditModal(false);
    setEditError("");
    setSavingEdit(false);
    await onRefresh(result.exercise);
  }

  return (
    <section>
      <button className="text-button exercise-details-back" onClick={onBack}>
        ← Exercises
      </button>

      <div className="exercise-details-heading">
        <div className="exercise-details-heading-main">
          <div>
            <p className="eyebrow">EXERCISE PROGRESS</p>
            <h1 className="page-title">{exercise.name}</h1>
            <p className="exercise-details-meta">
              {formatLabel(exercise.primaryMuscle)} · {formatLabel(exercise.loadType)}
            </p>
          </div>
          {exercise.source === ExerciseSource.CUSTOM && (
            <button
              type="button"
              className="text-button exercise-details-edit"
              onClick={() => {
                setEditError("");
                setShowEditModal(true);
              }}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {bestSet ? (
        <>
          <div className="exercise-stat-grid">
            <article className="card exercise-stat-card primary-stat">
              <span>Estimated 1RM</span>
              <strong>{formatWeight(bestSet.estimated1RM)} {unitLabel}</strong>
              <small>From {formatWeight(bestSet.weight)} × {bestSet.reps}</small>
            </article>

            <article className="card exercise-stat-card">
              <span>Heaviest weight</span>
              <strong>{formatWeight(stats?.heaviestWeight ?? 0)} {unitLabel}</strong>
              <small>Highest load logged</small>
            </article>

            <article className="card exercise-stat-card">
              <span>Best set</span>
              <strong>{formatWeight(bestSet.weight)} × {bestSet.reps}</strong>
              <small>{formatDate(bestSet.date)}</small>
            </article>

            <article className="card exercise-stat-card">
              <span>Last performed</span>
              <strong className="date-stat">
                {stats?.lastPerformed ? formatDate(stats.lastPerformed) : "—"}
              </strong>
              <small>{stats?.progress.length ?? 0} logged workout{stats?.progress.length === 1 ? "" : "s"}</small>
            </article>
          </div>

          {relative !== null && (
            <div className="card relative-strength-card">
              <div>
                <span>1RM relative to bodyweight</span>
                <strong>{Math.round(relative)}%</strong>
              </div>
              <p>
                {formatWeight(bestSet.estimated1RM)} {unitLabel} estimated 1RM at {formatWeight(bestSet.bodyweight!)} {unitLabel} bodyweight.
              </p>
            </div>
          )}

          {strengthLevel && (
            <div className="card strength-level-card">
              <div>
                <span>Strength level</span>
                <strong>{strengthLevel}</strong>
              </div>
              <p>Compared with lifters of the same gender using bodyweight-relative standards.</p>
              <small>Strength Level community standard · 1RM estimate</small>
            </div>
          )}

          {!strengthLevel && hasStrengthStandard(exercise.id) && gender !== "MALE" && gender !== "FEMALE" && (
            <div className="card strength-level-card">
              <p>Select Male or Female in Settings to show a strength level.</p>
            </div>
          )}

          <div className="card progression-card">
            <div className="section-heading">
              <div>
                <h2>1RM Progress</h2>
                <p>Best estimated 1RM from each workout.</p>
              </div>
              <span className="set-count">{stats?.progress.length ?? 0} sessions</span>
            </div>
            <ProgressChart points={stats?.progress ?? []} unitLabel={unitLabel} />
          </div>

          <div className="card progression-card">
            <div className="section-heading">
              <div>
                <h2>History</h2>
                <p>Completed workouts for this exercise.</p>
              </div>
              <span className="set-count">{historyRows.length} sessions</span>
            </div>
            <div className="previous-context-table-wrap exercise-history-table-wrap">
              <table className="previous-context-table exercise-history-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Workout</th>
                    <th scope="col">Parameters</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.workoutId}>
                      <td>{formatWorkoutDate(row.date)}</td>
                      <td>{row.workoutLabel}</td>
                      <td>{row.parameters}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card empty">
          <h2>No workout data yet</h2>
          <p>Complete a set of {exercise.name} to start tracking estimated 1RM progress.</p>
        </div>
      )}

      {showEditModal && exercise.source === ExerciseSource.CUSTOM && (
        <EditCustomExerciseModal
          key={exercise.id}
          exercise={exercise}
          error={editError}
          saving={savingEdit}
          onConfirm={saveExerciseEdit}
          onClose={() => {
            setShowEditModal(false);
            setEditError("");
          }}
        />
      )}
    </section>
  );
}

function ProgressChart({
  points,
  unitLabel,
}: {
  points: ProgressPoint[];
  unitLabel: string;
}) {
  if (points.length === 0) return null;

  const width = 620;
  const height = 230;
  const padding = { top: 24, right: 24, bottom: 42, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(rawMax - rawMin, rawMax * 0.08, 1);
  const min = Math.max(0, rawMin - spread * 0.25);
  const max = rawMax + spread * 0.25;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (points.length - 1)) * plotWidth;
    const y = padding.top + ((max - point.value) / (max - min)) * plotHeight;
    return { ...point, x, y };
  });

  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  return (
    <div className="progress-chart-wrap">
      <svg
        className="progress-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Estimated one rep max progression chart"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = padding.top + plotHeight * fraction;
          const value = max - (max - min) * fraction;
          return (
            <g key={fraction}>
              <line className="chart-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text className="chart-axis-label" x={padding.left - 10} y={y + 4} textAnchor="end">
                {formatWeight(value)}
              </text>
            </g>
          );
        })}

        {points.length > 1 && <polyline className="chart-line" points={line} fill="none" />}

        {coords.map((point, index) => (
          <g key={`${point.workoutId}-${index}`}>
            <circle className="chart-point" cx={point.x} cy={point.y} r="5" />
            {labelIndexes.has(index) && (
              <text className="chart-date-label" x={point.x} y={height - 14} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>
                {formatShortDate(point.date)}
              </text>
            )}
          </g>
        ))}

        <text className="chart-unit-label" x={padding.left} y={14}>{unitLabel}</text>
      </svg>
    </div>
  );
}

function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}
