import { createPortal } from "react-dom";

const LEARN_MORE_URL =
  "https://womenshealth.gov/getting-active/physical-activity-menstrual-cycle";

type CycleTrackingConsentModalProps = {
  onAccept: () => void;
  onDecline: () => void;
};

export function CycleTrackingConsentModal({
  onAccept,
  onDecline,
}: CycleTrackingConsentModalProps) {
  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close consent dialog"
        onClick={onDecline}
      />
      <div
        className="progression-popup cycle-consent-modal"
        role="dialog"
        aria-labelledby="cycle-consent-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="cycle-consent-title">Track your menstrual cycle?</h3>
        <div className="cycle-consent-copy">
          <p>
            Many women notice changes in their energy, recovery, symptoms, or
            training experience throughout their menstrual cycle.
          </p>
          <p>
            By tracking your period start dates, Stronger! will be able to
            provide personalized insights based on your own training history in
            future updates.
          </p>
          <p>
            Your cycle data is private, completely optional, and can be turned
            off at any time.
          </p>
        </div>
        <a
          className="text-button cycle-consent-learn-more"
          href={LEARN_MORE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </a>
        <div className="cycle-consent-actions">
          <button type="button" className="text-button" onClick={onDecline}>
            Not now
          </button>
          <button type="button" className="primary" onClick={onAccept}>
            Enable tracking
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
