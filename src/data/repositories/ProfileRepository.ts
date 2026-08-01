import { db } from "../database/db";
import type { Profile } from "../../domain/entities/Profile";

const defaultProfile: Profile = {
  id: "profile",
  gender: "UNSPECIFIED",
  weightUnit: "KG",
  setupCompleted: false,
};

export class ProfileRepository {
  async get(): Promise<Profile> {
    return (await db.profile.get("profile")) ?? defaultProfile;
  }

  async save(profile: Profile): Promise<void> {
    await db.profile.put(profile);
  }
}

export const profileRepository = new ProfileRepository();
