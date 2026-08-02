import { useEffect, useState } from "react";
import type { WorkoutExercise } from "../../domain/entities/workout";
import {
  getHighestPriorityPRType,
  prLabel,
  type PRType,
} from "../../domain/analytics/personalRecords";

type CompletedSet = WorkoutExercise["completedSets"][number];

type EditableCompletedSetProps = {
  exerciseId: string;
  set: CompletedSet;
  setNumber: number;
  unit: string;
  variant?: "default" | "compact";
  prTypes?: PRType[];
  onSave: (
    exerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) => void;
  onDelete: (exerciseId: string, setOrder: number) => void;
};

export function EditableCompletedSet({
  exerciseId,
  set,
  setNumber,
  unit,
  variant = "default",
  prTypes = [],
  onSave,
  onDelete,
}: EditableCompletedSetProps) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.reps);
  const topPR = getHighestPriorityPRType(prTypes);
  const compact = variant === "compact";

  useEffect(() => {
    if (!editing) {
      setWeight(set.weight);
      setReps(set.reps);
    }
  }, [editing, set.weight, set.reps]);

  function save() {
    if (weight < 0 || reps < 1) return;
    onSave(exerciseId, set.order, weight, reps);
    setEditing(false);
  }

  function cancel() {
    setWeight(set.weight);
    setReps(set.reps);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={`editable-completed-set editing${compact ? " compact" : ""}`}>
        {!compact && (
          <span className="editable-completed-set-label">Set {setNumber}</span>
        )}
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
        <div className="header-actions">
          <button
            className="primary"
            disabled={weight < 0 || reps < 1}
            onClick={save}
          >
            Save
          </button>
          <button className="text-button" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="editable-completed-set compact layout-row">
        <div className="set-table-completed-cell">
          <strong>
            {set.weight} {unit.toLowerCase()} × {set.reps}
          </strong>
          {topPR && (
            <span className="pr-badge live-pr-badge" title={prLabel(prTypes)}>
              🏆 {prLabel(prTypes)}
            </span>
          )}
        </div>
        <div className="set-table-row-actions">
          <button
            type="button"
            className="icon-button icon-button-edit"
            aria-label={`Edit set ${setNumber}`}
            title="Edit set"
            onClick={() => setEditing(true)}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Delete set ${setNumber}`}
            title="Delete set"
            onClick={() => onDelete(exerciseId, set.order)}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editable-completed-set">
      <div className="editable-completed-set-row">
        <span>Set {setNumber}</span>
        <strong>
          {set.weight} {unit.toLowerCase()} × {set.reps}
        </strong>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button icon-button-edit"
            aria-label={`Edit set ${setNumber}`}
            title="Edit set"
            onClick={() => setEditing(true)}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Delete set ${setNumber}`}
            title="Delete set"
            onClick={() => onDelete(exerciseId, set.order)}
          >
            ×
          </button>
        </div>
      </div>
      {topPR && (
        <span className="pr-badge live-pr-badge" title={prLabel(prTypes)}>
          🏆 {prLabel(prTypes)}
        </span>
      )}
    </div>
  );
}
