import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { getCoachObservationHistoryRows } from "../../domain/coaching/coachObservationHistory";
import { formatDate } from "../../shared";

type PreviousCoachObservationsModalProps = {
  exerciseId: string;
  workoutId: string;
  sourceTemplateId?: string;
  coachObservations: CoachObservationEntry[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onClose: () => void;
};

type HistoryFilter = "all" | "same-template";

export function PreviousCoachObservationsModal({
  exerciseId,
  workoutId,
  sourceTemplateId,
  coachObservations,
  workouts,
  templates,
  onClose,
}: PreviousCoachObservationsModalProps) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const rows = useMemo(
    () =>
      getCoachObservationHistoryRows(coachObservations, workouts, templates, {
        exerciseId,
        excludeWorkoutId: workoutId,
        currentSourceTemplateId: sourceTemplateId,
        sameTemplateOnly: filter === "same-template",
      }),
    [
      coachObservations,
      workouts,
      templates,
      exerciseId,
      workoutId,
      sourceTemplateId,
      filter,
    ],
  );

  const sameTemplateLabel = sourceTemplateId
    ? templates.find((template) => template.id === sourceTemplateId)?.name ??
      "Same template"
    : "New workout";

  return createPortal(
    <div className="progression-popup-layer" role="presentation">
      <button
        type="button"
        className="progression-popup-backdrop"
        aria-label="Close previous observations dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup previous-context-modal"
        role="dialog"
        aria-labelledby="previous-observations-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="previous-observations-title">Previous Observations</h3>

        <div
          className="previous-context-filter"
          role="group"
          aria-label="Filter previous observations"
        >
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All workouts
          </button>
          <button
            type="button"
            className={filter === "same-template" ? "active" : ""}
            onClick={() => setFilter("same-template")}
          >
            {sameTemplateLabel}
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="coaching-knowledge-empty muted">
            No previous observations for this filter.
          </p>
        ) : (
          <div className="previous-context-table-wrap">
            <table className="previous-context-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Workout</th>
                  <th scope="col">Set</th>
                  <th scope="col">Observation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.workoutLabel}</td>
                    <td>{row.setOrder + 1}</td>
                    <td>{row.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="coaching-knowledge-modal-actions">
          <button type="button" className="primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
