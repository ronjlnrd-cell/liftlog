import type { ProgressionRecommendation, ProgressionOption } from "../../domain/analytics/progression";
import { useState } from "react";
import type { Exercise } from "../../domain/entities/Exercise";
import type { WorkoutExercise } from "../../domain/entities/workout";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { formatLabel } from "../../shared";
import type { PRType } from "../../domain/analytics/personalRecords";
import { ProgressionPopup } from "./ProgressionPopup";
import { WorkoutSetRows } from "./WorkoutSetRows";
import type { ExerciseSetupEntry } from "../../domain/entities/ExerciseSetupEntry";
import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import { ExerciseSetupPanel } from "../coaching/ExerciseSetupPanel";

type WorkoutExerciseCardProps = {
  progressionRecommendation: ProgressionRecommendation | null;
  onApplyProgression: (option: ProgressionOption) => void;
  exercise: Exercise;
  item: WorkoutExercise;
  workoutId: string;
  sourceTemplateId?: string;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  unit: string;
  position: number;
  exerciseCount: number;
  prTypesBySet: Map<string, PRType[]>;
  previousPerformance: WorkoutExercise | null;
  onCompleteSet: (workoutExerciseId: string, setOrder: number) => void;
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
  onAddPlannedSet: (workoutExerciseId: string) => void;
  onDeleteSet: (workoutExerciseId: string, setOrder: number) => void;
  onEnsurePlannedSets: (workoutExerciseId: string) => void;
  onMove: (workoutExerciseId: string, direction: -1 | 1) => void;
  onRemove: (workoutExerciseId: string) => void;
  onRestChange: (workoutExerciseId: string, restSeconds: number) => void;
  exerciseSetups: ExerciseSetupEntry[];
  coachObservations: CoachObservationEntry[];
  onSaveExerciseSetup: (content: string) => Promise<void>;
  onSaveCoachObservation: (
    setOrder: number,
    content: string,
  ) => Promise<void>;
  coachingKnowledgeVisible: boolean;
  updatesTemplate: boolean;
  focusFirstSet?: boolean;
  onFocusFirstSet?: () => void;
  onOpenExercise?: () => void;
};

export function WorkoutExerciseCard({
  progressionRecommendation,
  onApplyProgression,
  exercise,
  item,
  workoutId,
  sourceTemplateId,
  workouts,
  templates,
  unit,
  position,
  exerciseCount,
  prTypesBySet,
  previousPerformance,
  onCompleteSet,
  onUpdatePlannedSet,
  onUpdateCompletedSet,
  onAddPlannedSet,
  onDeleteSet,
  onEnsurePlannedSets,
  onMove,
  onRemove,
  onRestChange,
  exerciseSetups,
  coachObservations,
  onSaveExerciseSetup,
  onSaveCoachObservation,
  coachingKnowledgeVisible,
  updatesTemplate,
  focusFirstSet = false,
  onFocusFirstSet,
  onOpenExercise,
}: WorkoutExerciseCardProps) {
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [progressionApplied, setProgressionApplied] = useState(false);

  const showProgressionIcon =
    progressionRecommendation != null &&
    item.completedSets.length === 0 &&
    !progressionApplied;

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
            <h2>
              {onOpenExercise ? (
                <button
                  type="button"
                  className="text-button workout-exercise-title-link"
                  onClick={onOpenExercise}
                >
                  {exercise.name}
                </button>
              ) : (
                exercise.name
              )}
            </h2>
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
            className="danger-text"
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </div>
      </div>

      {coachingKnowledgeVisible && (
        <ExerciseSetupPanel
          workoutId={workoutId}
          sourceTemplateId={sourceTemplateId}
          workoutExerciseId={item.id}
          exerciseId={item.exerciseId}
          exerciseSetups={exerciseSetups}
          workouts={workouts}
          templates={templates}
          onSave={onSaveExerciseSetup}
        />
      )}

      <WorkoutSetRows
        item={item}
        unit={unit}
        previousPerformance={previousPerformance}
        prTypesBySet={prTypesBySet}
        focusFirstSet={focusFirstSet}
        onFocusFirstSet={onFocusFirstSet}
        onUpdatePlannedSet={onUpdatePlannedSet}
        onUpdateCompletedSet={onUpdateCompletedSet}
        onCompleteSet={onCompleteSet}
        onAddPlannedSet={onAddPlannedSet}
        onDeleteSet={onDeleteSet}
        onEnsurePlannedSets={onEnsurePlannedSets}
        onRestChange={onRestChange}
        coachingKnowledgeVisible={coachingKnowledgeVisible}
        coachObservations={coachObservations}
        workoutId={workoutId}
        sourceTemplateId={sourceTemplateId}
        workouts={workouts}
        templates={templates}
        exerciseId={item.exerciseId}
        onSaveCoachObservation={onSaveCoachObservation}
      />

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
