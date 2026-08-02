import { APP_NAME } from "../shared";

type Props = {
  workouts: number;
  templates: number;
  customExercises: number;
  busy: boolean;
  error: string;
  onMigrate: () => Promise<void>;
  onSkip: () => void;
};

export function CloudMigrationPage({
  workouts,
  templates,
  customExercises,
  busy,
  error,
  onMigrate,
  onSkip,
}: Props) {
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div>
          <p className="eyebrow">{APP_NAME} cloud</p>
          <h1>Local data found</h1>
          <p>Copy your existing {APP_NAME} data into this account.</p>
        </div>
        <div className="migration-counts">
          <strong>{workouts}</strong>
          <span>workouts</span>
          <strong>{templates}</strong>
          <span>templates</span>
          <strong>{customExercises}</strong>
          <span>custom exercises</span>
        </div>
        <p className="profile-setup-note">
          Your local data will not be deleted. {APP_NAME} copies it first and
          verifies the cloud records.
        </p>
        <button
          className="primary large"
          disabled={busy}
          onClick={() => void onMigrate()}
        >
          {busy ? "Copying…" : "Move to my account"}
        </button>
        <button className="text-button" disabled={busy} onClick={onSkip}>
          Start with this account&apos;s cloud data
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
