import { useEffect, useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { WorkoutTemplate, TemplateExercise } from "../domain/entities/Template";

type Props = {
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  isNew?: boolean;
  onCancel: () => void;
  onSave: (template: WorkoutTemplate) => Promise<void>;
};

export function TemplateEditorPage({ template, exercises, isNew = false, onCancel, onSave }: Props) {
  const [name, setName] = useState(template?.name ?? "");
  const [items, setItems] = useState<TemplateExercise[]>(template?.exercises ?? []);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setName(template?.name ?? "");
    setItems(template?.exercises.map((x) => ({ ...x, plannedSets: x.plannedSets.map(s => ({...s})) })) ?? []);
  }, [template]);

  const available = useMemo(() => {
    const used = new Set(items.map(x => x.exerciseId));
    const q = query.trim().toLowerCase();
    return exercises
      .filter(x => !x.archivedAt && !used.has(x.id) && (!q || x.name.toLowerCase().includes(q)))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [exercises, items, query]);

  if (!template) {
    return (
      <section>
        <h1 className="page-title">Edit Template</h1>
        <div className="empty card">
          <h2>Template not found</h2>
          <button className="primary" onClick={onCancel}>
            Back to Templates
          </button>
        </div>
      </section>
    );
  }

  function normalize(next: TemplateExercise[]) {
    return next.map((x, index) => ({ ...x, order: index }));
  }
  function move(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    setItems(normalize(next));
  }
  function addExercise(exerciseId: string) {
    setItems(normalize([...items, {
      exerciseId, order: items.length, plannedRestSeconds: 120,
      plannedSets: [{ order: 0, weight: null, reps: 8 }],
    }]));
    setAdding(false); setQuery("");
  }
  function updateItem(index: number, patch: Partial<TemplateExercise>) {
    setItems(items.map((x,i) => i === index ? { ...x, ...patch } : x));
  }
  function updateSet(itemIndex: number, setIndex: number, field: "weight"|"reps", value: string) {
    const item = items[itemIndex];
    const sets = item.plannedSets.map((s,i) => i === setIndex ? {
      ...s,
      [field]: field === "weight" ? (value === "" ? null : Number(value)) : Math.max(1, Number(value) || 1),
    } : s);
    updateItem(itemIndex, { plannedSets: sets });
  }
  async function save() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try { await onSave({ ...template, name: trimmed, exercises: normalize(items) }); }
    finally { setSaving(false); }
  }

  return <section>
    <div className="section-heading template-editor-heading">
      <div><p className="eyebrow">Template editor</p><h1 className="page-title">{isNew ? "Create Template" : "Edit Template"}</h1></div>
      <div className="header-actions"><button className="text-button" onClick={onCancel} disabled={saving}>Cancel</button><button className="primary" onClick={()=>void save()} disabled={!name.trim() || saving}>{saving ? "Saving…" : "Save"}</button></div>
    </div>

    <article className="card template-editor-card"><label>Template name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></label></article>

    <div className="template-add-row">
      <h2>Exercises</h2>
      <button className="secondary compact" onClick={()=>setAdding(!adding)}>+ Add exercise</button>
    </div>
    {adding && <article className="card template-picker">
      <input autoFocus placeholder="Search exercises…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="template-picker-list">{available.slice(0,30).map(ex => <button key={ex.id} className="template-picker-item" onClick={()=>addExercise(ex.id)}><strong>{ex.name}</strong><span>{String(ex.primaryMuscle).replaceAll("_"," ")}</span></button>)}</div>
    </article>}

    <div className="stack template-exercise-stack">{items.map((item,index) => {
      const exercise=exercises.find(x=>x.id===item.exerciseId);
      return <article
        className={`card template-editor-exercise clean-template-card ${dragIndex===index ? "is-dragging" : ""}`}
        key={`${item.exerciseId}-${index}`}
        draggable
        onDragStart={(event)=>{setDragIndex(index); event.dataTransfer.effectAllowed="move";}}
        onDragOver={(event)=>event.preventDefault()}
        onDrop={(event)=>{
          event.preventDefault();
          if (dragIndex===null || dragIndex===index) return;
          const next=[...items];
          const [moved]=next.splice(dragIndex,1);
          next.splice(index,0,moved);
          setItems(normalize(next));
          setDragIndex(null);
        }}
        onDragEnd={()=>setDragIndex(null)}
      >
        <button
          className="exercise-remove-x exercise-remove-x-left"
          onClick={()=>setItems(normalize(items.filter((_,i)=>i!==index)))}
          aria-label={`Remove ${exercise?.name ?? "exercise"}`}
          title="Remove exercise"
        >
          ×
        </button>
        <div className="template-exercise-head">
          <div className="template-title-with-drag">
            <span className="drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
            <div>
              <h2>{exercise?.name ?? "Exercise"}</h2>
              <p>{exercise ? String(exercise.primaryMuscle).replaceAll("_"," ") : ""}</p>
            </div>
          </div>
        </div>

        <div className="template-table">
          <div className="template-table-header">
            <span>Set</span>
            <span>Weight (kg)</span>
            <span>Reps</span>
            <span></span>
          </div>

          {item.plannedSets.map((set,setIndex)=>
            <div className="template-table-row" key={setIndex}>
              <strong>{setIndex+1}</strong>
              <div className="template-weight-field">
                <input type="number" step="0.5" value={set.weight ?? ""} placeholder="History" aria-label={`Set ${setIndex+1} weight`} onChange={e=>updateSet(index,setIndex,"weight",e.target.value)}/>
                <span>kg</span>
              </div>
              <input className="template-reps-field" type="number" min="1" value={set.reps} aria-label={`Set ${setIndex+1} reps`} onChange={e=>updateSet(index,setIndex,"reps",e.target.value)}/>
              <button className="icon-button set-remove" disabled={item.plannedSets.length===1} onClick={()=>updateItem(index,{plannedSets:item.plannedSets.filter((_,i)=>i!==setIndex).map((s,i)=>({...s,order:i}))})} aria-label={`Remove set ${setIndex+1}`}>×</button>
            </div>)}
        </div>

        <div className="template-card-footer">
          <button className="text-button" onClick={()=>updateItem(index,{plannedSets:[...item.plannedSets,{order:item.plannedSets.length,weight:null,reps:8}]})}>+ Add set</button>
          <label className="rest-inline">Rest <input type="number" min="0" step="15" value={item.plannedRestSeconds} onChange={e=>updateItem(index,{plannedRestSeconds:Math.max(0,Number(e.target.value)||0)})}/><span>sec</span></label>
        </div>
      </article>;
    })}</div>

    {items.length===0 && <p className="muted-center">This template has no exercises yet.</p>}
  </section>;
}
