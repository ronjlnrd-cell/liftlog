import { useEffect, useRef, useState } from "react";
import { getDb } from "../data/database/databaseManager";
import type { Profile } from "../domain/entities/Profile";
import { exportTrainingDataToExcel } from "../export/excelExporter";
import { APP_NAME } from "../shared";
import { CycleTrackingConsentModal } from "../components/CycleTrackingConsentModal";

const LEGACY_BACKUP_APP_NAME = "LiftLog";

type SettingsPageProps = {
  profile: Profile;
  onSave: (profile: Profile) => Promise<void>;
};

export function SettingsPage({
  profile,
  onSave,
}: SettingsPageProps) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [pendingBackup, setPendingBackup] = useState<LiftLogBackup | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingEnableCycle, setPendingEnableCycle] = useState(false);
  const [pendingGenderSave, setPendingGenderSave] = useState(false);
  const previousGenderRef = useRef(profile.gender);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(profile);
    previousGenderRef.current = profile.gender;
  }, [profile]);

  const isFemale = draft.gender === "FEMALE";

  function handleGenderChange(gender: Profile["gender"]) {
    setDraft((current) => ({
      ...current,
      gender,
      ...(gender !== "FEMALE" ? { cycleTrackingEnabled: false } : {}),
    }));
  }

  async function exportExcel() {
    setBackupMessage("");
    try {
      await exportTrainingDataToExcel();
      setBackupMessage("Excel export downloaded.");
    } catch {
      setBackupMessage("Could not export to Excel.");
    }
  }

  async function exportBackup() {
    const db = getDb();
    const backup: LiftLogBackup = {
      app: APP_NAME,
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        exercises: await db.exercises.toArray(),
        templates: await db.templates.toArray(),
        workouts: await db.workouts.toArray(),
        activeWorkout: await db.activeWorkout.toArray(),
        profile: await db.profile.toArray(),
      },
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stronger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Backup exported.");
  }

  async function readBackup(file: File) {
    setBackupMessage("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isLiftLogBackup(parsed)) {
        setPendingBackup(null);
        setBackupMessage(`This is not a valid ${APP_NAME} backup.`);
        return;
      }
      setPendingBackup(parsed);
    } catch {
      setPendingBackup(null);
      setBackupMessage("Could not read this backup file.");
    }
  }

  async function importBackup(mode: "merge" | "replace") {
    if (!pendingBackup) return;
    const data = pendingBackup.data;
    const db = getDb();

    await db.transaction(
      "rw",
      [db.exercises, db.templates, db.workouts, db.activeWorkout, db.profile],
      async () => {
        if (mode === "replace") {
          await Promise.all([
            db.exercises.clear(),
            db.templates.clear(),
            db.workouts.clear(),
            db.activeWorkout.clear(),
            db.profile.clear(),
          ]);
        }
        await db.exercises.bulkPut(data.exercises);
        await db.templates.bulkPut(data.templates);
        await db.workouts.bulkPut(data.workouts);
        await db.activeWorkout.bulkPut(data.activeWorkout);
        await db.profile.bulkPut(data.profile);
      },
    );

    setPendingBackup(null);
    setBackupMessage(
      mode === "replace"
        ? `Backup restored. Reloading ${APP_NAME}…`
        : `Backup merged. Reloading ${APP_NAME}…`,
    );
    window.setTimeout(() => window.location.reload(), 500);
  }

  function handleCycleToggle(enabled: boolean) {
    if (!enabled) {
      const next = { ...draft, cycleTrackingEnabled: false };
      setDraft(next);
      void saveDraft(next);
      return;
    }

    setPendingEnableCycle(true);
    setConsentOpen(true);
  }

  async function saveDraft(next: Profile) {
    await onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function handleSaveSettings() {
    const becameFemale =
      previousGenderRef.current !== "FEMALE" && draft.gender === "FEMALE";

    if (becameFemale && !draft.cycleTrackingEnabled) {
      setPendingGenderSave(true);
      setConsentOpen(true);
      return;
    }

    await saveDraft(draft);
    previousGenderRef.current = draft.gender;
  }

  async function handleConsentAccept() {
    const next = {
      ...draft,
      cycleTrackingEnabled: true,
      cycleTrackingConsentCompleted: true,
    };
    setDraft(next);
    setConsentOpen(false);
    setPendingEnableCycle(false);

    if (pendingGenderSave) {
      setPendingGenderSave(false);
      await saveDraft(next);
      previousGenderRef.current = next.gender;
      return;
    }

    if (pendingEnableCycle) {
      await saveDraft(next);
    }
  }

  function handleConsentDecline() {
    setConsentOpen(false);
    setPendingEnableCycle(false);

    if (pendingGenderSave) {
      setPendingGenderSave(false);
      void saveDraft({
        ...draft,
        cycleTrackingEnabled: false,
        cycleTrackingConsentCompleted: true,
      });
      previousGenderRef.current = draft.gender;
    }
  }

  return (
    <section>
      <h1 className="page-title">Settings</h1>

      <div className="card settings-card">
        <label>
          Gender
          <select
            value={draft.gender}
            onChange={(event) =>
              handleGenderChange(event.target.value as Profile["gender"])
            }
          >
            <option value="UNSPECIFIED">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        {isFemale ? (
          <div className="settings-health-block">
            <h2>Health</h2>
            <label className="settings-toggle-row">
              <span>Track menstrual cycle</span>
              <span className="settings-toggle">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Track menstrual cycle"
                  checked={draft.cycleTrackingEnabled === true}
                  onChange={(event) => handleCycleToggle(event.target.checked)}
                />
                <span className="settings-toggle-track" aria-hidden="true" />
              </span>
            </label>
          </div>
        ) : (
          <p className="settings-health-note muted">
            Menstrual cycle tracking is available when gender is set to Female.
          </p>
        )}

        <label>
          Weight unit
          <select
            value={draft.weightUnit}
            onChange={(event) =>
              setDraft({
                ...draft,
                weightUnit:
                  event.target.value as Profile["weightUnit"],
              })
            }
          >
            <option value="KG">Kilograms</option>
            <option value="LB">Pounds</option>
          </select>
        </label>

        <button
          className="primary"
          onClick={() => void handleSaveSettings()}
        >
          Save settings
        </button>

        {saved && <p className="success">Saved.</p>}
      </div>

      <div className="card settings-card backup-card">
        <div>
          <h2>Data & backup</h2>
          <p>Save a copy of your workouts, templates, exercises and profile.</p>
        </div>

        <div className="backup-actions">
          <button
            type="button"
            className="backup-action-button backup-export"
            onClick={() => void exportExcel()}
          >
            <span className="backup-action-icon" aria-hidden="true">
              ↓
            </span>
            <span className="backup-action-copy">
              <strong>Export to Excel</strong>
              <small>Download a multi-sheet workbook</small>
            </span>
          </button>
          <button
            type="button"
            className="backup-action-button backup-export"
            onClick={exportBackup}
          >
            <span className="backup-action-icon" aria-hidden="true">
              ↓
            </span>
            <span className="backup-action-copy">
              <strong>Export backup</strong>
              <small>Download a JSON file</small>
            </span>
          </button>
          <button
            type="button"
            className="backup-action-button backup-import"
            onClick={() => importRef.current?.click()}
          >
            <span className="backup-action-icon" aria-hidden="true">
              ↑
            </span>
            <span className="backup-action-copy">
              <strong>Import backup</strong>
              <small>Restore from a file</small>
            </span>
          </button>
          <input
            ref={importRef}
            className="backup-file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readBackup(file);
              event.currentTarget.value = "";
            }}
          />
        </div>

        {pendingBackup && (
          <div className="backup-preview">
            <strong>Backup ready to import</strong>
            <p>
              {pendingBackup.data.workouts.length} workouts ·{" "}
              {pendingBackup.data.templates.length} templates ·{" "}
              {pendingBackup.data.exercises.length} exercises
            </p>
            <small>
              Exported {new Date(pendingBackup.exportedAt).toLocaleString()}
            </small>
            <div className="backup-import-actions">
              <button
                type="button"
                className="backup-confirm-button backup-merge"
                onClick={() => void importBackup("merge")}
              >
                Merge with current data
              </button>
              <button
                type="button"
                className="backup-confirm-button backup-replace"
                onClick={() => {
                  if (
                    window.confirm(
                      `Replace all current ${APP_NAME} data with this backup? This cannot be undone.`,
                    )
                  ) {
                    void importBackup("replace");
                  }
                }}
              >
                Replace current data
              </button>
            </div>
          </div>
        )}

        {backupMessage && <p className="success">{backupMessage}</p>}
      </div>

      {consentOpen && (
        <CycleTrackingConsentModal
          onAccept={() => void handleConsentAccept()}
          onDecline={handleConsentDecline}
        />
      )}
    </section>
  );
}


type LiftLogBackup = {
  app: typeof APP_NAME | typeof LEGACY_BACKUP_APP_NAME;
  version: 1;
  exportedAt: string;
  data: {
    exercises: any[];
    templates: any[];
    workouts: any[];
    activeWorkout: any[];
    profile: Profile[];
  };
};

function isLiftLogBackup(value: unknown): value is LiftLogBackup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LiftLogBackup>;
  if (
    (candidate.app !== APP_NAME && candidate.app !== LEGACY_BACKUP_APP_NAME) ||
    candidate.version !== 1 ||
    typeof candidate.exportedAt !== "string" ||
    !candidate.data
  ) {
    return false;
  }

  const data = candidate.data as LiftLogBackup["data"];
  return (
    Array.isArray(data.exercises) &&
    Array.isArray(data.templates) &&
    Array.isArray(data.workouts) &&
    Array.isArray(data.activeWorkout) &&
    Array.isArray(data.profile)
  );
}
