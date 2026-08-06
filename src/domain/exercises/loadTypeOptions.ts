import { LoadType, type LoadType as LoadTypeValue } from "../types/LoadType";

export const SELECTABLE_LOAD_TYPES: LoadTypeValue[] = (
  Object.values(LoadType) as LoadTypeValue[]
)
  .filter((loadType) => loadType !== LoadType.UNKNOWN)
  .sort((a, b) => a.localeCompare(b));

export const DEFAULT_LOAD_TYPE = LoadType.BARBELL;
