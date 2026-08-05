import { useMemo, useState } from "react";
import type { WorkoutContextEntry } from "../../domain/entities/WorkoutContextEntry";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { getWorkoutContextForWorkout } from "../../domain/coaching/coachingKnowledgeQueries";
import { CoachingKnowledgeTextModal } from "./CoachingKnowledgeTextModal";
import { PreviousWorkoutContextModal } from "./PreviousWorkoutContextModal";

type WorkoutContextPanelProps = {
  workoutId: string;
  sourceTemplateId?: string;
  workoutContexts: WorkoutContextEntry[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onSave: (content: string) => Promise<void>;
};

export function WorkoutContextPanel({
  workoutId,
  sourceTemplateId,
  workoutContexts,
  workouts,
  templates,
  onSave,
}: WorkoutContextPanelProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const currentContext = useMemo(
    () => getWorkoutContextForWorkout(workoutContexts, workoutId),
    [workoutContexts, workoutId],
  );

  return (
    <article className="card coaching-knowledge-card coaching-workout-context compact">
      <div className="coaching-knowledge-head compact with-actions">
        <p className="coaching-knowledge-label">🏋 Workout Context</p>
        <div className="coaching-knowledge-head-actions">
          {!currentContext && (
            <button
              type="button"
              className="text-button coaching-knowledge-add"
              onClick={() => setAddModalOpen(true)}
            >
              Add
            </button>
          )}
          <button
            type="button"
            className="text-button coaching-knowledge-link"
            onClick={() => setHistoryModalOpen(true)}
          >
            Previous Context
          </button>
        </div>
      </div>

      {currentContext && (
        <p className="coaching-knowledge-current">{currentContext.content}</p>
      )}

      {addModalOpen && (
        <CoachingKnowledgeTextModal
          title="Workout Context"
          description="Tell your coach what might affect this entire workout."
          placeholder="Poor sleep, high stress, returning from illness…"
          confirmLabel="Save context"
          onClose={() => setAddModalOpen(false)}
          onSave={onSave}
        />
      )}

      {historyModalOpen && (
        <PreviousWorkoutContextModal
          workoutId={workoutId}
          sourceTemplateId={sourceTemplateId}
          workoutContexts={workoutContexts}
          workouts={workouts}
          templates={templates}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}
    </article>
  );
}
