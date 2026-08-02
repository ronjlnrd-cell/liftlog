import { useEffect, useRef, useState } from "react";
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
import { formatLabel, APP_NAME } from "./shared";
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
import {
  closeUserDatabase,
  openUserDatabase,
} from "./data/database/databaseManager";
import { loadCloudData, saveCloudProfile, saveCloudWorkout, saveCloudTemplate, saveCloudCustomExercise, deleteCloudWorkout, deleteCloudTemplate, loadCloudBodyweights, saveCloudBodyweight, deleteCloudBodyweight, type CloudWorkout } from "./data/cloud/cloudData";
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
  gender: "UNSPECIFIED",
  weightUnit: "KG",
};

type PendingSync =
  | { kind: "workout"; id: string }
  | { kind: "template"; id: string }
  | { kind: "bodyweight"; id: string }
  | { kind: "delete-workout"; id: string }
  | { kind: "delete-template"; id: string }
  | { kind: "delete-bodyweight"; id: string }
  | { kind: "profile" };

function ensureWorkoutExerciseIds(workout: Workout): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
    })),
  };
}

function chooseWorkout(
  local: Workout,
  cloud: CloudWorkout,
  pending: PendingSync[],
): Workout {
  if (
    pending.some(
      (item) => item.kind === "workout" && item.id === local.id,
    )
  ) {
    return local;
  }

  const cloudTime = new Date(cloud.updatedAt).getTime();
  const localTime = local.updatedAt
    ? new Date(local.updatedAt).getTime()
    : new Date(local.completedAt ?? local.startedAt).getTime();

  return localTime >= cloudTime ? local : cloud.workout;
}

function compareWorkoutsNewestFirst(a: Workout, b: Workout): number {
  return (
    new Date(b.completedAt ?? b.startedAt).getTime() -
    new Date(a.completedAt ?? a.startedAt).getTime()
  );
}

function sortWorkoutsByDate(workouts: Workout[]): Workout[] {
  return [...workouts].sort(compareWorkoutsNewestFirst);
}

function mergeWorkouts(
  localWorkouts: Workout[],
  cloudWorkouts: CloudWorkout[],
  pending: PendingSync[],
): Workout[] {
  const localById = new Map(localWorkouts.map((workout) => [workout.id, workout]));
  const merged = new Map<string, Workout>();

  for (const local of localWorkouts) {
    merged.set(local.id, local);
  }

  for (const cloud of cloudWorkouts) {
    const local = localById.get(cloud.workout.id);
    if (!local) {
      merged.set(cloud.workout.id, cloud.workout);
      continue;
    }
    merged.set(cloud.workout.id, chooseWorkout(local, cloud, pending));
  }

  return sortWorkoutsByDate(Array.from(merged.values()));
}

function App() {
  const activeUserIdRef = useRef<string | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
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

  function getLatestBodyweight() {
  return bodyweights.length > 0 ? bodyweights[0].weight : null;
  }

  function resetAppState() {
    setPage("home");
    setExercises([]);
    setWorkouts([]);
    setTemplates([]);
    setActiveWorkout(null);
    setProfile(emptyProfile);
    setBodyweights([]);
    setEditingTemplateId(null);
    setEditingWorkoutId(null);
    setHistorySummaryId(null);
    setSelectedExerciseId(null);
    setSummaryWorkout(null);
    setMigrationNeeded(false);
    setMigrationError("");
    setSyncMessage("");
    setCloudLoadError("");
  }

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

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const userId = session?.user.id ?? null;

    if (userId === activeUserIdRef.current && dbReady) {
      return;
    }

    async function syncDatabaseToSession() {
      setDbReady(false);
      setCloudReady(false);

      try {
        if (!userId) {
          await closeUserDatabase();
          if (cancelled) return;
          activeUserIdRef.current = null;
          resetAppState();
          return;
        }

        await openUserDatabase(userId);
        if (cancelled) return;

        activeUserIdRef.current = userId;
        resetAppState();
        await refreshData();
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setCloudLoadError(
            error instanceof Error
              ? error.message
              : "Could not open local database.",
          );
        }
      } finally {
        if (!cancelled) {
          setDbReady(true);
          setLoading(false);
        }
      }
    }

    void syncDatabaseToSession();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, authLoading]);

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
      workouts.length > 0 ||
      templates.length > 0 ||
      localCustom.length > 0;
    if (cloudEmpty && hasLocal) {
      setMigrationNeeded(true);
      setCloudReady(true);
      return;
    }
    const builtIns = exercises.filter((exercise) => exercise.source === "BUILT_IN");

    // Merge by id: keep local when a pending sync exists, otherwise prefer the newest revision.
    const localWorkouts = (await workoutRepository.getAll()).map(ensureWorkoutExerciseIds);
    const cloudWorkouts: CloudWorkout[] = cloud.workouts.map(({ workout, updatedAt }) => ({
      workout: ensureWorkoutExerciseIds(workout),
      updatedAt,
    }));
    const mergedWorkouts = mergeWorkouts(
      localWorkouts,
      cloudWorkouts,
      readPending(),
    );

    const localTemplates = await templateRepository.getAll();
    const templateMap = new Map(cloud.templates.map((template) => [template.id, template]));
    for (const template of localTemplates) {
      if (!templateMap.has(template.id)) templateMap.set(template.id, template);
    }
    const mergedTemplates = Array.from(templateMap.values());

    const localBodyweights = await bodyweightRepository.getAll();
    const bodyweightMap = new Map(cloudBodyweights.map((entry) => [entry.id, entry]));
    for (const entry of localBodyweights) {
      if (!bodyweightMap.has(entry.id)) bodyweightMap.set(entry.id, entry);
    }
    const mergedBodyweights = Array.from(bodyweightMap.values()).sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );

    setWorkouts(mergedWorkouts);
    setTemplates(mergedTemplates);
    setExercises([...builtIns, ...cloud.customExercises].sort((a,b)=>a.name.localeCompare(b.name)));
    if (cloud.profile) setProfile(cloud.profile);
    setBodyweights(mergedBodyweights);

    await Promise.all([
      ...mergedWorkouts.map((workout) =>
        workoutRepository.save(ensureWorkoutExerciseIds(workout)),
      ),
      ...mergedTemplates.map((template) => templateRepository.save(template)),
      ...(cloud.profile ? [profileRepository.save(cloud.profile)] : []),
      ...mergedBodyweights.map((entry) => bodyweightRepository.save(entry)),
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
    if (!session || !dbReady || cloudReady) return;
    void connectCloud(session.user.id).catch((error) => {
      console.error(error);
      setCloudLoadError(error instanceof Error ? error.message : "Could not load cloud data.");
      // Local IndexedDB remains usable offline. Mark the initial cloud attempt complete
      // so this effect does not continuously retry and disrupt local History.
      setCloudReady(true);
    });
  }, [session?.user.id, dbReady, cloudReady]);

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

  const pendingKey = session ? `liftlog-pending-sync:${session.user.id}` : "liftlog-pending-sync";

  function readPending(): PendingSync[] {
    try {
      return JSON.parse(localStorage.getItem(pendingKey) ?? "[]") as PendingSync[];
    } catch {
      return [];
    }
  }

  function addPending(item: PendingSync) {
    const pending = readPending();
    if (!pending.some((candidate) => candidate.kind === item.kind && candidate.id === item.id)) {
      localStorage.setItem(pendingKey, JSON.stringify([...pending, item]));
    }
  }

  function queueDelete(kind: "workout" | "template" | "bodyweight", id: string) {
    const pending = readPending().filter(
      (item) => !(item.kind === kind && item.id === id),
    );
    const deleteKind = `delete-${kind}` as PendingSync["kind"];
    if (!pending.some((item) => item.kind === deleteKind && item.id === id)) {
      pending.push({ kind: deleteKind, id } as PendingSync);
    }
    localStorage.setItem(pendingKey, JSON.stringify(pending));
  }

  async function flushPendingSync() {
    if (!session) return;
    const pending = readPending();
    if (pending.length === 0) {
      setSyncMessage("");
      return;
    }

    const remaining: PendingSync[] = [];
    for (const item of pending) {
      try {
        if (item.kind === "workout") {
          const workout = (await workoutRepository.getAll()).find((candidate) => candidate.id === item.id);
          if (workout) await saveCloudWorkout(session.user.id, workout);
        } else if (item.kind === "template") {
          const template = (await templateRepository.getAll()).find((candidate) => candidate.id === item.id);
          if (template) await saveCloudTemplate(session.user.id, template);
        } else if (item.kind === "bodyweight") {
          const entry = (await bodyweightRepository.getAll()).find((candidate) => candidate.id === item.id);
          if (entry) await saveCloudBodyweight(session.user.id, entry);
        } else if (item.kind === "delete-workout") {
          await deleteCloudWorkout(session.user.id, item.id);
        } else if (item.kind === "delete-template") {
          await deleteCloudTemplate(session.user.id, item.id);
        } else if (item.kind === "profile") {
          const profile = await profileRepository.get();
          if (profile) await saveCloudProfile(session.user.id, profile);
        } else if (item.kind === "delete-bodyweight") {
          await deleteCloudBodyweight(session.user.id, item.id);
        }
      } catch (error) {
        console.error(error);
        remaining.push(item);
      }
    }

    localStorage.setItem(pendingKey, JSON.stringify(remaining));
    setSyncMessage(remaining.length === 0 ? "" : "Some data is saved on device — cloud sync pending");
  }

  useEffect(() => {
    if (!session || !dbReady) return;
    const handleOnline = () => void flushPendingSync();
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) void flushPendingSync();
    return () => window.removeEventListener("online", handleOnline);
  }, [session?.user.id, dbReady]);

  async function startWorkout(template?: WorkoutTemplate) {
    const workout: Workout = {
      id: "active",
      startedAt: new Date(),
      completedAt: null,
      bodyweight: getLatestBodyweight(),
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
      updatedAt: new Date(),
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
        addPending({ kind: "workout", id: completed.id });
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

    await templateRepository.save(template);
    setTemplates(await templateRepository.getAll());
    if (session) {
      const synced = await cloudAction(() => saveCloudTemplate(session.user.id, template));
      if (!synced) {
        addPending({ kind: "template", id: template.id });
        setSyncMessage("Template saved on device — cloud sync pending");
      }
    }
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

    if (session) {
      const synced = await cloudAction(() =>
        saveCloudTemplate(session.user.id, updated),
      );
      if (!synced) {
        addPending({ kind: "template", id: updated.id });
        setSyncMessage("Template updated on device — cloud sync pending");
      }
    }
  }

  const profileNeedsSetup =
    Boolean(session) &&
    !profile.setupCompleted;

  if (authLoading || loading || (session && !dbReady)) {
    return <div className="loading">Loading {APP_NAME}…</div>;
  }

  if (!supabaseConfigured) {
    return (
      <main className="auth-shell">
        <section className="card auth-card">
          <h1>Connect {APP_NAME} authentication</h1>
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
        initialBodyweight={getLatestBodyweight()}
        email={session.user.email ?? ""}
        onComplete={async ({ profile: nextProfile, bodyweight }) => {
          const ownedProfile = {
            ...nextProfile,
            userId: session.user.id,
            setupCompleted: true,
          };
          const entry: BodyweightEntry = {
            id: crypto.randomUUID(),
            userId: session.user.id,
            weight: bodyweight,
            recordedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };

          await bodyweightRepository.save(entry);
          setBodyweights(await bodyweightRepository.getAll());

          const synced = await cloudAction(() =>
            saveCloudProfile(session.user.id, ownedProfile),
          );
          if (!synced) await profileRepository.save(ownedProfile);
          setProfile(ownedProfile);

          const weightSynced = await cloudAction(() =>
            saveCloudBodyweight(session.user.id, entry),
          );
          if (!weightSynced) {
            addPending({ kind: "bodyweight", id: entry.id });
            setSyncMessage("Profile saved on device — cloud sync pending");
          }
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}>
          {APP_NAME}
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
            onProgressionApplied={(exerciseId, option) => {
              if (activeWorkout) {
                return applyProgressionToSourceTemplate(
                  activeWorkout,
                  exerciseId,
                  option,
                );
              }
            }}
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
            onApplyProgression={(exerciseId, suggestion) => {
              const workoutExercise = summaryWorkout.exercises.find(
                (item) => item.exerciseId === exerciseId,
              );
              return applyProgressionToSourceTemplate(
                summaryWorkout,
                exerciseId,
                {
                  nextWeight: suggestion.nextWeight,
                  reps: suggestion.reps,
                  sets: suggestion.sets,
                  restSeconds: workoutExercise?.plannedRestSeconds,
                },
              );
            }}
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
              await templateRepository.remove(id);
              setTemplates(await templateRepository.getAll());
              if (session) {
                const deleted = await cloudAction(() =>
                  deleteCloudTemplate(session.user.id, id),
                );
                if (!deleted) {
                  queueDelete("template", id);
                  setSyncMessage("Template deleted on device — cloud sync pending");
                }
              }
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
              if (session) {
                const synced = await cloudAction(() =>
                  saveCloudTemplate(session.user.id, template),
                );
                if (!synced) {
                  addPending({ kind: "template", id: template.id });
                  setSyncMessage("Template saved on device — cloud sync pending");
                }
              }
              setEditingTemplateId(null);
              setPage("templates");
            }}
          />
        )}

        {page === "history" && (
          <HistoryPage
            workouts={workouts}
            exercises={exercises}
            templates={templates}
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

              await workoutRepository.remove(workout.id);
              setWorkouts(sortWorkoutsByDate(await workoutRepository.getAll()));
              if (session) {
                const deleted = await cloudAction(() =>
                  deleteCloudWorkout(session.user.id, workout.id),
                );
                if (!deleted) {
                  queueDelete("workout", workout.id);
                  setSyncMessage("Workout deleted on device — cloud sync pending");
                }
              }
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
                await workoutRepository.remove(historicalWorkout.id);
                setWorkouts(await workoutRepository.getAll());
                if (session) {
                  const deleted = await cloudAction(() =>
                    deleteCloudWorkout(session.user.id, historicalWorkout.id),
                  );
                  if (!deleted) {
                    queueDelete("workout", historicalWorkout.id);
                    setSyncMessage("Workout deleted on device — cloud sync pending");
                  }
                }
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
            workouts={workouts}
            onCancel={() => {
              setEditingWorkoutId(null);
              setPage("history");
            }}
            onSave={async (workout) => {
              const toSave: Workout = { ...workout, updatedAt: new Date() };
              await workoutRepository.save(toSave);

              setWorkouts(sortWorkoutsByDate(await workoutRepository.getAll()));

              if (session) {
                const synced = await cloudAction(() =>
                  saveCloudWorkout(session.user.id, toSave),
                );
                if (!synced) {
                  addPending({ kind: "workout", id: toSave.id });
                  setSyncMessage("Workout saved on device — cloud sync pending");
                }
              }

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
              await bodyweightRepository.save(entry);
              const next = await bodyweightRepository.getAll();
              setBodyweights(next);
              const saved = await cloudAction(() => saveCloudBodyweight(session.user.id, entry));
              if (!saved) {
                addPending({ kind: "bodyweight", id: entry.id });
                setSyncMessage("Weight saved on device — cloud sync pending");
              }

            }}
            onDelete={async (id) => {
              if (!session) return;
              await bodyweightRepository.remove(id);
              setBodyweights(await bodyweightRepository.getAll());
              const deleted = await cloudAction(() => deleteCloudBodyweight(session.user.id, id));
              if (!deleted) {
                queueDelete("bodyweight", id);
                setSyncMessage("Weight deleted on device — cloud sync pending");
              }
            }}
          />
        )}

        {page === "settings" && (
          <SettingsPage
            profile={profile}
            onSave={async (next) => {
              await profileRepository.save(next);
              setProfile(next);
              if (session) {
                const synced = await cloudAction(() => saveCloudProfile(session.user.id, next));
                if (!synced) {
                  addPending({ kind: "profile" });
                  setSyncMessage("Profile saved on device — cloud sync pending");
                }
              }
            }}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {(
          [
            "home",
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
