import { formatLabel } from "../shared";
import {
  DEFAULT_PRIMARY_MUSCLE,
  SELECTABLE_PRIMARY_MUSCLES,
} from "../domain/exercises/primaryMuscleOptions";
import type { MuscleGroup } from "../domain/types/MuscleGroup";

type PrimaryMuscleSelectProps = {
  value: MuscleGroup;
  onChange: (value: MuscleGroup) => void;
  id?: string;
};

export function PrimaryMuscleSelect({
  value,
  onChange,
  id = "primary-muscle",
}: PrimaryMuscleSelectProps) {
  return (
    <label className="primary-muscle-field" htmlFor={id}>
      Primary muscle
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as MuscleGroup)}
      >
        {SELECTABLE_PRIMARY_MUSCLES.map((muscle) => (
          <option key={muscle} value={muscle}>
            {formatLabel(muscle)}
          </option>
        ))}
      </select>
    </label>
  );
}

export { DEFAULT_PRIMARY_MUSCLE };
