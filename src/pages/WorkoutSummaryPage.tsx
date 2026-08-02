import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { WorkoutTemplate } from "../domain/entities/Template";
import type { Workout } from "../domain/entities/workout";
import {
  estimated1RM,
  getWorkoutPRs,
  prLabel,
  setKey,
} from "../domain/analytics/personalRecords";
import {
  getProgressionCoachPlan,
  type ProgressionCoachSuggestion,
} from "../domain/analytics/progressionCoach";
import { formatDate } from "../shared";

type WorkoutSummaryPageProps = {
  workout: Workout;
  workouts: Workout[];
  exercises: Exercise[];
  unit: "KG" | "LB";
  sourceTemplate?: WorkoutTemplate | null;
  onApplyProgression?: (
    exerciseId: string,
    suggestion: ProgressionCoachSuggestion,
  ) => Promise<void>;
  historical?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onDone: () => void;
  onSaveTemplate: () => void;
};

type Achievement = {
  key: string;
  icon: string;
  title: string;
  detail: string;
};

function workoutMilestones(total: number): number[] {
  return [1, 10, 25, 50, 100, 250, 500].filter((value) => total === value);
}

function weightMilestone(weight: number): number | null {
  const milestones = [40, 60, 80, 100, 120, 140, 160, 180, 200, 225, 250, 300];
  return [...milestones].reverse().find((value) => weight >= value) ?? null;
}

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
  sourceTemplate = null,
  onApplyProgression,
  historical = false,
  onEdit,
  onDelete,
  onDone,
  onSaveTemplate,
}: WorkoutSummaryPageProps) {
  const [declinedExerciseIds, setDeclinedExerciseIds] = useState<Set<string>>(
    new Set(),
  );
  const [appliedExerciseIds, setAppliedExerciseIds] = useState<Set<string>>(
    new Set(),
  );
  const [applyingExerciseId, setApplyingExerciseId] = useState<string | null>(
    null,
  );

  const allPRs = getWorkoutPRs(workouts);
  const workoutPRs = [...allPRs.values()].filter(
    (record) => record.workoutId === workout.id,
  );

  const progressionCoachPlan = useMemo(
    () => (historical ? [] : getProgressionCoachPlan(workout, exercises)),
    [historical, workout, exercises],
  );

  const visibleCoachPlan = progressionCoachPlan.filter(
    (advice) => !declinedExerciseIds.has(advice.exerciseId),
  );

  async function handleApplyProgression(
    exerciseId: string,
    suggestion: ProgressionCoachSuggestion,
  ) {
    if (!onApplyProgression || appliedExerciseIds.has(exerciseId)) return;

    setApplyingExerciseId(exerciseId);
    try {
      await onApplyProgression(exerciseId, suggestion);
      setAppliedExerciseIds((current) => new Set(current).add(exerciseId));
    } finally {
      setApplyingExerciseId(null);
    }
  }

  function declineProgression(exerciseId: string) {
    setDeclinedExerciseIds((current) => new Set(current).add(exerciseId));
  }

  const achievements: Achievement[] = [];
  const completedCount = workouts.filter((item) => item.completedAt).length;
  for (const milestone of workoutMilestones(completedCount)) {
    achievements.push({
      key: `workouts-${milestone}`,
      icon: milestone === 1 ? "🎉" : "🔥",
      title: `${milestone} workout${milestone === 1 ? "" : "s"} completed`,
      detail: milestone === 1 ? "Your first completed workout." : "A training consistency milestone.",
    });
  }

  for (const item of workout.exercises) {
    const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
    if (!exercise || item.completedSets.length === 0) continue;

    const maxWeight = Math.max(...item.completedSets.map((set) => set.weight));
    const milestone = weightMilestone(maxWeight);
    if (!milestone) continue;

    const earlierMax = Math.max(
      0,
      ...workouts
        .filter((candidate) => candidate.id !== workout.id)
        .flatMap((candidate) =>
          candidate.exercises
            .filter((candidateExercise) => candidateExercise.exerciseId === item.exerciseId)
            .flatMap((candidateExercise) => candidateExercise.completedSets.map((set) => set.weight)),
        ),
    );

    if (earlierMax < milestone) {
      achievements.push({
        key: `weight-${item.exerciseId}-${milestone}`,
        icon: "💪",
        title: `${milestone} ${unit.toLowerCase()} ${exercise.name}`,
        detail: `First logged set at or above ${milestone} ${unit.toLowerCase()}.`,
      });
    }
  }

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

      {!historical && achievements.length > 0 && (
        <article className="card summary-section achievement-section">
          <h2>Achievements</h2>
          <div className="achievement-list">
            {achievements.map((achievement) => (
              <div className="achievement-row" key={achievement.key}>
                <span className="achievement-icon">{achievement.icon}</span>
                <div>
                  <strong>{achievement.title}</strong>
                  <p>{achievement.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

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

      {!historical && visibleCoachPlan.length > 0 && (
        <article className="card summary-section progression-coach-section">
          <h2>Progression Coach</h2>
          <p className="section-subtitle">
            Suggested targets for your next session.
            {sourceTemplate && " Apply to update your template."}
          </p>
          <div className="progression-coach-list">
            {visibleCoachPlan.map((advice) => {
              const exercise = exercises.find(
                (candidate) => candidate.id === advice.exerciseId,
              );
              const canApplyToTemplate =
                sourceTemplate != null &&
                sourceTemplate.exercises.some(
                  (item) => item.exerciseId === advice.exerciseId,
                );
              const applied = appliedExerciseIds.has(advice.exerciseId);
              const applying = applyingExerciseId === advice.exerciseId;

              return (
                <div className="progression-coach-exercise" key={advice.exerciseId}>
                  <div className="progression-coach-header">
                    <strong>{exercise?.name ?? "Exercise"}</strong>
                    <span className="progression-coach-status">
                      {applied ? "Template updated" : advice.comparison.headline}
                    </span>
                  </div>
                  <p className="progression-coach-comparison">
                    {advice.comparison.detail}
                  </p>
                  <div className="progression-coach-suggestions">
                    {advice.suggestions.map((suggestion, index) => (
                      <div key={suggestion.type}>
                        {index > 0 && <div className="progression-or">or</div>}
                        {canApplyToTemplate && onApplyProgression ? (
                          <button
                            type="button"
                            className={`progression-coach-suggestion apply${
                              suggestion.recommended ? " recommended" : ""
                            }${applied ? " applied" : ""}`}
                            disabled={applied || applying}
                            onClick={() =>
                              void handleApplyProgression(
                                advice.exerciseId,
                                suggestion,
                              )
                            }
                          >
                            <strong>{suggestion.label}</strong>
                            <p>
                              {suggestion.detail} {unit.toLowerCase()}
                              {suggestion.recommended && (
                                <em> · Recommended</em>
                              )}
                            </p>
                            <span className="progression-coach-apply-label">
                              {applied
                                ? "Applied to template"
                                : applying
                                  ? "Updating template…"
                                  : `Apply to ${sourceTemplate.name}`}
                            </span>
                          </button>
                        ) : (
                          <div
                            className={`progression-coach-suggestion${
                              suggestion.recommended ? " recommended" : ""
                            }`}
                          >
                            <strong>{suggestion.label}</strong>
                            <p>
                              {suggestion.detail} {unit.toLowerCase()}
                              {suggestion.recommended && (
                                <em> · Recommended</em>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {!applied && (
                    <button
                      type="button"
                      className="text-button progression-coach-decline"
                      onClick={() => declineProgression(advice.exerciseId)}
                    >
                      Decline progression
                    </button>
                  )}
                </div>
              );
            })}
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
              </div>
            );
          })}
        </div>
      </article>

      <div className="summary-actions">
        {!workout.sourceTemplateId && (
          <button className="text-button" onClick={onSaveTemplate}>
            Save as template
          </button>
        )}
        {historical && onEdit && (
          <button className="text-button" onClick={onEdit}>
            Edit workout
          </button>
        )}
        {historical && onDelete && (
          <button className="danger-text" onClick={onDelete}>
            Delete
          </button>
        )}
        <button className="primary" onClick={onDone}>
          {historical ? "Back to history" : "Done"}
        </button>
      </div>
    </section>
  );
}
