import { useState } from "react";
import { createPortal } from "react-dom";
import { localDateString } from "../shared";

type LogPeriodModalProps = {
  onSave: (startDate: string) => Promise<void>;
  onClose: () => void;
};

export function LogPeriodModal({ onSave, onClose }: LogPeriodModalProps) {
  const [startDate, setStartDate] = useState(localDateString());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!startDate) {
      setError("Pick a start date.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await onSave(startDate);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save period. Please try again.",
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
        aria-label="Close log period dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup log-period-modal"
        role="dialog"
        aria-labelledby="log-period-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="log-period-title">Log New Period</h3>
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            max={localDateString()}
            onChange={(event) => {
              setStartDate(event.target.value);
              setError("");
            }}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="log-period-actions">
          <button type="button" className="text-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy || !startDate}
            onClick={() => void handleSave()}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
