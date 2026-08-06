import { forwardRef } from "react";
import type { WorkoutShareSnapshotData } from "../../domain/analytics/workoutShareSnapshotData";

type WorkoutShareSnapshotCardProps = {
  data: WorkoutShareSnapshotData;
  unit: "KG" | "LB";
};

export const WorkoutShareSnapshotCard = forwardRef<
  HTMLDivElement,
  WorkoutShareSnapshotCardProps
>(function WorkoutShareSnapshotCard({ data, unit }, ref) {
  const unitLabel = unit.toLowerCase();

  return (
    <div className="workout-snapshot-frame" ref={ref} aria-hidden="true">
      <div className="workout-snapshot-card">
        <div className="workout-snapshot-hero">
          <p className="workout-snapshot-eyebrow">WORKOUT COMPLETE</p>
          <h2 className="workout-snapshot-title">Nice work.</h2>
        </div>

        {data.achievements.length > 0 && (
          <div className="workout-snapshot-achievements">
            {data.achievements.map((achievement) => (
              <div
                className="workout-snapshot-achievement"
                key={achievement.key}
              >
                <span className="workout-snapshot-achievement-icon">
                  {achievement.icon}
                </span>
                <span>{achievement.title}</span>
              </div>
            ))}
          </div>
        )}

        <p className="workout-snapshot-date">{data.timestamp}</p>

        <div className="workout-snapshot-stats">
          <div className="workout-snapshot-stat">
            <span>Duration</span>
            <strong>{data.durationLabel}</strong>
          </div>
          <div className="workout-snapshot-stat">
            <span>Sets</span>
            <strong>{data.totalSets}</strong>
          </div>
          <div className="workout-snapshot-stat">
            <span>Volume</span>
            <strong>{data.volumeLabel}</strong>
          </div>
        </div>

        <div className="workout-snapshot-exercises">
          {data.exercises.map((exercise) => (
            <div className="workout-snapshot-exercise" key={exercise.name}>
              <strong className="workout-snapshot-exercise-name">
                {exercise.name}
              </strong>
              <div className="workout-snapshot-set-list">
                {exercise.sets.map((set, index) => (
                  <span
                    className={`workout-snapshot-set${set.isPR ? " is-pr" : ""}`}
                    key={`${exercise.name}-${index}`}
                  >
                    {set.isPR && (
                      <span className="workout-snapshot-set-trophy">🏆</span>
                    )}
                    {set.weight} {unitLabel} × {set.reps}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="workout-snapshot-watermark">
        <span className="workout-snapshot-watermark-label">
          Created with the help of
        </span>
        <strong className="workout-snapshot-watermark-brand">
          {data.appName}
        </strong>
      </div>
    </div>
  );
});
