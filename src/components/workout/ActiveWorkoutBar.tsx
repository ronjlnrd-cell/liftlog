import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";

type ActiveWorkoutBarProps = {
  workout: Workout;
  exercises: Exercise[];
  onResume: () => void;
};

export function ActiveWorkoutBar({
  workout,
  exercises,
  onResume,
}: ActiveWorkoutBarProps) {
  const completedSets = workout.exercises.reduce(
    (total, item) => total + item.completedSets.length,
    0,
  );
  const latestExercise = workout.exercises.at(-1);
  const latestName = latestExercise
    ? exercises.find((exercise) => exercise.id === latestExercise.exerciseId)
        ?.name
    : null;

  const detail =
    workout.exercises.length === 0
      ? "No exercises yet"
      : [
          `${workout.exercises.length} exercise${workout.exercises.length === 1 ? "" : "s"}`,
          `${completedSets} set${completedSets === 1 ? "" : "s"}`,
          latestName,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="active-workout-bar" role="region" aria-label="Active workout">
      <button
        type="button"
        className="active-workout-bar-button"
        onClick={onResume}
      >
        <div className="active-workout-bar-copy">
          <strong>Workout in progress</strong>
          <span>{detail}</span>
        </div>
        <span className="active-workout-bar-action">Resume</span>
      </button>
    </div>
  );
}
