import type { ProgressionRecommendation, ProgressionOption } from "../../domain/analytics/progression";
import { useEffect, useRef, useState } from "react";
import type { Exercise } from "../../domain/entities/Exercise";
import type { WorkoutExercise } from "../../domain/entities/workout";
import { formatLabel } from "../../shared";
import type { PRType } from "../../domain/analytics/personalRecords";
import { ProgressionPopup } from "./ProgressionPopup";
import { RestTimer } from "./RestTimer";
import { WorkoutExerciseComparison } from "./WorkoutExerciseComparison";

type WorkoutExerciseCardProps = {
  progressionRecommendation: ProgressionRecommendation | null;
  onApplyProgression: (option: ProgressionOption) => void;
  exercise: Exercise;
  item: WorkoutExercise;
  unit: string;
  position: number;
  exerciseCount: number;
  prTypesBySet: Map<string, PRType[]>;
  previousPerformance: WorkoutExercise | null;
  onAddSet: (workoutExerciseId: string, weight: number, reps: number) => void;
  onUpdateSet: (
    workoutExerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) => void;
  onDeleteSet: (workoutExerciseId: string, setOrder: number) => void;
  onMove: (workoutExerciseId: string, direction: -1 | 1) => void;
  onDuplicate: (workoutExerciseId: string) => void;
  onRemove: (workoutExerciseId: string) => void;
  onRestChange: (workoutExerciseId: string, restSeconds: number) => void;
  updatesTemplate: boolean;
  focusWeight?: boolean;
  onWeightFocused?: () => void;
  restTimer?: { endAt: number; onSkip: () => void } | null;
};

export function WorkoutExerciseCard({
  progressionRecommendation,
  onApplyProgression,
  exercise,
  item,
  unit,
  position,
  exerciseCount,
  prTypesBySet,
  previousPerformance,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onMove,
  onDuplicate,
  onRemove,
  onRestChange,
  updatesTemplate,
  focusWeight = false,
  onWeightFocused,
  restTimer = null,
}: WorkoutExerciseCardProps) {
  const weightInputRef = useRef<HTMLInputElement>(null);
  const plannedNext = item.plannedSets[item.completedSets.length];
  const firstCompleted = item.completedSets[0];
  const previous = item.completedSets.at(-1);
  const [weight, setWeight] = useState(
    firstCompleted?.weight ?? plannedNext?.weight ?? previous?.weight ?? 0,
  );
  const [reps, setReps] = useState(
    firstCompleted?.reps ?? plannedNext?.reps ?? previous?.reps ?? 5,
  );
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [progressionApplied, setProgressionApplied] = useState(false);

  const showProgressionIcon =
    progressionRecommendation != null &&
    item.completedSets.length === 0 &&
    !progressionApplied;

  useEffect(() => {
    const first = item.completedSets[0];
    if (first) {
      setWeight(first.weight);
      setReps(first.reps);
      return;
    }
    const nextPlan = item.plannedSets[item.completedSets.length];
    if (nextPlan) {
      setWeight(nextPlan.weight ?? 0);
      setReps(nextPlan.reps);
    }
  }, [item.completedSets.length, item.plannedSets]);

  useEffect(() => {
    if (!focusWeight || !weightInputRef.current) return;
    weightInputRef.current.focus();
    weightInputRef.current.select();
    onWeightFocused?.();
  }, [focusWeight, onWeightFocused]);

  function handleApplyProgression(option: ProgressionOption) {
    onApplyProgression(option);
    setProgressionApplied(true);
    setProgressionOpen(false);
  }

  return (
    <article className="card workout-card">
      <div className="section-heading">
        <div>
          <div className="workout-exercise-title">
            <h2>{exercise.name}</h2>
            {showProgressionIcon && (
              <button
                type="button"
                className="progression-icon-button"
                aria-label="Progression recommended"
                title="Progression recommended"
                onClick={() => setProgressionOpen(true)}
              >
                ↗
              </button>
            )}
          </div>
          <p>{formatLabel(exercise.primaryMuscle)}</p>
        </div>

        <div className="exercise-actions">
          <button
            className="text-button"
            aria-label={`Move ${exercise.name} up`}
            title="Move up"
            disabled={position === 0}
            onClick={() => onMove(item.id, -1)}
          >
            ↑
          </button>
          <button
            className="text-button"
            aria-label={`Move ${exercise.name} down`}
            title="Move down"
            disabled={position === exerciseCount - 1}
            onClick={() => onMove(item.id, 1)}
          >
            ↓
          </button>
          <span className="set-count">
            {item.completedSets.length}/{item.plannedSets.length || "–"} sets
          </span>
          <button
            className="text-button"
            onClick={() => onDuplicate(item.id)}
          >
            Duplicate
          </button>
          <button
            className="danger-text"
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </div>
      </div>

      <WorkoutExerciseComparison
        item={item}
        unit={unit}
        previousPerformance={previousPerformance}
        prTypesBySet={prTypesBySet}
        onUpdateSet={onUpdateSet}
        onDeleteSet={onDeleteSet}
      />

      {restTimer && (
        <RestTimer
          endAt={restTimer.endAt}
          exerciseName={exercise.name}
          onSkip={restTimer.onSkip}
        />
      )}

      <div className="current-set-block">
        <div className="set-entry">
          <label>
            Weight
            <input
              ref={weightInputRef}
              type="number"
              min="0"
              step="0.5"
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
            />
          </label>
          <label>
            Reps
            <input
              type="number"
              min="1"
              value={reps}
              onChange={(event) => setReps(Number(event.target.value))}
            />
          </label>
          <button
            className="primary"
            disabled={reps < 1 || weight < 0}
            onClick={() => onAddSet(item.id, weight, reps)}
          >
            Complete set
          </button>
        </div>

        <label className="rest-setting">
          Rest after set
          <select
            value={item.plannedRestSeconds}
            onChange={(event) =>
              onRestChange(item.id, Number(event.target.value))
            }
          >
            <option value={60}>1:00</option>
            <option value={90}>1:30</option>
            <option value={120}>2:00</option>
            <option value={180}>3:00</option>
            <option value={240}>4:00</option>
            <option value={300}>5:00</option>
          </select>
        </label>
      </div>

      {progressionOpen && progressionRecommendation && (
        <ProgressionPopup
          exerciseName={exercise.name}
          unit={unit}
          updatesTemplate={updatesTemplate}
          recommendation={progressionRecommendation}
          onSelect={handleApplyProgression}
          onClose={() => setProgressionOpen(false)}
        />
      )}
    </article>
  );
}
