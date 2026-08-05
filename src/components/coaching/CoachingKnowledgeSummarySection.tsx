import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import type { ExerciseSetupEntry } from "../../domain/entities/ExerciseSetupEntry";
import type { WorkoutContextEntry } from "../../domain/entities/WorkoutContextEntry";
import type { Exercise } from "../../domain/entities/Exercise";
import type { Workout } from "../../domain/entities/workout";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import {
  formatCoachObservationLabel,
  getWorkoutCoachingKnowledge,
  summarizeExerciseSetup,
} from "../../domain/coaching/coachingKnowledgeQueries";

type CoachingKnowledgeSummarySectionProps = {
  workout: Workout;
  exercises: Exercise[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  workoutContexts: WorkoutContextEntry[];
  exerciseSetups: ExerciseSetupEntry[];
  coachObservations: CoachObservationEntry[];
};

export function CoachingKnowledgeSummarySection({
  workout,
  exercises,
  workouts,
  templates,
  workoutContexts,
  exerciseSetups,
  coachObservations,
}: CoachingKnowledgeSummarySectionProps) {
  const knowledge = getWorkoutCoachingKnowledge(
    workout.id,
    workoutContexts,
    exerciseSetups,
    coachObservations,
    workout,
    { workouts, templates },
  );

  const hasExerciseKnowledge = knowledge.exercises.some(
    (entry) =>
      entry.setup != null ||
      entry.observations.length > 0,
  );

  if (!knowledge.context && !hasExerciseKnowledge) {
    return null;
  }

  return (
    <article className="card summary-section coaching-knowledge-summary">
      <h2>Advanced Notes</h2>

      {knowledge.context && (
        <section className="coaching-knowledge-summary-block">
          <h3>🏋 Workout Context</h3>
          <p>{knowledge.context.content}</p>
        </section>
      )}

      {knowledge.exercises.map(({ item, setup, observations }) => {
        if (!setup && observations.length === 0) return null;

        const exercise = exercises.find(
          (candidate) => candidate.id === item.exerciseId,
        );

        return (
          <section
            className="coaching-knowledge-summary-block"
            key={item.id}
          >
            <h3>{exercise?.name ?? "Exercise"}</h3>
            {setup && (
              <div className="coaching-knowledge-summary-subblock">
                <strong>⚙ Exercise Setup</strong>
                <p>{summarizeExerciseSetup(setup)}</p>
              </div>
            )}
            {observations.length > 0 && (
              <div className="coaching-knowledge-summary-subblock">
                <strong>📝 Coach Observations</strong>
                <ul className="coaching-knowledge-summary-list">
                  {observations.map((entry) => (
                    <li key={entry.id}>
                      {formatCoachObservationLabel(entry)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </article>
  );
}
