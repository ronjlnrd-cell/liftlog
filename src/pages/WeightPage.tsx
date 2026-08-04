import { useMemo, useState } from "react";
import type { BodyweightEntry } from "../domain/entities/BodyweightEntry";
import type { PeriodEntry } from "../domain/entities/PeriodEntry";
import {
  daysSinceLastPeriod,
  formatPeriodDate,
  getLatestPeriodEntry,
} from "../domain/analytics/periodTracking";
import { LogPeriodModal } from "../components/LogPeriodModal";
import { localDateString, parseWeightInput } from "../shared";

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";

type Props = {
  entries: BodyweightEntry[];
  periodEntries: PeriodEntry[];
  unit: "KG" | "LB";
  cycleTrackingEnabled: boolean;
  onAdd: (weight: number, date: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLogPeriod: (startDate: string) => Promise<void>;
  onDeletePeriod: (id: string) => Promise<void>;
};

const RANGE_DAYS: Record<Exclude<Range, "ALL">, number> = {
  "1M": 31,
  "3M": 93,
  "6M": 186,
  "1Y": 366,
};

const RANGE_OPTIONS: Range[] = ["1M", "3M", "6M", "1Y", "ALL"];

function rangeLabel(range: Range) {
  if (range === "ALL") return "All";
  return range;
}

function filterByRange(entries: BodyweightEntry[], range: Range) {
  const sorted = [...entries].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
  if (range === "ALL") return sorted;
  const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
  return sorted.filter(
    (entry) => new Date(entry.recordedAt).getTime() >= cutoff,
  );
}

function WeightRangeTabs({
  value,
  onChange,
  ariaLabel,
}: {
  value: Range;
  onChange: (range: Range) => void;
  ariaLabel: string;
}) {
  return (
    <div className="weight-range-tabs" role="tablist" aria-label={ariaLabel}>
      {RANGE_OPTIONS.map((range) => (
        <button
          key={range}
          type="button"
          role="tab"
          aria-selected={value === range}
          className={value === range ? "active" : ""}
          onClick={() => onChange(range)}
        >
          {rangeLabel(range)}
        </button>
      ))}
    </div>
  );
}

export function WeightPage({
  entries,
  periodEntries,
  unit,
  cycleTrackingEnabled,
  onAdd,
  onDelete,
  onLogPeriod,
  onDeletePeriod,
}: Props) {
  const [changeRange, setChangeRange] = useState<Range>("3M");
  const [chartRange, setChartRange] = useState<Range>("3M");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(localDateString());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);

  const parsedWeight = parseWeightInput(weight);

  const latest = useMemo(
    () =>
      [...entries].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ??
      null,
    [entries],
  );

  const latestPeriod = useMemo(
    () => getLatestPeriodEntry(periodEntries),
    [periodEntries],
  );

  const daysSincePeriod = useMemo(
    () => daysSinceLastPeriod(periodEntries),
    [periodEntries],
  );

  const changeEntries = useMemo(
    () => filterByRange(entries, changeRange),
    [entries, changeRange],
  );

  const chartEntries = useMemo(
    () => filterByRange(entries, chartRange),
    [entries, chartRange],
  );

  const change = useMemo(() => {
    if (!latest || changeEntries.length < 2) return null;
    return latest.weight - changeEntries[0].weight;
  }, [latest, changeEntries]);

  const changeClass =
    change == null
      ? ""
      : change > 0
        ? "weight-change-up"
        : change < 0
          ? "weight-change-down"
          : "weight-change-flat";

  const chartPoints = useMemo(() => buildChartPoints(chartEntries), [chartEntries]);

  async function handleLogWeight() {
    if (parsedWeight == null) {
      setError("Enter a valid weight.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }

    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await onAdd(parsedWeight, date);
      setWeight("");
      setSaved(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save weight. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="weight-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Health</p>
          <h1 className="page-title">Weight</h1>
        </div>
      </div>

      <article className="card weight-overview-card">
        <div
          className={`weight-overview-main${
            cycleTrackingEnabled ? " with-cycle-stat" : ""
          }`}
        >
          <div className="weight-stat-block">
            <span className="weight-stat-label">Current Weight</span>
            <strong className="weight-current-value">
              {latest ? latest.weight.toFixed(1) : "—"}
            </strong>
            {latest && (
              <span className="weight-stat-unit">{unit.toLowerCase()}</span>
            )}
          </div>

          <div className="weight-overview-divider" aria-hidden="true" />

          <div className="weight-stat-block">
            <span className="weight-stat-label">Weight Change</span>
            <strong className={`weight-change-value ${changeClass}`}>
              {change == null
                ? "—"
                : `${change > 0 ? "+" : ""}${change.toFixed(1)}`}
            </strong>
            {change != null && (
              <span className="weight-stat-unit">{unit.toLowerCase()}</span>
            )}
          </div>

          {cycleTrackingEnabled && (
            <>
              <div className="weight-overview-divider" aria-hidden="true" />
              <div className="weight-stat-block">
                <span className="weight-stat-label">Days Since Last Period</span>
                <strong className="weight-change-value">
                  {daysSincePeriod == null ? "—" : `${daysSincePeriod} days`}
                </strong>
              </div>
            </>
          )}
        </div>

        <WeightRangeTabs
          value={changeRange}
          onChange={setChangeRange}
          ariaLabel="Change period"
        />
      </article>

      <article className="card weight-log-card">
        <header className="weight-log-header">
          <div>
            <strong>Weight</strong>
            <p className="muted">Add today&apos;s weight or choose another date.</p>
          </div>
        </header>
        <form
          className="weight-log-controls"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogWeight();
          }}
        >
          <label>
            Weight
            <input
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value);
                setSaved(false);
              }}
              placeholder="Enter Weight"
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSaved(false);
              }}
            />
          </label>
          <button
            type="submit"
            className="primary"
            disabled={busy || parsedWeight == null || !date}
          >
            {busy ? "Saving…" : "Save Weight"}
          </button>
        </form>
        {saved && <p className="weight-save-success">Weight logged.</p>}
        {error && <p className="error">{error}</p>}
      </article>

      {cycleTrackingEnabled && (
        <article className="card cycle-log-card">
          <header className="weight-log-header">
            <div>
              <strong>Menstrual Cycle</strong>
              <p className="muted">Last period started</p>
            </div>
          </header>
          <p className="cycle-last-period">
            {latestPeriod ? formatPeriodDate(latestPeriod.startDate) : "—"}
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => setPeriodModalOpen(true)}
          >
            Log New Period
          </button>
        </article>
      )}

      <article className="card weight-chart-card">
        <div className="weight-chart-head">
          <h2>Weight trend</h2>
          <WeightRangeTabs
            value={chartRange}
            onChange={setChartRange}
            ariaLabel="Chart period"
          />
        </div>

        {chartPoints.length < 2 ? (
          <div className="weight-empty">
            Log at least two weights to see your trend.
          </div>
        ) : (
          <svg
            className="weight-chart"
            viewBox="0 0 700 260"
            role="img"
            aria-label="Bodyweight over time"
          >
            <polyline
              points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {chartPoints.map((point, index) => (
              <circle key={index} cx={point.x} cy={point.y} r="5" fill="currentColor">
                <title>{point.label}</title>
              </circle>
            ))}
          </svg>
        )}
      </article>

      <article className="card weight-history">
        <h2>Recent entries</h2>
        {entries.length === 0 && (!cycleTrackingEnabled || periodEntries.length === 0) ? (
          <p className="muted">No entries logged yet.</p>
        ) : (
          <>
            {entries.length > 0 && (
              <div className="weight-history-group">
                {cycleTrackingEnabled && periodEntries.length > 0 && (
                  <h3 className="weight-history-group-title">Weight</h3>
                )}
                {[...entries]
                  .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
                  .slice(0, 20)
                  .map((entry) => (
                    <div className="weight-history-row" key={entry.id}>
                      <div>
                        <strong>
                          {entry.weight.toFixed(1)} {unit.toLowerCase()}
                        </strong>
                        <span>{new Date(entry.recordedAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Delete weight"
                        onClick={() => void onDelete(entry.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {cycleTrackingEnabled && periodEntries.length > 0 && (
              <div className="weight-history-group">
                <h3 className="weight-history-group-title">Menstrual cycle</h3>
                {[...periodEntries]
                  .sort((a, b) => b.startDate.localeCompare(a.startDate))
                  .slice(0, 20)
                  .map((entry) => (
                    <div className="weight-history-row" key={entry.id}>
                      <div>
                        <strong>Period started</strong>
                        <span>{formatPeriodDate(entry.startDate)}</span>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Delete period"
                        onClick={() => void onDeletePeriod(entry.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </article>

      {periodModalOpen && (
        <LogPeriodModal
          onClose={() => setPeriodModalOpen(false)}
          onSave={onLogPeriod}
        />
      )}
    </section>
  );
}

function buildChartPoints(entries: BodyweightEntry[]) {
  if (entries.length < 2) return [];

  const values = entries.map((entry) => entry.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.25, 0.5);
  const lo = min - pad;
  const hi = max + pad;

  return entries.map((entry, index) => ({
    x: 30 + index * (640 / (entries.length - 1)),
    y: 230 - 200 * ((entry.weight - lo) / (hi - lo)),
    label: `${entry.weight.toFixed(1)} · ${new Date(entry.recordedAt).toLocaleDateString()}`,
  }));
}
