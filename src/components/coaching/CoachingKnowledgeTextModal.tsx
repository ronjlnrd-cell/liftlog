import { useState } from "react";
import { createPortal } from "react-dom";

type CoachingKnowledgeTextModalProps = {
  title: string;
  description: string;
  placeholder: string;
  confirmLabel?: string;
  initialValue?: string;
  allowEmpty?: boolean;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
};

export function CoachingKnowledgeTextModal({
  title,
  description,
  placeholder,
  confirmLabel = "Save",
  initialValue = "",
  allowEmpty = false,
  onSave,
  onClose,
}: CoachingKnowledgeTextModalProps) {
  const [content, setContent] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const trimmed = content.trim();
    if (!trimmed && !allowEmpty) {
      setError("Enter a short description.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await onSave(trimmed);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup coaching-knowledge-modal"
        role="dialog"
        aria-labelledby="coaching-knowledge-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="coaching-knowledge-modal-title">{title}</h3>
        <p className="coaching-knowledge-modal-description">{description}</p>
        <label>
          Details
          <textarea
            autoFocus
            rows={4}
            maxLength={500}
            value={content}
            placeholder={placeholder}
            onChange={(event) => {
              setContent(event.target.value);
              setError("");
            }}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="coaching-knowledge-modal-actions">
          <button type="button" className="text-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy || (!allowEmpty && !content.trim())}
            onClick={() => void handleSave()}
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
