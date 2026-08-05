import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ExerciseSetupEntry } from "../../domain/entities/ExerciseSetupEntry";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { getExerciseSetupHistoryRows } from "../../domain/coaching/exerciseSetupHistory";
import { formatDate } from "../../shared";

type PreviousExerciseSetupModalProps = {
  exerciseId: string;
  workoutId: string;
  sourceTemplateId?: string;
  exerciseSetups: ExerciseSetupEntry[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onClose: () => void;
};

type HistoryFilter = "all" | "same-template";

export function PreviousExerciseSetupModal({
  exerciseId,
  workoutId,
  sourceTemplateId,
  exerciseSetups,
  workouts,
  templates,
  onClose,
}: PreviousExerciseSetupModalProps) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const rows = useMemo(
    () =>
      getExerciseSetupHistoryRows(exerciseSetups, workouts, templates, {
        exerciseId,
        excludeWorkoutId: workoutId,
        currentSourceTemplateId: sourceTemplateId,
        sameTemplateOnly: filter === "same-template",
      }),
    [
      exerciseSetups,
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
        aria-label="Close previous setups dialog"
        onClick={onClose}
      />
      <div
        className="progression-popup previous-context-modal"
        role="dialog"
        aria-labelledby="previous-setup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="previous-setup-title">Previous Setups</h3>

        <div
          className="previous-context-filter"
          role="group"
          aria-label="Filter previous setups"
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
            No previous setups for this filter.
          </p>
        ) : (
          <div className="previous-context-table-wrap">
            <table className="previous-context-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Workout</th>
                  <th scope="col">Setup</th>
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
