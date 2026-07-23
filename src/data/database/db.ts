import { Dexie, type Table } from "dexie";
import type { Exercise } from "../../domain/entities/Exercise";
import type { Workout } from "../../domain/entities/workout";
import type { Profile } from "../../domain/entities/Profile";
import type { WorkoutTemplate } from "../../domain/entities/Template";

class LiftLogDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  activeWorkout!: Table<Workout, string>;
  profile!: Table<Profile, string>;
  templates!: Table<WorkoutTemplate, string>;

  constructor() {
    super("LiftLogDatabase");

    this.version(1).stores({
      exercises: "id",
      templates: "id",
      workouts: "id",
      bodyweightEntries: "id",
      profile: "id",
      seenAchievements: "achievementKey",
      activeWorkout: "id",
    });

    this.version(2).stores({
      exercises: "id, name, primaryMuscle, source, archivedAt",
      templates: "id, createdAt, name",
      workouts: "id, startedAt, completedAt",
      activeWorkout: "id",
      profile: "id",
    });
  }
}

export const db = new LiftLogDatabase();
