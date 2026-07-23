import { useState } from "react";
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
    </section>
  );
}
