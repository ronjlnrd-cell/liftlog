import { getDb } from "../database/databaseManager";
import type { Profile } from "../../domain/entities/Profile";

const defaultProfile: Profile = {
  id: "profile",
  gender: "UNSPECIFIED",
  weightUnit: "KG",
  setupCompleted: false,
};

export class ProfileRepository {
  async get(): Promise<Profile> {
    return (await getDb().profile.get("profile")) ?? defaultProfile;
  }

  async save(profile: Profile): Promise<void> {
    await getDb().profile.put(profile);
  }
}

export const profileRepository = new ProfileRepository();
