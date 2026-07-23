import type { Exercise } from "../../../domain/entities/Exercise";

interface ExerciseCardProps {
  exercise: Exercise;
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <li>
      <strong>{exercise.name}</strong>

      <div>
        {formatLabel(exercise.primaryMuscle)} •{" "}
        {formatLabel(exercise.loadType)}
      </div>
    </li>
  );
}