import { createPortal } from "react-dom";
import type { ProgressionOption, ProgressionRecommendation } from "../../domain/analytics/progression";

type ProgressionPopupProps = {
  exerciseName: string;
  unit: string;
  updatesTemplate: boolean;
  recommendation: ProgressionRecommendation;
  onSelect: (option: ProgressionOption) => void;
  onClose: () => void;
};

export function ProgressionPopup({
  exerciseName,
  unit,
  updatesTemplate,
  recommendation,
  onSelect,
  onClose,
}: ProgressionPopupProps) {
  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close progression options"
        onClick={onClose}
      />
      <div
        className="progression-popup"
        role="dialog"
        aria-labelledby="progression-popup-title"
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
        <p className="eyebrow">Progression recommended</p>
        <h3 id="progression-popup-title">{exerciseName}</h3>
        <p className="progression-popup-subtitle">
          {updatesTemplate
            ? "Pick a target to update today's workout and your template."
            : "Pick a target to update today's planned sets."}
        </p>
        <div className="progression-popup-options">
          {recommendation.options.map((option) => (
            <button
              type="button"
              key={option.label}
              className={`progression-popup-option${
                option.recommended ? " recommended" : ""
              }`}
              onClick={() => onSelect(option)}
            >
              <div className="progression-popup-option-heading">
                <strong>{option.label}</strong>
                {option.recommended && (
                  <span className="progression-popup-tag">Recommended</span>
                )}
              </div>
              <span className="progression-popup-option-detail">
                {option.detail} {unit.toLowerCase()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
