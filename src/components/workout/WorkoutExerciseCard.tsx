import { useEffect, useState } from "react";
import type { Exercise } from "../../domain/entities/Exercise";
import type { WorkoutExercise } from "../../domain/entities/workout";
import { formatLabel } from "../../shared";
import { EditableCompletedSet } from "./EditableCompletedSet";

type WorkoutExerciseCardProps = {
  exercise: Exercise;
  item: WorkoutExercise;
  unit: string;
  position: number;
  exerciseCount: number;
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
};

export function WorkoutExerciseCard({
  exercise,
  item,
  unit,
  position,
  exerciseCount,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onMove,
  onDuplicate,
  onRemove,
  onRestChange,
}: WorkoutExerciseCardProps) {
  const plannedNext = item.plannedSets[item.completedSets.length];
  const previous = item.completedSets.at(-1);
  const [weight, setWeight] = useState(
    plannedNext?.weight ?? previous?.weight ?? 0,
  );
  const [reps, setReps] = useState(
    plannedNext?.reps ?? previous?.reps ?? 5,
  );

  useEffect(() => {
    const nextPlan = item.plannedSets[item.completedSets.length];
    if (nextPlan) {
      setWeight(nextPlan.weight ?? 0);
      setReps(nextPlan.reps);
    }
  }, [item.completedSets.length, item.plannedSets]);

  return (
    <article className="card workout-card">
      <div className="section-heading">
        <div>
          <h2>{exercise.name}</h2>
          <p>{formatLabel(exercise.primaryMuscle)}</p>
        </div>

        <div className="exercise-actions">
          <button
            className="text-button"
            aria-label={`Move ${exercise.name} up`}
            disabled={position === 0}
            onClick={() => onMove(item.id, -1)}
          >
            ↑
          </button>
          <button
            className="text-button"
            aria-label={`Move ${exercise.name} down`}
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

      {item.completedSets.length > 0 && (
        <div className="sets-list">
          {item.completedSets.map((set, index) => (
            <EditableCompletedSet
              key={set.order}
              exerciseId={item.id}
              set={set}
              setNumber={index + 1}
              unit={unit}
              onSave={onUpdateSet}
              onDelete={onDeleteSet}
            />
          ))}
        </div>
      )}

      {plannedNext && (
        <p className="plan-hint">
          Planned next: {plannedNext.weight ?? 0} {unit.toLowerCase()} ×{" "}
          {plannedNext.reps}
        </p>
      )}

      <div className="set-entry">
        <label>
          Weight
          <input
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
    </article>
  );
}
