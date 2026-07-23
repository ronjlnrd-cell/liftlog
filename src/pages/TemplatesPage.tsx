import type { Exercise } from "../domain/entities/Exercise";
import type { WorkoutTemplate } from "../domain/entities/Template";
import type { Workout } from "../domain/entities/workout";
import { EmptyState } from "./components/EmptyState";

type TemplatesPageProps = {
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  activeWorkout: Workout | null;
  onStart: (template: WorkoutTemplate) => void;
  onResume: () => void;
  onEdit: (template: WorkoutTemplate) => void;
  onDelete: (id: string) => Promise<void>;
};

export function TemplatesPage({
  templates,
  exercises,
  activeWorkout,
  onStart,
  onResume,
  onEdit,
  onDelete,
}: TemplatesPageProps) {
  return (
    <section>
      <h1 className="page-title">Templates</h1>

      {activeWorkout && (
        <div className="card active-notice">
          <div>
            <strong>Workout in progress</strong>
            <p>Finish or discard it before starting another.</p>
          </div>
          <button className="primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          text="Complete a workout, then save it as a template from History."
        />
      ) : (
        <div className="stack">
          {templates.map((template) => (
            <article className="card template-card" key={template.id}>
              <div className="section-heading">
                <div>
                  <h2>{template.name}</h2>
                  <p>{template.exercises.length} exercises</p>
                </div>

                <div className="header-actions">
                  <button
                    className="text-button"
                    onClick={() => onEdit(template)}
                  >
                    Edit
                  </button>
                  <button
                    className="danger-text"
                    onClick={() => onDelete(template.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="primary"
                    disabled={Boolean(activeWorkout)}
                    onClick={() => onStart(template)}
                  >
                    Start
                  </button>
                </div>
              </div>

              <div className="template-exercises">
                {template.exercises.map((item, index) => {
                  const exercise = exercises.find(
                    (candidate) => candidate.id === item.exerciseId,
                  );

                  return (
                    <span key={`${item.exerciseId}-${index}`}>
                      {exercise?.name ?? "Exercise"} ·{" "}
                      {item.plannedSets.length} sets
                    </span>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
