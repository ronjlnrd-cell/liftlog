import { useMemo, useState } from "react";
import type { Exercise } from "../domain/entities/Exercise";
import type { Workout } from "../domain/entities/workout";
import { ExerciseSource } from "../domain/types/exercise-source";
import { exerciseRepository } from "../data/repositories/ExerciseRepository";
import { createCustomExercise } from "../domain/exercises/createCustomExercise";
import { ExerciseIllustration } from "../components/ExerciseIllustration";
import { formatLabel } from "../shared";
import {
  DEFAULT_PRIMARY_MUSCLE,
  PrimaryMuscleSelect,
} from "../components/PrimaryMuscleSelect";
import type { MuscleGroup } from "../domain/types/MuscleGroup";
import {
  compareExercisesByUsage,
  getExerciseUsageCounts,
} from "../domain/analytics/exerciseUsage";
import { matchesExerciseSearch } from "../shared/exerciseSearch";
import { useConfirm } from "../components/ConfirmProvider";

type ExercisesPageProps = {
  exercises: Exercise[];
  workouts: Workout[];
  onRefresh: (createdExercise?: Exercise) => Promise<void>;
  onOpen: (exercise: Exercise) => void;
};

export function ExercisesPage({
  exercises,
  workouts,
  onRefresh,
  onOpen,
}: ExercisesPageProps) {
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [primaryMuscle, setPrimaryMuscle] =
    useState<MuscleGroup>(DEFAULT_PRIMARY_MUSCLE);
  const [error, setError] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [sortMode, setSortMode] = useState<"frequency" | "alphabetical">("frequency");

  const usageCounts = useMemo(
    () => getExerciseUsageCounts(workouts),
    [workouts],
  );

  const visible = useMemo(() => {
    const filtered = exercises.filter(
      (exercise) =>
        !exercise.archivedAt &&
        matchesExerciseSearch(query, exercise.name, formatLabel(exercise.primaryMuscle)),
    );
    const mode = sortMode === "alphabetical" ? "az" : "frequency";
    return [...filtered].sort((a, b) =>
      compareExercisesByUsage(a, b, usageCounts, mode),
    );
  }, [exercises, query, sortMode, usageCounts]);

  async function addExercise() {
    const result = await createCustomExercise(
      { name, primaryMuscle },
      exercises,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setPrimaryMuscle(DEFAULT_PRIMARY_MUSCLE);
    setError("");
    setShowAddCustom(false);
    await onRefresh(result.exercise);
  }

  return (
    <section>
      <div className="exercise-page-header">
        <h1 className="page-title">Exercises</h1>
        <button
          type="button"
          className="add-custom-button"
          onClick={() => setShowAddCustom((current) => !current)}
          aria-expanded={showAddCustom}
        >
          <span className="add-custom-icon" aria-hidden="true">
            +
          </span>
          Add custom
        </button>
      </div>

      <input
        className="search exercise-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search exercises…"
        autoFocus
      />
      <div className="exercise-sort-control" role="group" aria-label="Sort exercises">
        <button type="button" className={sortMode === "frequency" ? "active" : ""} onClick={() => setSortMode("frequency")}>Most used</button>
        <button type="button" className={sortMode === "alphabetical" ? "active" : ""} onClick={() => setSortMode("alphabetical")}>A–Z</button>
      </div>

      {showAddCustom && (
        <div className="card form-card add-custom-panel">
          <h2>Add custom exercise</h2>
          <div className="add-custom-exercise-form">
            <label className="add-custom-exercise-name">
              Exercise name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Exercise name"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void addExercise();
                }}
              />
            </label>
            <PrimaryMuscleSelect
              id="exercises-page-primary-muscle"
              value={primaryMuscle}
              onChange={setPrimaryMuscle}
            />
            <button className="primary add-custom-exercise-submit" onClick={addExercise}>
              Add
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <div className="exercise-list">
        {visible.map((exercise) => (
          <article
            className="card exercise-row exercise-row-clickable"
            key={exercise.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(exercise)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(exercise);
              }
            }}
          >
            <div className="exercise-row-main">
              <ExerciseIllustration
                exerciseId={exercise.id}
                className="exercise-row-thumbnail"
              />
              <div>
                <strong>{exercise.name}</strong>
                <p>
                  {formatLabel(exercise.primaryMuscle)} ·{" "}
                  {formatLabel(exercise.loadType)}
                </p>
              </div>
            </div>

            <span className="exercise-usage-number" title={`${usageCounts.get(exercise.id) ?? 0} workouts performed`}>
              {usageCounts.get(exercise.id) ?? 0}
            </span>

            {exercise.source === ExerciseSource.CUSTOM && (
              <button
                className="danger-text"
                onClick={async (event) => {
                  event.stopPropagation();
                  const confirmed = await confirm({
                    title: "Archive exercise?",
                    message: `"${exercise.name}" will be removed from your exercise list. Past workouts are kept.`,
                    confirmLabel: "Archive",
                    tone: "danger",
                  });
                  if (!confirmed) return;
                  await exerciseRepository.archive(exercise.id);
                  await onRefresh();
                }}
              >
                Archive
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
