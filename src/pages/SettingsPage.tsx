import { useRef, useState } from "react";
import { db } from "../data/database/db";
import type { Profile } from "../domain/entities/Profile";

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
  const importRef = useRef<HTMLInputElement>(null);

  async function exportBackup() {
    const backup: LiftLogBackup = {
      app: "LiftLog",
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
    anchor.download = `liftlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
        setBackupMessage("This is not a valid LiftLog backup.");
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
        ? "Backup restored. Reloading LiftLog…"
        : "Backup merged. Reloading LiftLog…",
    );
    window.setTimeout(() => window.location.reload(), 500);
  }

  return (
    <section>
      <h1 className="page-title">Settings</h1>

      <div className="card settings-card">
        <label>
          Bodyweight
          <input
            type="number"
            min="0"
            step="0.1"
            value={draft.bodyweight ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                bodyweight: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        </label>

        <label>
          Gender
          <select
            value={draft.gender}
            onChange={(event) =>
              setDraft({
                ...draft,
                gender: event.target.value as Profile["gender"],
              })
            }
          >
            <option value="UNSPECIFIED">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

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
          onClick={async () => {
            await onSave(draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
          }}
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
          <button className="secondary" onClick={exportBackup}>
            Export backup
          </button>
          <button
            className="secondary"
            onClick={() => importRef.current?.click()}
          >
            Import backup
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
                className="secondary"
                onClick={() => void importBackup("merge")}
              >
                Merge with current data
              </button>
              <button
                className="danger-text"
                onClick={() => {
                  if (
                    window.confirm(
                      "Replace all current LiftLog data with this backup? This cannot be undone.",
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
    </section>
  );
}


type LiftLogBackup = {
  app: "LiftLog";
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
    candidate.app !== "LiftLog" ||
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
