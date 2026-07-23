import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Exercise } from "./domain/entities/Exercise";
import type { Profile } from "./domain/entities/Profile";
import type { WorkoutTemplate } from "./domain/entities/Template";
import type { Workout, WorkoutExercise } from "./domain/entities/workout";
import { MuscleGroup } from "./domain/types/MuscleGroup";
import { MovementPattern } from "./domain/types/MovementPattern";
import { LoadType } from "./domain/types/LoadType";
import { ExerciseSource } from "./domain/types/exercise-source";
import { exerciseRepository } from "./data/repositories/ExerciseRepository";
import { workoutRepository } from "./data/repositories/WorkoutRepository";
import { profileRepository } from "./data/repositories/ProfileRepository";
import { templateRepository } from "./data/repositories/TemplateRepository";
import { seedExercises } from "./data/seedExercises";
import { formatDate, formatLabel } from "./shared";
import { ExercisePicker } from "./components/ExercisePicker";

type Page = "home" | "workout" | "exercises" | "templates" | "history" | "settings";

const emptyProfile: Profile = {
  id: "profile",
  bodyweight: null,
  gender: "UNSPECIFIED",
  weightUnit: "KG",
};

function App() {
  const [page, setPage] = useState<Page>("home");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);

  async function refreshData() {
    await seedExercises();
    const [exerciseData, workoutData, templateData, activeData, profileData] = await Promise.all([
      exerciseRepository.getAll(),
      workoutRepository.getAll(),
      templateRepository.getAll(),
      workoutRepository.getActive(),
      profileRepository.get(),
    ]);
    setExercises(exerciseData);
    setWorkouts(workoutData);
    setTemplates(templateData);
    setActiveWorkout(activeData ?? null);
    setProfile(profileData);
  }

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, []);

  async function startWorkout(template?: WorkoutTemplate) {
    const workout: Workout = {
      id: "active",
      startedAt: new Date(),
      completedAt: null,
      bodyweight: profile.bodyweight,
      exercises: template
        ? template.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            order: item.order,
            plannedRestSeconds: item.plannedRestSeconds,
            plannedSets: item.plannedSets.map((set) => ({ ...set })),
            completedSets: [],
          }))
        : [],
    };
    await workoutRepository.saveActive(workout);
    setActiveWorkout(workout);
    setPage("workout");
  }

  async function updateActiveWorkout(workout: Workout) {
    setActiveWorkout(workout);
    await workoutRepository.saveActive(workout);
  }

  async function finishWorkout() {
    if (!activeWorkout || !activeWorkout.exercises.some((item) => item.completedSets.length > 0)) return;
    const completed: Workout = {
      ...activeWorkout,
      id: crypto.randomUUID(),
      completedAt: new Date(),
    };
    await workoutRepository.save(completed);
    await workoutRepository.clearActive();
    setActiveWorkout(null);
    setWorkouts(await workoutRepository.getAll());
    setPage("history");
  }

  async function cancelWorkout() {
    if (!activeWorkout) return;
    if (!window.confirm("Discard this workout? All completed sets in it will be lost.")) return;
    await workoutRepository.clearActive();
    setActiveWorkout(null);
    setPage("home");
  }

  async function saveWorkoutAsTemplate(workout: Workout) {
    const defaultName = `Workout ${templates.length + 1}`;
    const name = window.prompt("Template name", defaultName)?.trim();
    if (!name) return;

    const template: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
      exercises: workout.exercises.map((item) => ({
        exerciseId: item.exerciseId,
        order: item.order,
        plannedRestSeconds: item.plannedRestSeconds,
        plannedSets: item.completedSets.map((set) => ({
          order: set.order,
          weight: set.weight,
          reps: set.reps,
        })),
      })),
    };

    await templateRepository.save(template);
    setTemplates(await templateRepository.getAll());
    setPage("templates");
  }

  if (loading) return <div className="loading">Loading LiftLog…</div>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}>LiftLog</button>
        <span className="tagline">Train. Track. Progress.</span>
      </header>

      <main className="page-wrap">
        {page === "home" && (
          <HomePage
            activeWorkout={activeWorkout}
            workouts={workouts}
            templates={templates}
            onStart={() => startWorkout()}
            onStartTemplate={startWorkout}
            onResume={() => setPage("workout")}
            onHistory={() => setPage("history")}
            onTemplates={() => setPage("templates")}
          />
        )}
        {page === "workout" && (
          <WorkoutPage
            workout={activeWorkout}
            exercises={exercises.filter((exercise) => !exercise.archivedAt)}
            unit={profile.weightUnit}
            onStart={() => startWorkout()}
            onChange={updateActiveWorkout}
            onFinish={finishWorkout}
            onCancel={cancelWorkout}
          />
        )}
        {page === "exercises" && (
          <ExercisesPage exercises={exercises} onRefresh={async () => setExercises(await exerciseRepository.getAll())} />
        )}
        {page === "templates" && (
          <TemplatesPage
            templates={templates}
            exercises={exercises}
            activeWorkout={activeWorkout}
            onStart={startWorkout}
            onResume={() => setPage("workout")}
            onDelete={async (id) => {
              await templateRepository.remove(id);
              setTemplates(await templateRepository.getAll());
            }}
          />
        )}
        {page === "history" && (
          <HistoryPage workouts={workouts} exercises={exercises} onSaveTemplate={saveWorkoutAsTemplate} />
        )}
        {page === "settings" && (
          <SettingsPage profile={profile} onSave={async (next) => { await profileRepository.save(next); setProfile(next); }} />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {(["home", "workout", "exercises", "history", "settings"] as Page[]).map((item) => (
          <button key={item} className={page === item ? "active" : ""} onClick={() => setPage(item)}>
            <span>{navIcon(item)}</span>{formatLabel(item)}
          </button>
        ))}
      </nav>
    </div>
  );
}

function navIcon(page: Page) {
  return { home: "⌂", workout: "＋", exercises: "≡", templates: "▤", history: "◷", settings: "⚙" }[page];
}

function HomePage({ activeWorkout, workouts, templates, onStart, onStartTemplate, onResume, onHistory, onTemplates }: {
  activeWorkout: Workout | null;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onStart: () => void;
  onStartTemplate: (template: WorkoutTemplate) => void;
  onResume: () => void;
  onHistory: () => void;
  onTemplates: () => void;
}) {
  const last = workouts[0];
  const recentTemplates = templates.slice(0, 3);

  return (
    <section>
      <div className="hero-card">
        <p className="eyebrow">READY TO TRAIN?</p>
        <h1>{activeWorkout ? "Your workout is in progress" : "Build strength, one set at a time."}</h1>
        <p>Fast logging without distractions.</p>
        <button className="primary large" onClick={activeWorkout ? onResume : onStart}>
          {activeWorkout ? "Resume Workout" : "Start Empty Workout"}
        </button>
      </div>

      {!activeWorkout && recentTemplates.length > 0 && (
        <article className="card section-card">
          <div className="section-heading"><h2>Start from template</h2><button className="text-button" onClick={onTemplates}>View all</button></div>
          <div className="template-quick-list">
            {recentTemplates.map((template) => (
              <button key={template.id} className="template-quick-button" onClick={() => onStartTemplate(template)}>
                <strong>{template.name}</strong>
                <span>{template.exercises.length} exercises</span>
              </button>
            ))}
          </div>
        </article>
      )}

      <div className="stat-grid">
        <article className="card"><span>Total workouts</span><strong>{workouts.length}</strong></article>
        <article className="card"><span>This week</span><strong>{workouts.filter((w) => Date.now() - new Date(w.startedAt).getTime() < 7 * 86400000).length}</strong></article>
      </div>

      <article className="card section-card">
        <div className="section-heading"><h2>Last workout</h2><button className="text-button" onClick={onHistory}>View history</button></div>
        {last ? (
          <><strong>{formatDate(last.startedAt)}</strong><p>{last.exercises.length} exercises · {last.exercises.reduce((sum, e) => sum + e.completedSets.length, 0)} sets</p></>
        ) : <p>No completed workouts yet.</p>}
      </article>
    </section>
  );
}

function WorkoutPage({ workout, exercises, unit, onStart, onChange, onFinish, onCancel }: {
  workout: Workout | null;
  exercises: Exercise[];
  unit: "KG" | "LB";
  onStart: () => void;
  onChange: (workout: Workout) => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!restEndAt) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const next = Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0) setRestEndAt(null);
    };

    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [restEndAt]);

  if (!workout) return <EmptyState title="No active workout" text="Start a workout and begin logging sets." action="Start Workout" onAction={onStart} />;

  function addExercise(exerciseId: string) {
    if (workout.exercises.some((item) => item.exerciseId === exerciseId)) return;
    const next: WorkoutExercise = { exerciseId, order: workout.exercises.length, plannedRestSeconds: 120, plannedSets: [], completedSets: [] };
    onChange({ ...workout, exercises: [...workout.exercises, next] });
  }

  function removeExercise(exerciseId: string) {
    const nextExercises = workout.exercises
      .filter((item) => item.exerciseId !== exerciseId)
      .map((item, index) => ({ ...item, order: index }));
    onChange({ ...workout, exercises: nextExercises });
  }

  function addSet(exerciseId: string, weight: number, reps: number) {
    const target = workout.exercises.find((item) => item.exerciseId === exerciseId);
    if (!target) return;

    onChange({
      ...workout,
      exercises: workout.exercises.map((item) => item.exerciseId === exerciseId
        ? { ...item, completedSets: [...item.completedSets, { order: item.completedSets.length, weight, reps, completedAt: new Date() }] }
        : item),
    });
    setRestEndAt(Date.now() + target.plannedRestSeconds * 1000);
  }

  function deleteSet(exerciseId: string, setOrder: number) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) => item.exerciseId === exerciseId
        ? { ...item, completedSets: item.completedSets.filter((set) => set.order !== setOrder).map((set, index) => ({ ...set, order: index })) }
        : item),
    });
  }

  function updateRest(exerciseId: string, restSeconds: number) {
    onChange({
      ...workout,
      exercises: workout.exercises.map((item) => item.exerciseId === exerciseId ? { ...item, plannedRestSeconds: restSeconds } : item),
    });
  }

  const canFinish = workout.exercises.some((item) => item.completedSets.length > 0);

  return (
    <section>
      <div className="section-heading workout-heading">
        <div><p className="eyebrow">ACTIVE WORKOUT</p><h1 className="page-title">Workout</h1></div>
        <div className="header-actions"><button className="danger-text" onClick={onCancel}>Discard</button><button className="primary" disabled={!canFinish} onClick={onFinish}>Finish</button></div>
      </div>

      {restEndAt && (
        <div className="rest-timer card">
          <div><span>Rest timer</span><strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</strong></div>
          <button className="text-button" onClick={() => setRestEndAt(null)}>Skip</button>
        </div>
      )}

      <ExercisePicker
        exercises={exercises}
        excludedExerciseIds={workout.exercises.map((item) => item.exerciseId)}
        onSelect={addExercise}
      />
      {workout.exercises.length === 0 && <p className="muted-center">Add your first exercise above.</p>}
      <div className="stack">
        {workout.exercises.map((item) => {
          const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
          return exercise ? <WorkoutExerciseCard key={item.exerciseId} exercise={exercise} item={item} unit={unit} onAddSet={addSet} onDeleteSet={deleteSet} onRemove={removeExercise} onRestChange={updateRest} /> : null;
        })}
      </div>
    </section>
  );
}

function WorkoutExerciseCard({ exercise, item, unit, onAddSet, onDeleteSet, onRemove, onRestChange }: {
  exercise: Exercise;
  item: WorkoutExercise;
  unit: string;
  onAddSet: (id: string, weight: number, reps: number) => void;
  onDeleteSet: (id: string, setOrder: number) => void;
  onRemove: (id: string) => void;
  onRestChange: (id: string, restSeconds: number) => void;
}) {
  const plannedNext = item.plannedSets[item.completedSets.length];
  const previous = item.completedSets.at(-1);
  const [weight, setWeight] = useState(plannedNext?.weight ?? previous?.weight ?? 0);
  const [reps, setReps] = useState(plannedNext?.reps ?? previous?.reps ?? 5);

  useEffect(() => {
    const nextPlan = item.plannedSets[item.completedSets.length];
    if (nextPlan) {
      setWeight(nextPlan.weight ?? 0);
      setReps(nextPlan.reps);
    }
  }, [item.completedSets.length, item.plannedSets]);

  return (
    <article className="card workout-card">
      <div className="section-heading">
        <div><h2>{exercise.name}</h2><p>{formatLabel(exercise.primaryMuscle)}</p></div>
        <div className="exercise-actions"><span className="set-count">{item.completedSets.length}/{item.plannedSets.length || "–"} sets</span><button className="danger-text" onClick={() => onRemove(exercise.id)}>Remove</button></div>
      </div>
      {item.completedSets.length > 0 && <div className="sets-list">{item.completedSets.map((set, index) => <div key={set.order}><span>Set {index + 1}</span><strong>{set.weight} {unit.toLowerCase()} × {set.reps}</strong><button className="icon-button" aria-label={`Delete set ${index + 1}`} onClick={() => onDeleteSet(exercise.id, set.order)}>×</button></div>)}</div>}
      {plannedNext && <p className="plan-hint">Planned next: {plannedNext.weight ?? 0} {unit.toLowerCase()} × {plannedNext.reps}</p>}
      <div className="set-entry">
        <label>Weight<input type="number" min="0" step="0.5" value={weight} onChange={(e) => setWeight(Number(e.target.value))} /></label>
        <label>Reps<input type="number" min="1" value={reps} onChange={(e) => setReps(Number(e.target.value))} /></label>
        <button className="primary" disabled={reps < 1 || weight < 0} onClick={() => onAddSet(exercise.id, weight, reps)}>Complete set</button>
      </div>
      <label className="rest-setting">Rest after set<select value={item.plannedRestSeconds} onChange={(e) => onRestChange(exercise.id, Number(e.target.value))}><option value={60}>1:00</option><option value={90}>1:30</option><option value={120}>2:00</option><option value={180}>3:00</option><option value={240}>4:00</option><option value={300}>5:00</option></select></label>
    </article>
  );
}

function ExercisesPage({ exercises, onRefresh }: { exercises: Exercise[]; onRefresh: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const visible = useMemo(() => exercises.filter((e) => !e.archivedAt && e.name.toLowerCase().includes(query.toLowerCase())), [exercises, query]);

  async function addExercise() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (exercises.some((e) => e.name.toLowerCase() === trimmed.toLowerCase() && !e.archivedAt)) { setError("An exercise with this name already exists."); return; }
    await exerciseRepository.add({ id: crypto.randomUUID(), name: trimmed, primaryMuscle: MuscleGroup.UNKNOWN, movementPattern: MovementPattern.UNKNOWN, loadType: LoadType.UNKNOWN, defaultWeightIncrement: null, source: ExerciseSource.CUSTOM, archivedAt: null });
    setName(""); setError(""); await onRefresh();
  }

  return (
    <section>
      <h1 className="page-title">Exercises</h1>
      <div className="card form-card"><h2>Add custom exercise</h2><div className="add-row"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" /><button className="primary" onClick={addExercise}>Add</button></div>{error && <p className="error">{error}</p>}</div>
      <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises…" />
      <div className="exercise-list">{visible.map((exercise) => <article className="card exercise-row" key={exercise.id}><div><strong>{exercise.name}</strong><p>{formatLabel(exercise.primaryMuscle)} · {formatLabel(exercise.loadType)}</p></div>{exercise.source === ExerciseSource.CUSTOM && <button className="danger-text" onClick={async () => { await exerciseRepository.archive(exercise.id); await onRefresh(); }}>Archive</button>}</article>)}</div>
    </section>
  );
}

function TemplatesPage({ templates, exercises, activeWorkout, onStart, onResume, onDelete }: {
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  activeWorkout: Workout | null;
  onStart: (template: WorkoutTemplate) => void;
  onResume: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <section>
      <h1 className="page-title">Templates</h1>
      {activeWorkout && <div className="card active-notice"><div><strong>Workout in progress</strong><p>Finish or discard it before starting another.</p></div><button className="primary" onClick={onResume}>Resume</button></div>}
      {templates.length === 0 ? (
        <EmptyState title="No templates yet" text="Complete a workout, then save it as a template from History." />
      ) : (
        <div className="stack">
          {templates.map((template) => (
            <article className="card template-card" key={template.id}>
              <div className="section-heading">
                <div><h2>{template.name}</h2><p>{template.exercises.length} exercises</p></div>
                <div className="header-actions"><button className="danger-text" onClick={() => onDelete(template.id)}>Delete</button><button className="primary" disabled={Boolean(activeWorkout)} onClick={() => onStart(template)}>Start</button></div>
              </div>
              <div className="template-exercises">
                {template.exercises.map((item) => {
                  const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
                  return <span key={item.exerciseId}>{exercise?.name ?? "Exercise"} · {item.plannedSets.length} sets</span>;
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryPage({ workouts, exercises, onSaveTemplate }: { workouts: Workout[]; exercises: Exercise[]; onSaveTemplate: (workout: Workout) => void }) {
  return (
    <section>
      <h1 className="page-title">History</h1>
      {workouts.length === 0 ? (
        <EmptyState title="No workout history" text="Your completed workouts will appear here." />
      ) : (
        <div className="stack">
          {workouts.map((workout) => (
            <article className="card history-card" key={workout.id}>
              <div className="section-heading">
                <div><strong>{formatDate(workout.startedAt)}</strong><p>{workout.exercises.reduce((sum, e) => sum + e.completedSets.length, 0)} sets</p></div>
                <button className="text-button" onClick={() => onSaveTemplate(workout)}>Save as template</button>
              </div>
              {workout.exercises.map((item) => <p key={item.exerciseId}>{exercises.find((e) => e.id === item.exerciseId)?.name ?? "Exercise"}: {item.completedSets.map((s) => `${s.weight}×${s.reps}`).join(", ")}</p>)}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SettingsPage({ profile, onSave }: { profile: Profile; onSave: (profile: Profile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  return <section><h1 className="page-title">Settings</h1><div className="card settings-card"><label>Bodyweight<input type="number" min="0" step="0.1" value={draft.bodyweight ?? ""} onChange={(e) => setDraft({ ...draft, bodyweight: e.target.value ? Number(e.target.value) : null })} /></label><label>Gender<select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value as Profile["gender"] })}><option value="UNSPECIFIED">Prefer not to say</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label><label>Weight unit<select value={draft.weightUnit} onChange={(e) => setDraft({ ...draft, weightUnit: e.target.value as Profile["weightUnit"] })}><option value="KG">Kilograms</option><option value="LB">Pounds</option></select></label><button className="primary" onClick={async () => { await onSave(draft); setSaved(true); setTimeout(() => setSaved(false), 1800); }}>Save settings</button>{saved && <p className="success">Saved.</p>}</div></section>;
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty card"><h2>{title}</h2><p>{text}</p>{action && onAction && <button className="primary" onClick={onAction}>{action}</button>}</div>;
}

export default App;
