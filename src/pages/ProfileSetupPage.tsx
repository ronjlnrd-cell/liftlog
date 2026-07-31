import { useState } from "react";
import type { Profile } from "../domain/entities/Profile";

type Props = {
  initial: Profile;
  email: string;
  onComplete: (profile: Profile) => Promise<void>;
};

export function ProfileSetupPage({ initial, email, onComplete }: Props) {
  const [bodyweight, setBodyweight] = useState(
    initial.bodyweight ? String(initial.bodyweight) : "",
  );
  const [gender, setGender] = useState<Profile["gender"]>(
    initial.gender === "UNSPECIFIED" ? "MALE" : initial.gender,
  );
  const [weightUnit, setWeightUnit] = useState<Profile["weightUnit"]>(
    initial.weightUnit,
  );
  const [busy, setBusy] = useState(false);

  const parsed = Number(bodyweight);
  const valid = Number.isFinite(parsed) && parsed > 0;

  async function complete() {
    if (!valid) return;
    setBusy(true);
    await onComplete({
      id: "profile",
      bodyweight: parsed,
      gender,
      weightUnit,
    });
    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <section className="card auth-card profile-setup-card">
        <div>
          <p className="eyebrow">Welcome to LiftLog</p>
          <h1>Set up your profile</h1>
          <p>{email}</p>
        </div>

        <label>
          Bodyweight
          <div className="bodyweight-input-row">
            <input
              type="number"
              min="1"
              step="0.1"
              inputMode="decimal"
              value={bodyweight}
              onChange={(event) => setBodyweight(event.target.value)}
              autoFocus
            />
            <select
              value={weightUnit}
              onChange={(event) =>
                setWeightUnit(event.target.value as Profile["weightUnit"])
              }
            >
              <option value="KG">kg</option>
              <option value="LB">lb</option>
            </select>
          </div>
        </label>

        <label>
          Gender
          <select
            value={gender}
            onChange={(event) =>
              setGender(event.target.value as Profile["gender"])
            }
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <p className="profile-setup-note">
          Bodyweight and gender are used for relative strength and strength-level
          comparisons. You can change them later in Settings.
        </p>

        <button
          className="primary large"
          disabled={!valid || busy}
          onClick={() => void complete()}
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </section>
    </main>
  );
}
