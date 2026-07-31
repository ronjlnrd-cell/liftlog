import { exerciseRepository } from "./repositories/ExerciseRepository";
import { MuscleGroup } from "../domain/types/MuscleGroup";
import { MovementPattern } from "../domain/types/MovementPattern";
import { LoadType } from "../domain/types/LoadType";
import { ExerciseSource } from "../domain/types/exercise-source";
import type { Exercise } from "../domain/entities/Exercise";

type SeedRow = [
  string, string, Exercise["primaryMuscle"], Exercise["movementPattern"],
  Exercise["loadType"], number | null
];

const rows: SeedRow[] = [
  ["builtin-bench-press", 'Bench Press', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.BARBELL, 2.5],
  ["builtin-squat", 'Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.BARBELL, 2.5],
  ["builtin-deadlift", 'Deadlift', MuscleGroup.HAMSTRINGS, MovementPattern.HINGE, LoadType.BARBELL, 5],
  ["builtin-ohp", 'Overhead Press', MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PUSH, LoadType.BARBELL, 2.5],
  ["builtin-pull-up", 'Pull-Up', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.BODYWEIGHT, 2.5],
  ["builtin-row", 'Barbell Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.BARBELL, 2.5],
  ["builtin-dips", 'Dips', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.BODYWEIGHT, 2.5],
  ["builtin-lat-pulldown", 'Lat Pulldown', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.CABLE, 2.5],
  ["builtin-leg-press", 'Leg Press', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.MACHINE, 5],
  ["builtin-biceps-curl", 'Dumbbell Biceps Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-incline-bench", 'Incline Bench Press', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.BARBELL, 2.5],
  ["builtin-decline-bench", 'Decline Bench Press', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.BARBELL, 2.5],
  ["builtin-db-bench", 'Dumbbell Bench Press', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.DUMBBELL, 2],
  ["builtin-incline-db-bench", 'Incline Dumbbell Bench Press', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.DUMBBELL, 2],
  ["builtin-chest-press-machine", 'Machine Chest Press', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.MACHINE, 2.5],
  ["builtin-cable-fly", 'Cable Fly', MuscleGroup.CHEST, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-pec-deck", 'Pec Deck', MuscleGroup.CHEST, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-db-fly", 'Dumbbell Fly', MuscleGroup.CHEST, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-push-up", 'Push-Up', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.BODYWEIGHT, null],
  ["builtin-close-grip-bench", 'Close-Grip Bench Press', MuscleGroup.TRICEPS, MovementPattern.HORIZONTAL_PUSH, LoadType.BARBELL, 2.5],
  ["builtin-chin-up", 'Chin-Up', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.BODYWEIGHT, 2.5],
  ["builtin-neutral-pull-up", 'Neutral-Grip Pull-Up', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.BODYWEIGHT, 2.5],
  ["builtin-seated-cable-row", 'Seated Cable Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.CABLE, 2.5],
  ["builtin-chest-supported-row", 'Chest-Supported Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.MACHINE, 2.5],
  ["builtin-db-row", 'One-Arm Dumbbell Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.DUMBBELL, 2],
  ["builtin-tbar-row", 'T-Bar Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.MACHINE, 2.5],
  ["builtin-machine-row", 'Machine Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.MACHINE, 2.5],
  ["builtin-straight-arm-pulldown", 'Straight-Arm Pulldown', MuscleGroup.BACK, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-pullover", 'Dumbbell Pullover', MuscleGroup.BACK, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-face-pull", 'Face Pull', MuscleGroup.SHOULDERS, MovementPattern.HORIZONTAL_PULL, LoadType.CABLE, 2.5],
  ["builtin-db-shoulder-press", 'Dumbbell Shoulder Press', MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PUSH, LoadType.DUMBBELL, 2],
  ["builtin-arnold-press", 'Arnold Press', MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PUSH, LoadType.DUMBBELL, 2],
  ["builtin-seated-ohp", 'Seated Barbell Shoulder Press', MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PUSH, LoadType.BARBELL, 2.5],
  ["builtin-machine-shoulder-press", 'Machine Shoulder Press', MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PUSH, LoadType.MACHINE, 2.5],
  ["builtin-lateral-raise", 'Dumbbell Lateral Raise', MuscleGroup.SHOULDERS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-cable-lateral-raise", 'Cable Lateral Raise', MuscleGroup.SHOULDERS, MovementPattern.ISOLATION, LoadType.CABLE, 1],
  ["builtin-front-raise", 'Front Raise', MuscleGroup.SHOULDERS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-reverse-fly", 'Reverse Fly', MuscleGroup.SHOULDERS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-rear-delt-machine", 'Rear Delt Machine', MuscleGroup.SHOULDERS, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-upright-row", 'Upright Row', MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PULL, LoadType.BARBELL, 2.5],
  ["builtin-front-squat", 'Front Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.BARBELL, 2.5],
  ["builtin-hack-squat", 'Hack Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.MACHINE, 5],
  ["builtin-goblet-squat", 'Goblet Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.DUMBBELL, 2],
  ["builtin-bulgarian-split-squat", 'Bulgarian Split Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.DUMBBELL, 2],
  ["builtin-split-squat", 'Split Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.DUMBBELL, 2],
  ["builtin-walking-lunge", 'Walking Lunge', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.DUMBBELL, 2],
  ["builtin-reverse-lunge", 'Reverse Lunge', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.DUMBBELL, 2],
  ["builtin-leg-extension", 'Leg Extension', MuscleGroup.QUADRICEPS, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-step-up", 'Step-Up', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.DUMBBELL, 2],
  ["builtin-belt-squat", 'Belt Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.MACHINE, 5],
  ["builtin-romanian-deadlift", 'Romanian Deadlift', MuscleGroup.HAMSTRINGS, MovementPattern.HINGE, LoadType.BARBELL, 2.5],
  ["builtin-stiff-leg-deadlift", 'Stiff-Leg Deadlift', MuscleGroup.HAMSTRINGS, MovementPattern.HINGE, LoadType.BARBELL, 2.5],
  ["builtin-good-morning", 'Good Morning', MuscleGroup.HAMSTRINGS, MovementPattern.HINGE, LoadType.BARBELL, 2.5],
  ["builtin-lying-leg-curl", 'Lying Leg Curl', MuscleGroup.HAMSTRINGS, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-seated-leg-curl", 'Seated Leg Curl', MuscleGroup.HAMSTRINGS, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-nordic-curl", 'Nordic Hamstring Curl', MuscleGroup.HAMSTRINGS, MovementPattern.ISOLATION, LoadType.BODYWEIGHT, null],
  ["builtin-single-leg-rdl", 'Single-Leg Romanian Deadlift', MuscleGroup.HAMSTRINGS, MovementPattern.HINGE, LoadType.DUMBBELL, 2],
  ["builtin-hip-thrust", 'Barbell Hip Thrust', MuscleGroup.GLUTES, MovementPattern.HINGE, LoadType.BARBELL, 5],
  ["builtin-glute-bridge", 'Glute Bridge', MuscleGroup.GLUTES, MovementPattern.HINGE, LoadType.BODYWEIGHT, null],
  ["builtin-cable-kickback", 'Cable Glute Kickback', MuscleGroup.GLUTES, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-hip-abduction", 'Hip Abduction Machine', MuscleGroup.GLUTES, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-sumo-deadlift", 'Sumo Deadlift', MuscleGroup.GLUTES, MovementPattern.HINGE, LoadType.BARBELL, 5],
  ["builtin-standing-calf-raise", 'Standing Calf Raise', MuscleGroup.CALVES, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-seated-calf-raise", 'Seated Calf Raise', MuscleGroup.CALVES, MovementPattern.ISOLATION, LoadType.MACHINE, 2.5],
  ["builtin-single-leg-calf", 'Single-Leg Calf Raise', MuscleGroup.CALVES, MovementPattern.ISOLATION, LoadType.BODYWEIGHT, null],
  ["builtin-barbell-curl", 'Barbell Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.BARBELL, 2.5],
  ["builtin-ez-curl", 'EZ-Bar Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.BARBELL, 2.5],
  ["builtin-hammer-curl", 'Hammer Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-incline-curl", 'Incline Dumbbell Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-preacher-curl", 'Preacher Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.BARBELL, 2.5],
  ["builtin-cable-curl", 'Cable Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-concentration-curl", 'Concentration Curl', MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-rope-pushdown", 'Rope Triceps Pushdown', MuscleGroup.TRICEPS, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-bar-pushdown", 'Bar Triceps Pushdown', MuscleGroup.TRICEPS, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-skull-crusher", 'Skull Crusher', MuscleGroup.TRICEPS, MovementPattern.ISOLATION, LoadType.BARBELL, 2.5],
  ["builtin-overhead-db-extension", 'Overhead Dumbbell Triceps Extension', MuscleGroup.TRICEPS, MovementPattern.ISOLATION, LoadType.DUMBBELL, 1],
  ["builtin-overhead-cable-extension", 'Overhead Cable Triceps Extension', MuscleGroup.TRICEPS, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-bench-dip", 'Bench Dip', MuscleGroup.TRICEPS, MovementPattern.HORIZONTAL_PUSH, LoadType.BODYWEIGHT, null],
  ["builtin-plank", 'Plank', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.BODYWEIGHT, null],
  ["builtin-side-plank", 'Side Plank', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.BODYWEIGHT, null],
  ["builtin-crunch", 'Crunch', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.BODYWEIGHT, null],
  ["builtin-cable-crunch", 'Cable Crunch', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-hanging-leg-raise", 'Hanging Leg Raise', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.BODYWEIGHT, null],
  ["builtin-ab-wheel", 'Ab Wheel Rollout', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.BODYWEIGHT, null],
  ["builtin-russian-twist", 'Russian Twist', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.OTHER, null],
  ["builtin-pallof-press", 'Pallof Press', MuscleGroup.CORE, MovementPattern.ISOLATION, LoadType.CABLE, 2.5],
  ["builtin-farmer-carry", "Farmer's Carry", MuscleGroup.CORE, MovementPattern.CARRY, LoadType.DUMBBELL, 2],
  ["builtin-suitcase-carry", 'Suitcase Carry', MuscleGroup.CORE, MovementPattern.CARRY, LoadType.DUMBBELL, 2],
  ["builtin-trap-bar-deadlift", 'Trap Bar Deadlift', MuscleGroup.HAMSTRINGS, MovementPattern.HINGE, LoadType.BARBELL, 5],
  ["builtin-rack-pull", 'Rack Pull', MuscleGroup.BACK, MovementPattern.HINGE, LoadType.BARBELL, 5],
  ["builtin-landmine-press", 'Landmine Press', MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PUSH, LoadType.BARBELL, 2.5],
  ["builtin-landmine-row", 'Landmine Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.BARBELL, 2.5],
  ["builtin-smith-bench", 'Smith Machine Bench Press', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.MACHINE, 2.5],
  ["builtin-smith-squat", 'Smith Machine Squat', MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.MACHINE, 5],
  ["builtin-assisted-pull-up", 'Assisted Pull-Up', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.MACHINE, 2.5],
  ["builtin-assisted-dip", 'Assisted Dip', MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.MACHINE, 2.5],
  ["builtin-cable-row-wide", 'Wide-Grip Cable Row', MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.CABLE, 2.5],
  ["builtin-lat-pulldown-close", 'Close-Grip Lat Pulldown', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.CABLE, 2.5],
  ["builtin-lat-pulldown-neutral", 'Neutral-Grip Lat Pulldown', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.CABLE, 2.5],
  ["builtin-single-arm-pulldown", 'Single-Arm Lat Pulldown', MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.CABLE, 1],
];

const builtIns: Exercise[] = rows.map(
  ([id, name, primaryMuscle, movementPattern, loadType, defaultWeightIncrement]) => ({
    id, name, primaryMuscle, movementPattern, loadType, defaultWeightIncrement,
    source: ExerciseSource.BUILT_IN,
    archivedAt: null,
  }),
);

export async function seedExercises(): Promise<void> {
  const existing = await exerciseRepository.getAll();
  const existingIds = new Set(existing.map((exercise) => exercise.id));
  await Promise.all(
    builtIns
      .filter((exercise) => !existingIds.has(exercise.id))
      .map((exercise) => exerciseRepository.add(exercise)),
  );
}
