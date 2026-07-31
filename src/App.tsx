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
import { HistoryWorkoutEditorPage } from "./pages/HistoryWorkoutEditorPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TemplateEditorPage } from "./pages/TemplateEditorPage";
import { ExerciseDetailsPage } from "./pages/ExerciseDetailsPage";
import { WorkoutSummaryPage } from "./pages/WorkoutSummaryPage";
import { AuthPage } from "./pages/AuthPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";
import { CloudMigrationPage } from "./pages/CloudMigrationPage";
import { WeightPage } from "./pages/WeightPage";
import type { BodyweightEntry } from "./domain/entities/BodyweightEntry";
import { bodyweightRepository } from "./data/repositories/BodyweightRepository";
import { loadCloudData, saveCloudProfile, saveCloudWorkout, saveCloudTemplate, saveCloudCustomExercise, deleteCloudWorkout, deleteCloudTemplate, loadCloudBodyweights, saveCloudBodyweight, deleteCloudBodyweight} from "./data/cloud/cloudData";
import { supabase, supabaseConfigured } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Page =
  | "home"
  | "workout"
  | "workout-summary"
  | "exercises"
  | "exercise-details"
  | "templates"
  | "template-editor"
  | "history"
  | "history-summary"
  | "history-editor"
  | "weight"
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
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [historySummaryId, setHistorySummaryId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [summaryWorkout, setSummaryWorkout] = useState<Workout | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationError, setMigrationError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [cloudLoadError, setCloudLoadError] = useState("");
  const [cloudRetrying, setCloudRetrying] = useState(false);
  const [bodyweights, setBodyweights] = useState<BodyweightEntry[]>([]);

  async function refreshData() {
    await seedExercises();

    const [
      exerciseData,
      workoutData,
      templateData,
      activeData,
      profileData,
      bodyweightData,
    ] = await Promise.all([
      exerciseRepository.getAll(),
      workoutRepository.getAll(),
      templateRepository.getAll(),
      workoutRepository.getActive(),
      profileRepository.get(),
      bodyweightRepository.getAll(),
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
    setBodyweights(bodyweightData);

    if (activeData && activeData.exercises.some((item) => !item.id)) {
      await workoutRepository.saveActive(normalizedActive!);
    }
  }

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function connectCloud(userId: string) {
    const cloud = await loadCloudData(userId);
    const cloudBodyweights = await loadCloudBodyweights(userId);
    const localCustom = exercises.filter((exercise) => exercise.source !== "BUILT_IN");
    const cloudEmpty =
      cloud.workouts.length === 0 &&
      cloud.templates.length === 0 &&
      cloud.customExercises.length === 0 &&
      !cloud.profile;
    const hasLocal =
      workouts.length > 0 || templates.length > 0 || localCustom.length > 0 ||
      Boolean(profile.bodyweight);
    if (cloudEmpty && hasLocal) {
      setMigrationNeeded(true);
      setCloudReady(true);
      return;
    }
    const builtIns = exercises.filter((exercise) => exercise.source === "BUILT_IN");

    // Local completed workouts may include offline entries that have not reached Supabase yet.
    // Never replace them with the cloud list. Merge by id, preferring cloud copies when both exist.
    const localWorkouts = (await workoutRepository.getAll()).map(ensureWorkoutExerciseIds);
    const cloudWorkouts = cloud.workouts.map(ensureWorkoutExerciseIds);
    const mergedWorkoutMap = new Map(localWorkouts.map((workout) => [workout.id, workout]));
    for (const workout of cloudWorkouts) mergedWorkoutMap.set(workout.id, workout);
    const mergedWorkouts = Array.from(mergedWorkoutMap.values()).sort(
      (a, b) =>
        new Date(b.completedAt ?? b.startedAt).getTime() -
        new Date(a.completedAt ?? a.startedAt).getTime(),
    );

    setWorkouts(mergedWorkouts);
    setTemplates(cloud.templates);
    setExercises([...builtIns, ...cloud.customExercises].sort((a,b)=>a.name.localeCompare(b.name)));
    if (cloud.profile) setProfile(cloud.profile);
    setBodyweights(cloudBodyweights);

    // Supabase is authoritative. IndexedDB is retained as a local cache/recovery layer.
    await Promise.all([
      ...mergedWorkouts.map((workout) =>
        workoutRepository.save(ensureWorkoutExerciseIds(workout)),
      ),
      ...cloud.templates.map((template) => templateRepository.save(template)),
      ...(cloud.profile ? [profileRepository.save(cloud.profile)] : []),
      ...cloudBodyweights.map((entry) => bodyweightRepository.save(entry)),
    ]);
    setCloudLoadError("");
    setCloudReady(true);
  }

  async function retryCloudLoad() {
    if (!session || cloudRetrying) return;
    setCloudRetrying(true);
    setCloudLoadError("");
    try {
      await connectCloud(session.user.id);
    } catch (error) {
      console.error(error);
      setCloudLoadError(error instanceof Error ? error.message : "Could not load cloud data.");
    } finally {
      setCloudRetrying(false);
    }
  }

  async function migrateLocalData(userId: string) {
    setMigrationBusy(true); setMigrationError("");
    try {
      const custom = exercises.filter((exercise) => exercise.source !== "BUILT_IN");
      await Promise.all([
        ...workouts.map((workout) => saveCloudWorkout(userId, workout)),
        ...templates.map((template) => saveCloudTemplate(userId, template)),
        ...custom.map((exercise) => saveCloudCustomExercise(userId, exercise)),
        saveCloudProfile(userId, { ...profile, userId, setupCompleted: true }),
      ]);
      const verified = await loadCloudData(userId);
      if (verified.workouts.length < workouts.length || verified.templates.length < templates.length) {
        throw new Error("Cloud verification did not match the local data. Local data was kept.");
      }
      setProfile({ ...profile, userId, setupCompleted: true });
      setMigrationNeeded(false);
    } catch (error) {
      setMigrationError(error instanceof Error ? error.message : "Migration failed.");
    } finally { setMigrationBusy(false); }
  }

  useEffect(() => {
    if (!session || loading || cloudReady) return;
    void connectCloud(session.user.id).catch((error) => {
      console.error(error);
      setCloudLoadError(error instanceof Error ? error.message : "Could not load cloud data.");
      // Local IndexedDB remains usable offline. Mark the initial cloud attempt complete
      // so this effect does not continuously retry and disrupt local History.
      setCloudReady(true);
    });
  }, [session, loading, cloudReady]);

  async function cloudAction(action: () => Promise<void>) {
    try {
      setSyncMessage("Syncing…");
      await action();
      setSyncMessage("");
      return true;
    } catch (error) {
      console.error(error);
      setSyncMessage("Sync failed — check connection and try again");
      return false;
    }
  }

  useEffect(() => {
    if (!session) return;

    const syncLocalWorkouts = async () => {
      const localWorkouts = await workoutRepository.getAll();
      if (localWorkouts.length === 0) return;

      let failed = false;
      for (const workout of localWorkouts) {
        try {
          await saveCloudWorkout(session.user.id, workout);
        } catch (error) {
          failed = true;
          console.error(error);
          break;
        }
      }

      if (!failed) {
        setSyncMessage("");
        try {
          await connectCloud(session.user.id);
        } catch (error) {
          console.error(error);
        }
      }
    };

    const handleOnline = () => {
      void syncLocalWorkouts();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [session]);

  async function startWorkout(template?: WorkoutTemplate) {
    const workout: Workout = {
      id: "active",
      startedAt: new Date(),
      completedAt: null,
      bodyweight: profile.bodyweight,
      sourceTemplateId: template?.id,
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

    // Persist locally FIRST. Finishing a workout must never depend on network access.
    await workoutRepository.save(completed);
    await workoutRepository.clearActive();

    // Update the UI immediately from local storage before attempting cloud sync.
    setActiveWorkout(null);
    setWorkouts((current) => {
      const withoutDuplicate = current.filter((workout) => workout.id !== completed.id);
      return [completed, ...withoutDuplicate];
    });
    setSummaryWorkout(completed);
    setPage("workout-summary");

    if (session) {
      const synced = await cloudAction(() =>
        saveCloudWorkout(session.user.id, completed),
      );
      if (!synced) {
        setSyncMessage("Workout saved on device — cloud sync pending");
      }
    }

    return;

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

    if (session) {
      const synced = await cloudAction(() => saveCloudTemplate(session.user.id, template));
      if (!synced) await templateRepository.save(template);
    } else {
      await templateRepository.save(template);
    }
    setTemplates(await templateRepository.getAll());
    setPage("templates");
  }

  async function applyProgressionToSourceTemplate(
    workout: Workout,
    exerciseId: string,
    option: { nextWeight: number; reps: number; sets: number; restSeconds?: number },
  ) {
    if (!workout.sourceTemplateId) return;

    const template = templates.find(
      (candidate) => candidate.id === workout.sourceTemplateId,
    );
    if (!template) return;

    const updated: WorkoutTemplate = {
      ...template,
      exercises: template.exercises.map((item) =>
        item.exerciseId === exerciseId
          ? {
              ...item,
              plannedRestSeconds:
                option.restSeconds ?? item.plannedRestSeconds,
              plannedSets: Array.from({ length: option.sets }, (_, index) => ({
                order: index,
                weight: option.nextWeight,
                reps: option.reps,
              })),
            }
          : item,
      ),
    };

    await templateRepository.save(updated);
    setTemplates(await templateRepository.getAll());
  }

  const profileNeedsSetup =
    Boolean(session) &&
    !profile.setupCompleted &&
    !(profile.bodyweight && profile.bodyweight > 0 && profile.gender !== "UNSPECIFIED");

  if (session && !profile.setupCompleted && !profileNeedsSetup) {
    profile.setupCompleted = true;
    profile.userId = session.user.id;
    void profileRepository.save(profile);
  }

  if (loading || authLoading) {
    return <div className="loading">Loading LiftLog…</div>;
  }

  if (!supabaseConfigured) {
    return (
      <main className="auth-shell">
        <section className="card auth-card">
          <h1>Connect LiftLog authentication</h1>
          <p>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file, then restart Vite.</p>
        </section>
      </main>
    );
  }

  if (!session) return <AuthPage />;

  if (session && migrationNeeded) {
    const customCount = exercises.filter((exercise) => exercise.source !== "BUILT_IN").length;
    return (
      <CloudMigrationPage
        workouts={workouts.length}
        templates={templates.length}
        customExercises={customCount}
        busy={migrationBusy}
        error={migrationError}
        onMigrate={() => migrateLocalData(session.user.id)}
        onSkip={() => setMigrationNeeded(false)}
      />
    );
  }

  if (profileNeedsSetup) {
    return (
      <ProfileSetupPage
        initial={profile}
        email={session.user.email ?? ""}
        onComplete={async (nextProfile) => {
          const ownedProfile = {
            ...nextProfile,
            userId: session.user.id,
            setupCompleted: true,
          };
          const synced = await cloudAction(() => saveCloudProfile(session.user.id, ownedProfile));
          if (!synced) await profileRepository.save(ownedProfile);
          setProfile(ownedProfile);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}>
          LiftLog
        </button>
        {(syncMessage || cloudLoadError) && (
          <span className="sync-status">
            {syncMessage || "Offline — using data saved on this device"}
            {cloudLoadError && (
              <button className="text-button" onClick={() => void retryCloudLoad()}>
                Retry
              </button>
            )}
          </span>
        )}
        <div className="account-header">
          <span className="tagline">{session.user.email}</span>
          <button className="text-button" onClick={() => void supabase?.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page-wrap">
        {page === "home" && (
          <HomePage
            activeWorkout={activeWorkout}
            exercises={exercises}
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
            history={workouts}
            onStart={() => startWorkout()}
            onChange={updateActiveWorkout}
            onFinish={finishWorkout}
            onCancel={cancelWorkout}
          />
        )}

        {page === "workout-summary" && summaryWorkout && (
          <WorkoutSummaryPage
            workout={summaryWorkout}
            workouts={workouts}
            exercises={exercises}
            unit={profile.weightUnit}
            sourceTemplate={
              summaryWorkout.sourceTemplateId
                ? templates.find(
                    (template) => template.id === summaryWorkout.sourceTemplateId,
                  ) ?? null
                : null
            }
            onApplyProgression={(exerciseId, option) =>
              applyProgressionToSourceTemplate(summaryWorkout, exerciseId, option)
            }
            onDone={() => {
              setSummaryWorkout(null);
              setPage("history");
            }}
            onSaveTemplate={() => saveWorkoutAsTemplate(summaryWorkout)}
          />
        )}

        {page === "exercises" && (
          <ExercisesPage
            exercises={exercises}
            workouts={workouts}
            onRefresh={async () =>
              setExercises(await exerciseRepository.getAll())
            }
            onOpen={(exercise) => {
              setSelectedExerciseId(exercise.id);
              setPage("exercise-details");
            }}
          />
        )}

        {page === "exercise-details" && (
          <ExerciseDetailsPage
            exercise={
              exercises.find((exercise) => exercise.id === selectedExerciseId) ??
              null
            }
            workouts={workouts}
            unit={profile.weightUnit}
            gender={profile.gender}
            onBack={() => {
              setSelectedExerciseId(null);
              setPage("exercises");
            }}
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
              if (session) {
                const deleted = await cloudAction(() =>
                  deleteCloudTemplate(session.user.id, id),
                );
                if (!deleted) return;
              }
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
              if (session) {
                const synced = await cloudAction(() =>
                  saveCloudTemplate(session.user.id, template),
                );
                // Supabase is authoritative; IndexedDB mirrors successful cloud state for UI/recovery.
                await templateRepository.save(template);
                if (!synced) setSyncMessage("Not synced — retry when online");
              } else {
                await templateRepository.save(template);
              }
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
            unit={profile.weightUnit}
            onOpen={(workout) => {
              setHistorySummaryId(workout.id);
              setPage("history-summary");
            }}
            onSaveTemplate={saveWorkoutAsTemplate}
            onEdit={(workout) => {
              setEditingWorkoutId(workout.id);
              setPage("history-editor");
            }}
            onDelete={async (workout) => {
              if (
                !window.confirm(
                  "Delete this workout permanently? This cannot be undone.",
                )
              ) {
                return;
              }

              if (session) {
                const deleted = await cloudAction(() =>
                  deleteCloudWorkout(session.user.id, workout.id),
                );
                if (!deleted) return;
              }
              await workoutRepository.remove(workout.id);
              setWorkouts(await workoutRepository.getAll());
            }}
          />
        )}

        {page === "history-summary" && historySummaryId && (() => {
          const historicalWorkout =
            workouts.find((workout) => workout.id === historySummaryId) ?? null;
          return historicalWorkout ? (
            <WorkoutSummaryPage
              workout={historicalWorkout}
              workouts={workouts}
              exercises={exercises}
              unit={profile.weightUnit}
              sourceTemplate={null}
              onApplyProgression={async () => {}}
              historical
              onEdit={() => {
                setEditingWorkoutId(historicalWorkout.id);
                setPage("history-editor");
              }}
              onDelete={async () => {
                if (
                  !window.confirm(
                    "Delete this workout permanently? This cannot be undone.",
                  )
                ) return;
                if (session) {
                  const deleted = await cloudAction(() =>
                    deleteCloudWorkout(session.user.id, historicalWorkout.id),
                  );
                  if (!deleted) return;
                }
                await workoutRepository.remove(historicalWorkout.id);
                setWorkouts(await workoutRepository.getAll());
                setHistorySummaryId(null);
                setPage("history");
              }}
              onSaveTemplate={() => saveWorkoutAsTemplate(historicalWorkout)}
              onDone={() => {
                setHistorySummaryId(null);
                setPage("history");
              }}
            />
          ) : null;
        })()}

        {page === "history-editor" && (
          <HistoryWorkoutEditorPage
            workout={
              workouts.find((workout) => workout.id === editingWorkoutId) ??
              null
            }
            exercises={exercises}
            onCancel={() => {
              setEditingWorkoutId(null);
              setPage("history");
            }}
            onSave={async (workout) => {
              await workoutRepository.save(workout);
              setWorkouts(await workoutRepository.getAll());
              setEditingWorkoutId(null);
              setPage("history");
            }}
          />
        )}

        {page === "weight" && (
          <WeightPage
            entries={bodyweights}
            unit={profile.weightUnit}
            onAdd={async (weight, date) => {
              if (!session) return;
              const entry: BodyweightEntry = {
                id: crypto.randomUUID(),
                userId: session.user.id,
                weight,
                recordedAt: new Date(`${date}T12:00:00`).toISOString(),
                createdAt: new Date().toISOString(),
              };
              const saved = await cloudAction(() => saveCloudBodyweight(session.user.id, entry));
              if (!saved) return;
              await bodyweightRepository.save(entry);
              const next = await bodyweightRepository.getAll();
              setBodyweights(next);
              const latest = next[0];
              if (latest) {
                const nextProfile = { ...profile, bodyweight: latest.weight };
                await profileRepository.save(nextProfile);
                setProfile(nextProfile);
                await cloudAction(() => saveCloudProfile(session.user.id, nextProfile));
              }
            }}
            onDelete={async (id) => {
              if (!session) return;
              const deleted = await cloudAction(() => deleteCloudBodyweight(session.user.id, id));
              if (!deleted) return;
              await bodyweightRepository.remove(id);
              setBodyweights(await bodyweightRepository.getAll());
            }}
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
            "templates",
            "history",
            "weight",
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
    "workout-summary": "✓",
    exercises: "≡",
    "exercise-details": "≡",
    templates: "▤",
    "template-editor": "▤",
    history: "◷",
    "history-editor": "◷",
    weight: "↕",
    settings: "⚙",
  }[page];
}

export default App;
