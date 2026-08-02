import { useState } from "react";
import type { Profile } from "../domain/entities/Profile";
import { APP_NAME } from "../shared";

type ProfileSetupResult = {
  profile: Profile;
  bodyweight: number;
};

type Props = {
  initial: Profile;
  initialBodyweight: number | null;
  email: string;
  onComplete: (result: ProfileSetupResult) => Promise<void>;
};

export function ProfileSetupPage({
  initial,
  initialBodyweight,
  email,
  onComplete,
}: Props) {
  const [bodyweight, setBodyweight] = useState(
    initialBodyweight ? String(initialBodyweight) : "",
  );
  const [gender, setGender] = useState<Profile["gender"]>(
    initial.gender === "UNSPECIFIED" ? "MALE" : initial.gender,
  );
  const [weightUnit, setWeightUnit] = useState<Profile["weightUnit"]>(
    initial.weightUnit,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const parsed = Number(bodyweight);
  const valid = Number.isFinite(parsed) && parsed > 0;

  async function complete() {
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      await onComplete({
        profile: {
          id: "profile",
          gender,
          weightUnit,
        },
        bodyweight: parsed,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="card auth-card profile-setup-card">
        <div>
          <p className="eyebrow">Welcome to {APP_NAME}</p>
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
          comparisons. You can update your weight anytime on the Weight page and
          change preferences in Settings.
        </p>

        <button
          className="primary large"
          disabled={!valid || busy}
          onClick={() => void complete()}
        >
          {busy ? "Saving…" : "Continue"}
        </button>

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
