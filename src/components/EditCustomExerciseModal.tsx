import { useState } from "react";
import { createPortal } from "react-dom";
import type { Exercise } from "../domain/entities/Exercise";
import type { MuscleGroup } from "../domain/types/MuscleGroup";
import { PrimaryMuscleSelect } from "./PrimaryMuscleSelect";

export type EditCustomExerciseInput = {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
};

type EditCustomExerciseModalProps = {
  exercise: Exercise;
  error?: string;
  saving?: boolean;
  onConfirm: (input: EditCustomExerciseInput) => void | Promise<void>;
  onClose: () => void;
};

export function EditCustomExerciseModal({
  exercise,
  error,
  saving = false,
  onConfirm,
  onClose,
}: EditCustomExerciseModalProps) {
  const [name, setName] = useState(exercise.name);
  const [primaryMuscle, setPrimaryMuscle] = useState(exercise.primaryMuscle);

  async function handleConfirm() {
    await onConfirm({ id: exercise.id, name, primaryMuscle });
  }

  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close edit exercise dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup add-custom-exercise-modal"
        role="dialog"
        aria-labelledby="edit-custom-exercise-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="progression-popup-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <h3 id="edit-custom-exercise-title">Edit custom exercise</h3>
        <div className="add-custom-exercise-form">
          <label className="add-custom-exercise-name">
            Exercise name
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Exercise name"
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleConfirm();
              }}
            />
          </label>
          <PrimaryMuscleSelect
            id="edit-custom-exercise-muscle"
            value={primaryMuscle}
            onChange={setPrimaryMuscle}
          />
          <button
            className="primary add-custom-exercise-submit"
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void handleConfirm()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
