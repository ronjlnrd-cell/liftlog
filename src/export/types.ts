import type { BodyweightEntry } from "../domain/entities/BodyweightEntry";
import type { PeriodEntry } from "../domain/entities/PeriodEntry";
import type { WorkoutContextEntry } from "../domain/entities/WorkoutContextEntry";
import type { ExerciseSetupEntry } from "../domain/entities/ExerciseSetupEntry";
import type { CoachObservationEntry } from "../domain/entities/CoachObservationEntry";
import type { Exercise } from "../domain/entities/Exercise";
import type { Profile } from "../domain/entities/Profile";
import type { WorkoutTemplate } from "../domain/entities/Template";
import type { Workout } from "../domain/entities/workout";

export type ExcelExportInput = {
  workouts: Workout[];
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  bodyweights: BodyweightEntry[];
  periodEntries: PeriodEntry[];
  workoutContexts: WorkoutContextEntry[];
  exerciseSetups: ExerciseSetupEntry[];
  coachObservations: CoachObservationEntry[];
  profile: Profile;
};
