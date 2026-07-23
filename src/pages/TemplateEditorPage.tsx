import { useEffect, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { WorkoutTemplate } from "../domain/entities/Template";

type TemplateEditorPageProps = {
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  onCancel: () => void;
  onSave: (template: WorkoutTemplate) => Promise<void>;
};

export function TemplateEditorPage({
  template,
  exercises,
  onCancel,
  onSave,
}: TemplateEditorPageProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(template?.name ?? "");
  }, [template]);

  if (!template) {
    return (
      <section>
        <h1 className="page-title">Edit Template</h1>
        <div className="empty card">
          <h2>Template not found</h2>
          <p>The template may have been deleted.</p>
          <button className="primary" onClick={onCancel}>
            Back to Templates
          </button>
        </div>
      </section>
    );
  }

  const trimmedName = name.trim();

  async function save() {
    if (!trimmedName || saving) return;

    setSaving(true);
    try {
      await onSave({ ...template, name: trimmedName });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="section-heading template-editor-heading">
        <div>
          <p className="eyebrow">TEMPLATE EDITOR</p>
          <h1 className="page-title">Edit Template</h1>
        </div>
        <div className="header-actions">
          <button className="text-button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={save}
            disabled={!trimmedName || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <article className="card template-editor-card">
        <label>
          Template name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            maxLength={80}
          />
        </label>
      </article>

      <div className="stack">
        {template.exercises.map((item, index) => {
          const exercise = exercises.find(
            (candidate) => candidate.id === item.exerciseId,
          );

          return (
            <article className="card template-editor-exercise" key={`${item.exerciseId}-${index}`}>
              <div>
                <h2>{exercise?.name ?? "Exercise"}</h2>
                <p>
                  {item.plannedSets.length} planned sets · {item.plannedRestSeconds}s rest
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {template.exercises.length === 0 && (
        <p className="muted-center">This template has no exercises yet.</p>
      )}
    </section>
  );
}
