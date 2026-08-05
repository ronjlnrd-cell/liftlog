import { useEffect, useMemo, useRef } from "react";
import type { WorkoutExercise } from "../../domain/entities/workout";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import {
  activeSetKey,
  getHighestPriorityPRType,
  prLabel,
  type PRType,
} from "../../domain/analytics/personalRecords";
import { selectInputOnClick, selectInputOnFocus } from "../../shared";
import { CoachObservationSetAction } from "../coaching/CoachObservationsPanel";

type WorkoutSetRowsProps = {
  item: WorkoutExercise;
  unit: string;
  previousPerformance: WorkoutExercise | null;
  prTypesBySet: Map<string, PRType[]>;
  focusFirstSet?: boolean;
  onFocusFirstSet?: () => void;
  onUpdatePlannedSet: (
    workoutExerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) => void;
  onUpdateCompletedSet: (
    workoutExerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) => void;
  onCompleteSet: (workoutExerciseId: string, setOrder: number) => void;
  onAddPlannedSet: (workoutExerciseId: string) => void;
  onDeleteSet: (workoutExerciseId: string, setOrder: number) => void;
  onEnsurePlannedSets: (workoutExerciseId: string) => void;
  onRestChange: (workoutExerciseId: string, restSeconds: number) => void;
  coachingKnowledgeVisible: boolean;
  coachObservations: CoachObservationEntry[];
  workoutId: string;
  sourceTemplateId?: string;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  exerciseId: string;
  onSaveCoachObservation: (
    setOrder: number,
    content: string,
  ) => Promise<void>;
};

function formatPreviousSet(
  weight: number,
  reps: number,
  unit: string,
): string {
  return `${weight} ${unit.toLowerCase()} × ${reps}`;
}

export function WorkoutSetRows({
  item,
  unit,
  previousPerformance,
  prTypesBySet,
  focusFirstSet = false,
  onFocusFirstSet,
  onUpdatePlannedSet,
  onUpdateCompletedSet,
  onCompleteSet,
  onAddPlannedSet,
  onDeleteSet,
  onEnsurePlannedSets,
  onRestChange,
  coachingKnowledgeVisible,
  coachObservations,
  workoutId,
  sourceTemplateId,
  workouts,
  templates,
  exerciseId,
  onSaveCoachObservation,
}: WorkoutSetRowsProps) {
  const firstPendingInputRef = useRef<HTMLInputElement>(null);
  const sortedPlanned = useMemo(
    () => [...item.plannedSets].sort((a, b) => a.order - b.order),
    [item.plannedSets],
  );
  const completedByOrder = useMemo(
    () => new Map(item.completedSets.map((set) => [set.order, set])),
    [item.completedSets],
  );
  const previousSets = useMemo(() => {
    if (!previousPerformance) return [];
    return [...previousPerformance.completedSets].sort((a, b) => a.order - b.order);
  }, [previousPerformance]);
  const hasPrevious = previousSets.length > 0;
  const firstPendingOrder = sortedPlanned.find(
    (planned) => !completedByOrder.has(planned.order),
  )?.order;

  useEffect(() => {
    if (item.plannedSets.length === 0) {
      onEnsurePlannedSets(item.id);
    }
  }, [item.id, item.plannedSets.length, onEnsurePlannedSets]);

  useEffect(() => {
    if (!focusFirstSet || !firstPendingInputRef.current) return;
    firstPendingInputRef.current.focus();
    firstPendingInputRef.current.select();
    onFocusFirstSet?.();
  }, [focusFirstSet, onFocusFirstSet]);

  if (sortedPlanned.length === 0) {
    return null;
  }

  return (
    <div className={`workout-set-rows${hasPrevious ? " has-previous" : ""}`}>
      <div className="workout-set-rows-header">
        <span>#</span>
        <span>Weight ({unit.toLowerCase()})</span>
        <span>Reps</span>
        <span aria-hidden="true" />
        {hasPrevious && <span>Previous</span>}
      </div>

      {sortedPlanned.map((planned, index) => {
        const completed = completedByOrder.get(planned.order);
        const isCompleted = completed != null;
        const weight = completed?.weight ?? planned.weight ?? 0;
        const reps = completed?.reps ?? planned.reps;
        const previousSet = previousSets[index];
        const prTypes =
          completed != null
            ? prTypesBySet.get(activeSetKey(item.id, completed.order)) ?? []
            : [];
        const topPR = getHighestPriorityPRType(prTypes);
        const focusThisInput =
          focusFirstSet && planned.order === firstPendingOrder;

        return (
          <div key={planned.order}>
            <div
              className={`workout-set-row${isCompleted ? " completed" : " pending"}`}
            >
              <span className="workout-set-row-num">{index + 1}</span>

              <input
                ref={focusThisInput ? firstPendingInputRef : undefined}
                type="number"
                min="0"
                step="0.5"
                className="workout-set-input"
                value={weight}
                onFocus={selectInputOnFocus}
                onClick={selectInputOnClick}
                onChange={(event) => {
                  const nextWeight = Number(event.target.value);
                  if (isCompleted) {
                    onUpdateCompletedSet(
                      item.id,
                      planned.order,
                      nextWeight,
                      reps,
                    );
                  } else {
                    onUpdatePlannedSet(item.id, planned.order, nextWeight, reps);
                  }
                }}
              />

              <input
                type="number"
                min="1"
                className="workout-set-input"
                value={reps}
                onFocus={selectInputOnFocus}
                onClick={selectInputOnClick}
                onChange={(event) => {
                  const nextReps = Number(event.target.value);
                  if (isCompleted) {
                    onUpdateCompletedSet(
                      item.id,
                      planned.order,
                      weight,
                      nextReps,
                    );
                  } else {
                    onUpdatePlannedSet(item.id, planned.order, weight, nextReps);
                  }
                }}
              />

              <div className="workout-set-row-actions">
                <button
                  type="button"
                  className="complete-set-button"
                  aria-label={
                    isCompleted
                      ? `Set ${index + 1} completed`
                      : `Mark set ${index + 1} complete`
                  }
                  title={isCompleted ? "Set completed" : "Mark set complete"}
                  disabled={isCompleted || reps < 1 || weight < 0}
                  onClick={() => onCompleteSet(item.id, planned.order)}
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="icon-button delete-set-button"
                  aria-label={`Delete set ${index + 1}`}
                  title="Delete set"
                  disabled={sortedPlanned.length <= 1}
                  onClick={() => onDeleteSet(item.id, planned.order)}
                >
                  ×
                </button>
              </div>

              {hasPrevious && (
                <span className="workout-set-row-previous">
                  {previousSet
                    ? formatPreviousSet(previousSet.weight, previousSet.reps, unit)
                    : "—"}
                </span>
              )}

              {topPR && (
                <span
                  className="pr-badge live-pr-badge workout-set-row-pr"
                  title={prLabel(prTypes)}
                >
                  🏆 {prLabel(prTypes)}
                </span>
              )}
            </div>

            {coachingKnowledgeVisible && (index === 0 || isCompleted) && (
              <CoachObservationSetAction
                workoutExerciseId={item.id}
                setOrder={planned.order}
                setLabel={`Set ${index + 1}`}
                coachObservations={coachObservations}
                showAdd={isCompleted}
                showPreviousHistory={index === 0}
                workoutId={workoutId}
                sourceTemplateId={sourceTemplateId}
                exerciseId={exerciseId}
                workouts={workouts}
                templates={templates}
                onSave={(content) =>
                  onSaveCoachObservation(planned.order, content)
                }
              />
            )}
          </div>
        );
      })}

      <div className="workout-set-footer">
        <div className="workout-set-rest">
          <span>Rest after set</span>
          <select
            value={item.plannedRestSeconds}
            aria-label="Rest after set"
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
        </div>

        <button
          type="button"
          className="text-button add-extra-set-button"
          onClick={() => onAddPlannedSet(item.id)}
        >
          + Add set
        </button>
      </div>
    </div>
  );
}
