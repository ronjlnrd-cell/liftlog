import { useEffect, useState } from "react";
import "./App.css";
import type { Exercise } from "./domain/entities/Exercise";
import type { Profile } from "./domain/entities/Profile";
import type { WorkoutTemplate } from "./domain/entities/Template";
import type { Workout } from "./domain/entities/workout";
import { exerciseRepository } from "./data/repositories/ExerciseRepository";
import { workoutRepository } from "./data/repositories/WorkoutRepository";
import { profileRepository } from "./data/repositories/ProfileRepository";
import { templateRepository } from "./data/repositories/TemplateRepository";
import { seedExercises } from "./data/seedExercises";
import { formatLabel } from "./shared";
import { WorkoutPage } from "./components/workout/WorkoutPage";
import { HomePage } from "./pages/HomePage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TemplateEditorPage } from "./pages/TemplateEditorPage";

type Page =
  | "home"
  | "workout"
  | "exercises"
  | "templates"
  | "template-editor"
  | "history"
  | "settings";

const emptyProfile: Profile = {
  id: "profile",
  bodyweight: null,
  gender: "UNSPECIFIED",
  weightUnit: "KG",
};

function ensureWorkoutExerciseIds(workout: Workout): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
    })),
  };
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  async function refreshData() {
    await seedExercises();

    const [
      exerciseData,
      workoutData,
      templateData,
      activeData,
      profileData,
    ] = await Promise.all([
      exerciseRepository.getAll(),
      workoutRepository.getAll(),
      templateRepository.getAll(),
      workoutRepository.getActive(),
      profileRepository.get(),
    ]);

    const normalizedWorkouts = workoutData.map(ensureWorkoutExerciseIds);
    const normalizedActive = activeData
      ? ensureWorkoutExerciseIds(activeData)
      : null;

    setExercises(exerciseData);
    setWorkouts(normalizedWorkouts);
    setTemplates(templateData);
    setActiveWorkout(normalizedActive);
    setProfile(profileData);

    if (activeData && activeData.exercises.some((item) => !item.id)) {
      await workoutRepository.saveActive(normalizedActive!);
    }
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
            id: crypto.randomUUID(),
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
    if (
      !activeWorkout ||
      !activeWorkout.exercises.some(
        (item) => item.completedSets.length > 0,
      )
    ) {
      return;
    }

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

    if (
      !window.confirm(
        "Discard this workout? All completed sets in it will be lost.",
      )
    ) {
      return;
    }

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

  if (loading) {
    return <div className="loading">Loading LiftLog…</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}>
          LiftLog
        </button>
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
            exercises={exercises.filter(
              (exercise) => !exercise.archivedAt,
            )}
            unit={profile.weightUnit}
            onStart={() => startWorkout()}
            onChange={updateActiveWorkout}
            onFinish={finishWorkout}
            onCancel={cancelWorkout}
          />
        )}

        {page === "exercises" && (
          <ExercisesPage
            exercises={exercises}
            onRefresh={async () =>
              setExercises(await exerciseRepository.getAll())
            }
          />
        )}

        {page === "templates" && (
          <TemplatesPage
            templates={templates}
            exercises={exercises}
            activeWorkout={activeWorkout}
            onStart={startWorkout}
            onResume={() => setPage("workout")}
            onEdit={(template) => {
              setEditingTemplateId(template.id);
              setPage("template-editor");
            }}
            onDelete={async (id) => {
              await templateRepository.remove(id);
              setTemplates(await templateRepository.getAll());
            }}
          />
        )}

        {page === "template-editor" && (
          <TemplateEditorPage
            template={
              templates.find((template) => template.id === editingTemplateId) ??
              null
            }
            exercises={exercises}
            onCancel={() => {
              setEditingTemplateId(null);
              setPage("templates");
            }}
            onSave={async (template) => {
              await templateRepository.save(template);
              setTemplates(await templateRepository.getAll());
              setEditingTemplateId(null);
              setPage("templates");
            }}
          />
        )}

        {page === "history" && (
          <HistoryPage
            workouts={workouts}
            exercises={exercises}
            onSaveTemplate={saveWorkoutAsTemplate}
          />
        )}

        {page === "settings" && (
          <SettingsPage
            profile={profile}
            onSave={async (next) => {
              await profileRepository.save(next);
              setProfile(next);
            }}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {(
          [
            "home",
            "workout",
            "exercises",
            "history",
            "settings",
          ] as Page[]
        ).map((item) => (
          <button
            key={item}
            className={page === item ? "active" : ""}
            onClick={() => setPage(item)}
          >
            <span>{navIcon(item)}</span>
            {formatLabel(item)}
          </button>
        ))}
      </nav>
    </div>
  );
}

function navIcon(page: Page) {
  return {
    home: "⌂",
    workout: "＋",
    exercises: "≡",
    templates: "▤",
    "template-editor": "▤",
    history: "◷",
    settings: "⚙",
  }[page];
}

export default App;
