import { getProgressionRecommendation, type ProgressionOption } from "../../domain/analytics/progression";
import { getPreviousPerformanceByExerciseId } from "../../domain/analytics/previousPerformance";
import { useMemo, useRef, useState } from "react";
import type { Exercise } from "../../domain/entities/Exercise";
import type { Workout, WorkoutExercise } from "../../domain/entities/workout";
import { ExercisePicker } from "../ExercisePicker";
import {
  ensureNotificationPermission,
  prepareTimerNotification,
} from "../../shared/timerNotification";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";
import { getActiveWorkoutPRs } from "../../domain/analytics/personalRecords";

type WorkoutPageProps = {
  workout: Workout | null;
  workouts: Workout[];
  exercises: Exercise[];
  unit: "KG" | "LB";
  history: Workout[];
  onStart: () => void;
  onChange: (workout: Workout) => void;
  onFinish: () => void;
  onCancel: () => void;
  onProgressionApplied?: (
    exerciseId: string,
    option: ProgressionOption,
  ) => void | Promise<void>;
  onExercisesChange?: () => Promise<void>;
};

export function WorkoutPage({
  workout,
  workouts,
  exercises,
  unit,
  history,
  onStart,
  onChange,
  onFinish,
  onCancel,
  onProgressionApplied,
  onExercisesChange,
}: WorkoutPageProps) {
  const [restTimer, setRestTimer] = useState<{
    endAt: number;
    workoutExerciseId: string;
  } | null>(null);
  const [focusExerciseId, setFocusExerciseId] = useState<string | null>(null);
  const workoutRef = useRef(workout);
  workoutRef.current = workout;

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
    const next: WorkoutExercise = {
      id: crypto.randomUUID(),
      exerciseId,
      order: workout.exercises.length,
      plannedRestSeconds: 120,
      plannedSets: [],
      completedSets: [],
    };

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

  function addSet(workoutExerciseId: string, weight: number, reps: number) {
    const target = workout.exercises.find(
      (item) => item.id === workoutExerciseId,
    );
    if (!target) return;

    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.id === workoutExerciseId
          ? {
              ...item,
              completedSets: [
                ...item.completedSets,
                {
                  order: item.completedSets.length,
                  weight,
                  reps,
                  completedAt: new Date(),
                },
              ],
            }
          : item,
      ),
    });

    prepareTimerNotification();
    void ensureNotificationPermission();

    setRestTimer({
      endAt: Date.now() + target.plannedRestSeconds * 1000,
      workoutExerciseId,
    });
  }

  function updateSet(
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
    const current = workoutRef.current;
    if (!current) return;

    onChange({
      ...current,
      exercises: current.exercises.map((item) =>
        item.id === workoutExerciseId
          ? {
              ...item,
              completedSets: item.completedSets
                .filter((set) => set.order !== setOrder)
                .map((set, index) => ({ ...set, order: index })),
            }
          : item,
      ),
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

  const exercisePicker = (
    <ExercisePicker
      exercises={exercises}
      excludedExerciseIds={[]}
      workouts={workouts}
      onSelect={addExercise}
      onExercisesChange={onExercisesChange}
    />
  );

  return (
    <section>
      <div className="section-heading workout-heading">
        <div>
          <p className="eyebrow">ACTIVE WORKOUT</p>
          <h1 className="page-title">Workout</h1>
        </div>
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

      {workout.exercises.length === 0 ? (
        <>
          {exercisePicker}
          <p className="muted-center">Add your first exercise above.</p>
        </>
      ) : (
        <>
          <div className="stack">
            {workout.exercises.map((item, index) => {
              const exercise = exercises.find(
                (candidate) => candidate.id === item.exerciseId,
              );

              return exercise ? (
                <WorkoutExerciseCard
                  key={item.id}
                  exercise={exercise}
                  item={item}
                  unit={unit}
                  position={index}
                  exerciseCount={workout.exercises.length}
                  prTypesBySet={activePRs}
                  previousPerformance={
                    previousPerformanceByExerciseId.get(item.exerciseId) ?? null
                  }
                  focusWeight={item.id === focusExerciseId}
                  onWeightFocused={() => setFocusExerciseId(null)}
                  onAddSet={addSet}
                  onUpdateSet={updateSet}
                  onDeleteSet={deleteSet}
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
                  updatesTemplate={Boolean(workout.sourceTemplateId)}
                  restTimer={
                    restTimer?.workoutExerciseId === item.id
                      ? {
                          endAt: restTimer.endAt,
                          onSkip: () => setRestTimer(null),
                        }
                      : null
                  }
                />
              ) : null;
            })}
          </div>
          {exercisePicker}
        </>
      )}
    </section>
  );
}
