import { getProgressionRecommendation, type ProgressionOption } from "../../domain/analytics/progression";
import { getPreviousPerformanceByExerciseId, getLastExercisePerformance } from "../../domain/analytics/previousPerformance";
import { useMemo, useState } from "react";
import type { Exercise } from "../../domain/entities/Exercise";
import type { Workout } from "../../domain/entities/workout";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import { ExercisePickerModal } from "../ExercisePickerModal";
import { restTimerService } from "../../services/restTimer/RestTimerService";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";
import { getActiveWorkoutPRs } from "../../domain/analytics/personalRecords";
import { createWorkoutExercise } from "../../domain/workout/createWorkoutExercise";
import type { ExerciseProgressionPreset } from "../../domain/workout/exerciseProgressionPresets";
import type { WorkoutContextEntry } from "../../domain/entities/WorkoutContextEntry";
import type { ExerciseSetupEntry } from "../../domain/entities/ExerciseSetupEntry";
import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import type { CoachingKnowledgePreferences } from "../../domain/coaching/coachingKnowledgePreferences";
import { buildWorkoutsForCoachingContext } from "../../domain/coaching/coachingTemplateContext";
import { WorkoutContextPanel } from "../coaching/WorkoutContextPanel";
import { CoachingKnowledgeMasterToggle } from "../coaching/CoachingKnowledgeMasterToggle";
import { RestTimer } from "./RestTimer";

type WorkoutPageProps = {
  workout: Workout | null;
  exercises: Exercise[];
  unit: "KG" | "LB";
  history: Workout[];
  templates: WorkoutTemplate[];
  workoutContexts: WorkoutContextEntry[];
  exerciseSetups: ExerciseSetupEntry[];
  coachObservations: CoachObservationEntry[];
  coachingPreferences: CoachingKnowledgePreferences;
  onCoachingPreferencesChange: (
    preferences: CoachingKnowledgePreferences,
  ) => void;
  onSaveWorkoutContext: (content: string) => Promise<void>;
  onSaveExerciseSetup: (
    workoutExerciseId: string,
    exerciseId: string,
    content: string,
  ) => Promise<void>;
  onSaveCoachObservation: (
    workoutExerciseId: string,
    exerciseId: string,
    setOrder: number,
    content: string,
  ) => Promise<void>;
  onStart: () => void;
  onChange: (workout: Workout) => void;
  onFinish: () => void;
  onCancel: () => void;
  onProgressionApplied?: (
    exerciseId: string,
    option: ProgressionOption,
  ) => void | Promise<void>;
  getExerciseProgressionPreset?: (
    exerciseId: string,
  ) => ExerciseProgressionPreset | null;
  onExercisesChange?: () => Promise<void>;
  onOpenExercise?: (exerciseId: string) => void;
};

export function WorkoutPage({
  workout,
  exercises,
  unit,
  history,
  templates,
  onStart,
  onChange,
  onFinish,
  onCancel,
  onProgressionApplied,
  getExerciseProgressionPreset,
  onExercisesChange,
  workoutContexts,
  exerciseSetups,
  coachObservations,
  coachingPreferences,
  onCoachingPreferencesChange,
  onSaveWorkoutContext,
  onSaveExerciseSetup,
  onSaveCoachObservation,
  onOpenExercise,
}: WorkoutPageProps) {
  const [focusExerciseId, setFocusExerciseId] = useState<string | null>(null);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

  if (!workout) {
    return (
      <div className="empty card">
        <h2>No active workout</h2>
        <p>Start a workout and begin logging sets.</p>
        <button className="primary" onClick={onStart}>
          Start Workout
        </button>
      </div>
    );
  }


  const previousPerformanceByExerciseId = useMemo(
    () =>
      getPreviousPerformanceByExerciseId(
        history,
        workout.exercises.map((item) => item.exerciseId),
      ),
    [history, workout.exercises],
  );

  const coachingWorkouts = useMemo(
    () => buildWorkoutsForCoachingContext(workout, history),
    [workout, history],
  );

  function latestCompletedExercise(exerciseId: string) {
    return previousPerformanceByExerciseId.get(exerciseId) ?? null;
  }

  function applyProgression(
    workoutExerciseId: string,
    exerciseId: string,
    option: ProgressionOption,
  ) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.id === workoutExerciseId
          ? {
              ...item,
              plannedRestSeconds: option.restSeconds ?? item.plannedRestSeconds,
              plannedSets: Array.from({ length: option.sets }, (_, index) => ({
                order: index,
                weight: option.nextWeight,
                reps: option.reps,
              })),
            }
          : item,
      ),
    });

    void onProgressionApplied?.(exerciseId, option);
  }

  function addExercise(exerciseId: string) {
    const previous = getLastExercisePerformance(history, exerciseId, workout);
    const progression = getExerciseProgressionPreset?.(exerciseId) ?? null;
    const next = createWorkoutExercise(
      exerciseId,
      workout.exercises.length,
      previous,
      progression,
    );

    setFocusExerciseId(next.id);
    onChange({ ...workout, exercises: [...workout.exercises, next] });
  }

  function removeExercise(workoutExerciseId: string) {
    const nextExercises = workout.exercises
      .filter((item) => item.id !== workoutExerciseId)
      .map((item, index) => ({ ...item, order: index }));

    onChange({ ...workout, exercises: nextExercises });
  }

  function moveExercise(workoutExerciseId: string, direction: -1 | 1) {
    const currentIndex = workout.exercises.findIndex(
      (item) => item.id === workoutExerciseId,
    );
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= workout.exercises.length) return;

    const nextExercises = [...workout.exercises];
    [nextExercises[currentIndex], nextExercises[nextIndex]] = [
      nextExercises[nextIndex],
      nextExercises[currentIndex],
    ];

    onChange({
      ...workout,
      exercises: nextExercises.map((item, index) => ({
        ...item,
        order: index,
      })),
    });
  }

  function completeSet(workoutExerciseId: string, setOrder: number) {
    const target = workout.exercises.find(
      (item) => item.id === workoutExerciseId,
    );
    if (!target) return;
    if (target.completedSets.some((set) => set.order === setOrder)) return;

    const planned = target.plannedSets.find((set) => set.order === setOrder);
    if (!planned) return;

    const weight = planned.weight ?? 0;
    const reps = planned.reps;
    if (weight < 0 || reps < 1) return;

    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.id === workoutExerciseId
          ? {
              ...item,
              completedSets: [
                ...item.completedSets,
                { order: setOrder, weight, reps },
              ].sort((a, b) => a.order - b.order),
            }
          : item,
      ),
    });

    const exercise = exercises.find(
      (candidate) => candidate.id === target.exerciseId,
    );

    void restTimerService.start(
      Date.now() + target.plannedRestSeconds * 1000,
      exercise?.name ?? "Rest",
    );
  }

  function updatePlannedSet(
    workoutExerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) {
    if (weight < 0 || reps < 1) return;

    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.id === workoutExerciseId
          ? {
              ...item,
              plannedSets: item.plannedSets.map((set) =>
                set.order === setOrder ? { ...set, weight, reps } : set,
              ),
            }
          : item,
      ),
    });
  }

  function addPlannedSet(workoutExerciseId: string) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) => {
        if (item.id !== workoutExerciseId) return item;

        const lastPlanned = [...item.plannedSets].sort(
          (a, b) => a.order - b.order,
        ).at(-1);

        return {
          ...item,
          plannedSets: [
            ...item.plannedSets,
            {
              order:
                item.plannedSets.reduce(
                  (max, set) => Math.max(max, set.order),
                  -1,
                ) + 1,
              weight: lastPlanned?.weight ?? 0,
              reps: lastPlanned?.reps ?? 5,
            },
          ],
        };
      }),
    });
  }

  function updateCompletedSet(
    workoutExerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) {
    if (weight < 0 || reps < 1) return;

    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.id === workoutExerciseId
          ? {
              ...item,
              completedSets: item.completedSets.map((set) =>
                set.order === setOrder ? { ...set, weight, reps } : set,
              ),
            }
          : item,
      ),
    });
  }

  function deleteSet(workoutExerciseId: string, setOrder: number) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) => {
        if (item.id !== workoutExerciseId || item.plannedSets.length <= 1) {
          return item;
        }

        const plannedSets = [...item.plannedSets]
          .sort((a, b) => a.order - b.order)
          .filter((set) => set.order !== setOrder)
          .map((set, index) => ({ ...set, order: index }));
        const completedSets = [...item.completedSets]
          .sort((a, b) => a.order - b.order)
          .filter((set) => set.order !== setOrder)
          .map((set, index) => ({ ...set, order: index }));

        return { ...item, plannedSets, completedSets };
      }),
    });
  }

  function ensurePlannedSets(workoutExerciseId: string) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) => {
        if (item.id !== workoutExerciseId || item.plannedSets.length > 0) {
          return item;
        }

        return {
          ...item,
          plannedSets: [{ order: 0, weight: 0, reps: 5 }],
        };
      }),
    });
  }

  function updateRest(workoutExerciseId: string, restSeconds: number) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.id === workoutExerciseId
          ? { ...item, plannedRestSeconds: restSeconds }
          : item,
      ),
    });
  }

  const activePRs = getActiveWorkoutPRs(history, workout);

  const canFinish = workout.exercises.some(
    (item) => item.completedSets.length > 0,
  );

  const exercisePicker = exercisePickerOpen ? (
    <ExercisePickerModal
      exercises={exercises}
      excludedExerciseIds={workout.exercises.map((item) => item.exerciseId)}
      workouts={history}
      currentWorkout={workout}
      onSelect={addExercise}
      onClose={() => setExercisePickerOpen(false)}
      onExercisesChange={onExercisesChange}
    />
  ) : null;

  return (
    <section>
      <div className="section-heading workout-heading">
        <div>
          <p className="eyebrow">ACTIVE WORKOUT</p>
          <h1 className="page-title">Workout</h1>
        </div>
        <CoachingKnowledgeMasterToggle
          visible={coachingPreferences.coachingKnowledgeVisible}
          onToggle={() =>
            onCoachingPreferencesChange({
              ...coachingPreferences,
              coachingKnowledgeVisible:
                !coachingPreferences.coachingKnowledgeVisible,
            })
          }
        />
        <div className="header-actions">
          <button className="danger-text" onClick={onCancel}>
            Discard
          </button>
          <button
            className="primary"
            disabled={!canFinish}
            onClick={onFinish}
          >
            Finish
          </button>
        </div>
      </div>

      {coachingPreferences.coachingKnowledgeVisible && (
        <WorkoutContextPanel
          workoutId={workout.id}
          sourceTemplateId={workout.sourceTemplateId}
          workoutContexts={workoutContexts}
          workouts={coachingWorkouts}
          templates={templates}
          onSave={onSaveWorkoutContext}
        />
      )}

      {workout.exercises.length === 0 ? (
        <p className="muted-center workout-empty-hint">
          Add an exercise to start logging sets.
        </p>
      ) : (
        <div className="stack">
          {workout.exercises.map((item, index) => {
            const exercise = exercises.find(
              (candidate) => candidate.id === item.exerciseId,
            );

            return exercise ? (
              <WorkoutExerciseCard
                key={item.id}
                workoutId={workout.id}
                sourceTemplateId={workout.sourceTemplateId}
                workouts={coachingWorkouts}
                templates={templates}
                exercise={exercise}
                item={item}
                unit={unit}
                position={index}
                exerciseCount={workout.exercises.length}
                prTypesBySet={activePRs}
                previousPerformance={
                  previousPerformanceByExerciseId.get(item.exerciseId) ?? null
                }
                focusFirstSet={item.id === focusExerciseId}
                onFocusFirstSet={() => setFocusExerciseId(null)}
                onCompleteSet={completeSet}
                onUpdatePlannedSet={updatePlannedSet}
                onUpdateCompletedSet={updateCompletedSet}
                onAddPlannedSet={addPlannedSet}
                onDeleteSet={deleteSet}
                onEnsurePlannedSets={ensurePlannedSets}
                progressionRecommendation={(() => {
                  const previous = latestCompletedExercise(item.exerciseId);
                  const exercise = exercises.find(
                    (candidate) => candidate.id === item.exerciseId,
                  );
                  return previous && exercise
                    ? getProgressionRecommendation(previous, exercise)
                    : null;
                })()}
                onApplyProgression={(option) =>
                  applyProgression(item.id, item.exerciseId, option)
                }
                onMove={moveExercise}
                onRemove={removeExercise}
                onRestChange={updateRest}
                coachingKnowledgeVisible={
                  coachingPreferences.coachingKnowledgeVisible
                }
                exerciseSetups={exerciseSetups}
                coachObservations={coachObservations}
                onSaveExerciseSetup={(content) =>
                  onSaveExerciseSetup(item.id, item.exerciseId, content)
                }
                onSaveCoachObservation={(setOrder, content) =>
                  onSaveCoachObservation(
                    item.id,
                    item.exerciseId,
                    setOrder,
                    content,
                  )
                }
                updatesTemplate={Boolean(workout.sourceTemplateId)}
                onOpenExercise={
                  onOpenExercise
                    ? () => onOpenExercise(item.exerciseId)
                    : undefined
                }
              />
            ) : null;
          })}
        </div>
      )}

      <div className="workout-add-exercise-row">
        <button
          type="button"
          className="add-custom-button"
          onClick={() => setExercisePickerOpen(true)}
        >
          <span className="add-custom-icon" aria-hidden="true">
            +
          </span>
          Add exercise
        </button>
      </div>

      {exercisePicker}

      <RestTimer
        onSkip={() => {
          void restTimerService.stop();
        }}
        onAdjust={(deltaSeconds) => {
          void restTimerService.adjust(deltaSeconds);
        }}
      />
    </section>
  );
}
