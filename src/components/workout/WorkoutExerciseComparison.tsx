import type { WorkoutExercise } from "../../domain/entities/workout";
import { activeSetKey, type PRType } from "../../domain/analytics/personalRecords";
import { EditableCompletedSet } from "./EditableCompletedSet";

type WorkoutExerciseComparisonProps = {
  item: WorkoutExercise;
  unit: string;
  previousPerformance: WorkoutExercise | null;
  prTypesBySet: Map<string, PRType[]>;
  onUpdateSet: (
    workoutExerciseId: string,
    setOrder: number,
    weight: number,
    reps: number,
  ) => void;
  onDeleteSet: (workoutExerciseId: string, setOrder: number) => void;
};

function formatSet(weight: number | null | undefined, reps: number, unit: string) {
  return `${weight ?? 0} ${unit.toLowerCase()} × ${reps}`;
}

export function WorkoutExerciseComparison({
  item,
  unit,
  previousPerformance,
  prTypesBySet,
  onUpdateSet,
  onDeleteSet,
}: WorkoutExerciseComparisonProps) {
  const hasPrevious =
    previousPerformance != null && previousPerformance.completedSets.length > 0;
  const hasCompleted = item.completedSets.length > 0;
  const rowCount =
    item.plannedSets.length > 0
      ? Math.max(item.plannedSets.length, item.completedSets.length)
      : Math.max(item.completedSets.length, 0);

  if (rowCount === 0 && !hasCompleted) {
    return null;
  }

  return (
    <div
      className={`workout-set-table${hasPrevious ? " has-previous" : ""}${
        hasCompleted ? " has-completed" : ""
      }`}
    >
      <div className="workout-set-table-header">
        <span className="set-table-num">#</span>
        {hasCompleted && (
          <span className="set-table-completed-heading">Completed sets</span>
        )}
        {hasPrevious && (
          <span className="set-table-previous-heading">Previous</span>
        )}
      </div>

      {rowCount > 0 &&
        Array.from({ length: rowCount }, (_, index) => {
          const previousSet = previousPerformance?.completedSets[index];
          const completedSet = item.completedSets[index];
          const plannedSet = item.plannedSets[index];
          const matched =
            completedSet != null &&
            plannedSet != null &&
            (plannedSet.weight == null ||
              completedSet.weight >= plannedSet.weight) &&
            completedSet.reps >= plannedSet.reps;

          return (
            <div
              className={`workout-set-table-row${matched ? " matched" : ""}${
                completedSet ? " done" : ""
              }`}
              key={index}
            >
              <span className="set-table-num">{index + 1}</span>

              {hasCompleted &&
                (completedSet ? (
                  <EditableCompletedSet
                    variant="compact"
                    exerciseId={item.id}
                    set={completedSet}
                    setNumber={index + 1}
                    unit={unit}
                    prTypes={
                      prTypesBySet.get(
                        activeSetKey(item.id, completedSet.order),
                      ) ?? []
                    }
                    onSave={onUpdateSet}
                    onDelete={onDeleteSet}
                  />
                ) : (
                  <span className="set-table-completed-empty" />
                ))}

              {hasPrevious && (
                <span className="set-table-previous">
                  {previousSet
                    ? formatSet(previousSet.weight, previousSet.reps, unit)
                    : "—"}
                </span>
              )}
            </div>
          );
        })}

      {item.plannedSets.length === 0 &&
        item.completedSets.slice(rowCount).map((completedSet, offset) => {
          const index = rowCount + offset;
          return (
            <div className="workout-set-table-row done free-logged" key={completedSet.order}>
              <span className="set-table-num">{index + 1}</span>
              <EditableCompletedSet
                variant="compact"
                exerciseId={item.id}
                set={completedSet}
                setNumber={index + 1}
                unit={unit}
                prTypes={
                  prTypesBySet.get(activeSetKey(item.id, completedSet.order)) ??
                  []
                }
                onSave={onUpdateSet}
                onDelete={onDeleteSet}
              />
            </div>
          );
        })}
    </div>
  );
}
