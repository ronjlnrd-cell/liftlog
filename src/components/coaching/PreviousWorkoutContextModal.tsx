import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkoutContextEntry } from "../../domain/entities/WorkoutContextEntry";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { getWorkoutContextHistoryRows } from "../../domain/coaching/workoutContextHistory";
import { formatDate } from "../../shared";

type PreviousWorkoutContextModalProps = {
  workoutId: string;
  sourceTemplateId?: string;
  workoutContexts: WorkoutContextEntry[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onClose: () => void;
};

type HistoryFilter = "all" | "same-template";

export function PreviousWorkoutContextModal({
  workoutId,
  sourceTemplateId,
  workoutContexts,
  workouts,
  templates,
  onClose,
}: PreviousWorkoutContextModalProps) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const rows = useMemo(
    () =>
      getWorkoutContextHistoryRows(workoutContexts, workouts, templates, {
        excludeWorkoutId: workoutId,
        currentSourceTemplateId: sourceTemplateId,
        sameTemplateOnly: filter === "same-template",
      }),
    [
      workoutContexts,
      workouts,
      templates,
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
        aria-label="Close previous context dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup previous-context-modal"
        role="dialog"
        aria-labelledby="previous-context-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="previous-context-title">Previous Context</h3>

        <div
          className="previous-context-filter"
          role="group"
          aria-label="Filter previous context"
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
            No previous context for this filter.
          </p>
        ) : (
          <div className="previous-context-table-wrap">
            <table className="previous-context-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Workout</th>
                  <th scope="col">Context</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.workoutLabel}</td>
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
