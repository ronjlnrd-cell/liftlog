import { formatLabel } from "../shared";
import {
  DEFAULT_LOAD_TYPE,
  SELECTABLE_LOAD_TYPES,
} from "../domain/exercises/loadTypeOptions";
import type { LoadType } from "../domain/types/LoadType";

type LoadTypeSelectProps = {
  value: LoadType;
  onChange: (value: LoadType) => void;
  id?: string;
};

export function LoadTypeSelect({
  value,
  onChange,
  id = "load-type",
}: LoadTypeSelectProps) {
  return (
    <label className="primary-muscle-field" htmlFor={id}>
      Equipment
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as LoadType)}
      >
        {SELECTABLE_LOAD_TYPES.map((loadType) => (
          <option key={loadType} value={loadType}>
            {formatLabel(loadType)}
          </option>
        ))}
      </select>
    </label>
  );
}

export { DEFAULT_LOAD_TYPE };
