import type { PeriodEntry } from "../entities/PeriodEntry";
import type { Profile } from "../entities/Profile";
import { localDateString } from "../../shared";

export function isCycleTrackingActive(profile: Profile): boolean {
  return profile.gender === "FEMALE" && profile.cycleTrackingEnabled === true;
}

export function needsCycleTrackingConsent(profile: Profile): boolean {
  if (profile.cycleTrackingConsentCompleted === true) return false;
  return profile.gender === "FEMALE" && profile.setupCompleted === true;
}

export function mergeProfileWithCloud(
  local: Profile,
  cloud: Profile,
  hasPendingProfileSync: boolean,
): Profile {
  if (hasPendingProfileSync) {
    return {
      ...cloud,
      ...local,
      id: "profile",
      userId: local.userId ?? cloud.userId,
    };
  }

  const consentCompleted =
    local.cycleTrackingConsentCompleted === true ||
    cloud.cycleTrackingConsentCompleted === true;

  let cycleTrackingEnabled = cloud.cycleTrackingEnabled ?? false;
  if (local.cycleTrackingConsentCompleted === true) {
    cycleTrackingEnabled = local.cycleTrackingEnabled ?? false;
  }

  return {
    id: "profile",
    userId: cloud.userId ?? local.userId,
    gender: cloud.gender ?? local.gender,
    weightUnit: cloud.weightUnit ?? local.weightUnit,
    setupCompleted: local.setupCompleted ?? cloud.setupCompleted,
    cycleTrackingConsentCompleted: consentCompleted,
    cycleTrackingEnabled: consentCompleted
      ? cycleTrackingEnabled
      : (cloud.cycleTrackingEnabled ?? false),
  };
}

export function getLatestPeriodEntry(
  entries: PeriodEntry[],
): PeriodEntry | null {
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

export function daysSinceLastPeriod(entries: PeriodEntry[]): number | null {
  const latest = getLatestPeriodEntry(entries);
  if (!latest) return null;

  const start = parseLocalDate(latest.startDate);
  const today = parseLocalDate(localDateString());
  const diffMs = today.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}

export function getCycleLengths(entries: PeriodEntry[]): number[] {
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const lengths: number[] = [];

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = parseLocalDate(sorted[index - 1].startDate);
    const current = parseLocalDate(sorted[index].startDate);
    const days = Math.round((current.getTime() - previous.getTime()) / 86_400_000);
    lengths.push(Math.max(days, 0));
  }

  return lengths;
}

export function getLastCycleLength(entries: PeriodEntry[]): number | null {
  const lengths = getCycleLengths(entries);
  return lengths.length > 0 ? lengths[lengths.length - 1] : null;
}

export function getRecentCycleLengths(
  entries: PeriodEntry[],
  limit = 12,
): number[] {
  return getCycleLengths(entries).slice(-limit);
}

function parseLocalDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function formatPeriodDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
