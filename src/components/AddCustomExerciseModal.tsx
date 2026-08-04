import { useState } from "react";
import { createPortal } from "react-dom";

type AddCustomExerciseModalProps = {
  error?: string;
  saving?: boolean;
  onConfirm: (name: string) => void | Promise<void>;
  onClose: () => void;
};

export function AddCustomExerciseModal({
  error,
  saving = false,
  onConfirm,
  onClose,
}: AddCustomExerciseModalProps) {
  const [name, setName] = useState("");

  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close add exercise dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup"
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
        <div className="add-row">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Exercise name"
            onKeyDown={(event) => {
              if (event.key === "Enter") void onConfirm(name);
            }}
          />
          <button
            className="primary"
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void onConfirm(name)}
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
