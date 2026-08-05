import { useMemo, useState } from "react";
import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { getCoachObservationsForSet } from "../../domain/coaching/coachingKnowledgeQueries";
import { CoachingKnowledgeTextModal } from "./CoachingKnowledgeTextModal";
import { PreviousCoachObservationsModal } from "./PreviousCoachObservationsModal";

type CoachObservationSetActionProps = {
  workoutExerciseId: string;
  setOrder: number;
  setLabel: string;
  coachObservations: CoachObservationEntry[];
  onSave: (content: string) => Promise<void>;
  showAdd?: boolean;
  showPreviousHistory?: boolean;
  workoutId?: string;
  sourceTemplateId?: string;
  exerciseId?: string;
  workouts?: Workout[];
  templates?: WorkoutTemplate[];
};

export function CoachObservationSetAction({
  workoutExerciseId,
  setOrder,
  setLabel,
  coachObservations,
  onSave,
  showAdd = true,
  showPreviousHistory = false,
  workoutId,
  sourceTemplateId,
  exerciseId,
  workouts = [],
  templates = [],
}: CoachObservationSetActionProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const observations = useMemo(
    () =>
      getCoachObservationsForSet(
        coachObservations,
        workoutExerciseId,
        setOrder,
      ),
    [coachObservations, workoutExerciseId, setOrder],
  );

  return (
    <div className="coaching-observation-set-action">
      {observations.map((entry) => (
        <p className="coaching-observation-current" key={entry.id}>
          📝 {entry.content}
        </p>
      ))}
      {(showAdd || showPreviousHistory) && (
        <div className="coaching-knowledge-head-actions coaching-observation-set-actions">
          {showAdd && (
            <button
              type="button"
              className="text-button coaching-knowledge-add"
              onClick={() => setAddModalOpen(true)}
            >
              Add Coach Observation
            </button>
          )}
          {showPreviousHistory && workoutId && exerciseId && (
            <button
              type="button"
              className="text-button coaching-knowledge-link"
              onClick={() => setHistoryModalOpen(true)}
            >
              Previous Observations
            </button>
          )}
        </div>
      )}
      {addModalOpen && (
        <CoachingKnowledgeTextModal
          title={`Coach Observation · ${setLabel}`}
          description="Share what you'd tell your coach about this set — anything that may help you perform this exercise better in future workouts."
          placeholder="Left shoulder felt tight, grip slipped on rep 4, shortened ROM to protect lower back…"
          confirmLabel="Save observation"
          onClose={() => setAddModalOpen(false)}
          onSave={onSave}
        />
      )}
      {historyModalOpen && workoutId && exerciseId && (
        <PreviousCoachObservationsModal
          exerciseId={exerciseId}
          workoutId={workoutId}
          sourceTemplateId={sourceTemplateId}
          coachObservations={coachObservations}
          workouts={workouts}
          templates={templates}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}
    </div>
  );
}
