import { useMemo, useState } from "react";
import type { ExerciseSetupEntry } from "../../domain/entities/ExerciseSetupEntry";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { getEffectiveExerciseSetup } from "../../domain/coaching/coachingKnowledgeQueries";
import { CoachingKnowledgeTextModal } from "./CoachingKnowledgeTextModal";
import { PreviousExerciseSetupModal } from "./PreviousExerciseSetupModal";

type ExerciseSetupPanelProps = {
  workoutId: string;
  sourceTemplateId?: string;
  workoutExerciseId: string;
  exerciseId: string;
  exerciseSetups: ExerciseSetupEntry[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onSave: (content: string) => Promise<void>;
};

export function ExerciseSetupPanel({
  workoutId,
  sourceTemplateId,
  workoutExerciseId,
  exerciseId,
  exerciseSetups,
  workouts,
  templates,
  onSave,
}: ExerciseSetupPanelProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const effectiveSetup = useMemo(
    () =>
      getEffectiveExerciseSetup(
        exerciseSetups,
        workoutExerciseId,
        exerciseId,
        {
          sourceTemplateId,
          workouts,
          templates,
        },
      ),
    [exerciseSetups, workoutExerciseId, exerciseId, sourceTemplateId, workouts, templates],
  );

  return (
    <article className="card coaching-knowledge-card coaching-exercise-setup compact">
      <div className="coaching-knowledge-head compact with-actions">
        <p className="coaching-knowledge-label">⚙ Exercise Setup</p>
        <div className="coaching-knowledge-head-actions">
          <button
            type="button"
            className="text-button coaching-knowledge-add"
            onClick={() => setEditModalOpen(true)}
          >
            {effectiveSetup.content ? "Edit" : "Add"}
          </button>
          <button
            type="button"
            className="text-button coaching-knowledge-link"
            onClick={() => setHistoryModalOpen(true)}
          >
            Previous Setups
          </button>
        </div>
      </div>

      {effectiveSetup.content ? (
        <p className="coaching-knowledge-current">{effectiveSetup.content}</p>
      ) : (
        <p className="coaching-knowledge-hint muted">
          Capture grip, equipment, angle, or support for this exercise.
        </p>
      )}

      {editModalOpen && (
        <CoachingKnowledgeTextModal
          title="Exercise Setup"
          description="Capture grip, equipment, angle, or support used for this exercise."
          placeholder="Medium grip, wrist wraps, bench #2…"
          confirmLabel="Save setup"
          initialValue={effectiveSetup.content ?? ""}
          onClose={() => setEditModalOpen(false)}
          onSave={onSave}
        />
      )}

      {historyModalOpen && (
        <PreviousExerciseSetupModal
          exerciseId={exerciseId}
          workoutId={workoutId}
          sourceTemplateId={sourceTemplateId}
          exerciseSetups={exerciseSetups}
          workouts={workouts}
          templates={templates}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}
    </article>
  );
}
