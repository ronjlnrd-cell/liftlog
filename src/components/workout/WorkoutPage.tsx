import { useState } from "react";
import type { Exercise } from "../../domain/entities/Exercise";
import type { Workout, WorkoutExercise } from "../../domain/entities/workout";
import { ExercisePicker } from "../ExercisePicker";
import { RestTimer } from "./RestTimer";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";

type WorkoutPageProps = {
  workout: Workout | null;
  exercises: Exercise[];
  unit: "KG" | "LB";
  onStart: () => void;
  onChange: (workout: Workout) => void;
  onFinish: () => void;
  onCancel: () => void;
};

export function WorkoutPage({
  workout,
  exercises,
  unit,
  onStart,
  onChange,
  onFinish,
  onCancel,
}: WorkoutPageProps) {
  const [restEndAt, setRestEndAt] = useState<number | null>(null);

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

  function addExercise(exerciseId: string) {
    if (workout.exercises.some((item) => item.exerciseId === exerciseId)) {
      return;
    }

    const next: WorkoutExercise = {
      exerciseId,
      order: workout.exercises.length,
      plannedRestSeconds: 120,
      plannedSets: [],
      completedSets: [],
    };

    onChange({ ...workout, exercises: [...workout.exercises, next] });
  }

  function removeExercise(exerciseId: string) {
    const nextExercises = workout.exercises
      .filter((item) => item.exerciseId !== exerciseId)
      .map((item, index) => ({ ...item, order: index }));

    onChange({ ...workout, exercises: nextExercises });
  }

  function moveExercise(exerciseId: string, direction: -1 | 1) {
    const currentIndex = workout.exercises.findIndex(
      (item) => item.exerciseId === exerciseId,
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

  function addSet(exerciseId: string, weight: number, reps: number) {
    const target = workout.exercises.find(
      (item) => item.exerciseId === exerciseId,
    );
    if (!target) return;

    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.exerciseId === exerciseId
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

    setRestEndAt(Date.now() + target.plannedRestSeconds * 1000);
  }

  function updateSet(
    exerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) {
    if (weight < 0 || reps < 1) return;

    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.exerciseId === exerciseId
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

  function deleteSet(exerciseId: string, setOrder: number) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.exerciseId === exerciseId
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

  function updateRest(exerciseId: string, restSeconds: number) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.exerciseId === exerciseId
          ? { ...item, plannedRestSeconds: restSeconds }
          : item,
      ),
    });
  }

  const canFinish = workout.exercises.some(
    (item) => item.completedSets.length > 0,
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

      {restEndAt && (
        <RestTimer endAt={restEndAt} onSkip={() => setRestEndAt(null)} />
      )}

      <ExercisePicker
        exercises={exercises}
        excludedExerciseIds={workout.exercises.map(
          (item) => item.exerciseId,
        )}
        onSelect={addExercise}
      />

      {workout.exercises.length === 0 && (
        <p className="muted-center">Add your first exercise above.</p>
      )}

      <div className="stack">
        {workout.exercises.map((item, index) => {
          const exercise = exercises.find(
            (candidate) => candidate.id === item.exerciseId,
          );

          return exercise ? (
            <WorkoutExerciseCard
              key={item.exerciseId}
              exercise={exercise}
              item={item}
              unit={unit}
              position={index}
              exerciseCount={workout.exercises.length}
              onAddSet={addSet}
              onUpdateSet={updateSet}
              onDeleteSet={deleteSet}
              onMove={moveExercise}
              onRemove={removeExercise}
              onRestChange={updateRest}
            />
          ) : null;
        })}
      </div>
    </section>
  );
}
