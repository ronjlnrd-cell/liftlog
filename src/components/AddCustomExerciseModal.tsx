import { useState } from "react";
import { createPortal } from "react-dom";
import type { MuscleGroup } from "../domain/types/MuscleGroup";
import type { LoadType } from "../domain/types/LoadType";
import {
  DEFAULT_PRIMARY_MUSCLE,
  PrimaryMuscleSelect,
} from "./PrimaryMuscleSelect";
import { DEFAULT_LOAD_TYPE, LoadTypeSelect } from "./LoadTypeSelect";

export type AddCustomExerciseInput = {
  name: string;
  primaryMuscle: MuscleGroup;
  loadType: LoadType;
};

type AddCustomExerciseModalProps = {
  error?: string;
  saving?: boolean;
  onConfirm: (input: AddCustomExerciseInput) => void | Promise<void>;
  onClose: () => void;
};

export function AddCustomExerciseModal({
  error,
  saving = false,
  onConfirm,
  onClose,
}: AddCustomExerciseModalProps) {
  const [name, setName] = useState("");
  const [primaryMuscle, setPrimaryMuscle] =
    useState<MuscleGroup>(DEFAULT_PRIMARY_MUSCLE);
  const [loadType, setLoadType] = useState<LoadType>(DEFAULT_LOAD_TYPE);

  async function handleConfirm() {
    await onConfirm({ name, primaryMuscle, loadType });
  }

  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close add exercise dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup add-custom-exercise-modal"
        role="dialog"
        aria-labelledby="add-custom-exercise-title"
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
        <h3 id="add-custom-exercise-title">Add custom exercise</h3>
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
            id="add-custom-exercise-muscle"
            value={primaryMuscle}
            onChange={setPrimaryMuscle}
          />
          <LoadTypeSelect
            id="add-custom-exercise-equipment"
            value={loadType}
            onChange={setLoadType}
          />
          <button
            className="primary add-custom-exercise-submit"
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void handleConfirm()}
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
