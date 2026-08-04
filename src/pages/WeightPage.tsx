import { useMemo, useState } from "react";
import type { BodyweightEntry } from "../domain/entities/BodyweightEntry";
import { localDateString, parseWeightInput } from "../shared";

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";

type Props = {
  entries: BodyweightEntry[];
  unit: "KG" | "LB";
  onAdd: (weight: number, date: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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

export function WeightPage({ entries, unit, onAdd, onDelete }: Props) {
  const [changeRange, setChangeRange] = useState<Range>("3M");
  const [chartRange, setChartRange] = useState<Range>("3M");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(localDateString());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const parsedWeight = parseWeightInput(weight);

  const latest = useMemo(
    () =>
      [...entries].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ??
      null,
    [entries],
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

    setBusy(true);
    setError("");
    try {
      await onAdd(parsedWeight, date);
      setWeight("");
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
          <p className="eyebrow">Bodyweight</p>
          <h1 className="page-title">Weight</h1>
        </div>
      </div>

      <article className="card weight-overview-card">
        <div className="weight-overview-main">
          <div className="weight-stat-block">
            <span className="weight-stat-label">Current</span>
            <strong className="weight-current-value">
              {latest ? latest.weight.toFixed(1) : "—"}
            </strong>
            {latest && (
              <span className="weight-stat-unit">{unit.toLowerCase()}</span>
            )}
          </div>

          <div className="weight-overview-divider" aria-hidden="true" />

          <div className="weight-stat-block">
            <span className="weight-stat-label">Change</span>
            <strong className={`weight-change-value ${changeClass}`}>
              {change == null
                ? "—"
                : `${change > 0 ? "+" : ""}${change.toFixed(1)}`}
            </strong>
            {change != null && (
              <span className="weight-stat-unit">{unit.toLowerCase()}</span>
            )}
          </div>
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
            <strong>Log weight</strong>
            <p className="muted">Add today&apos;s weight or choose another date.</p>
          </div>
        </header>
        <div className="weight-log-controls">
          <label>
            Weight
            <input
              type="number"
              min="1"
              step="0.1"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder={unit}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={busy || parsedWeight == null}
            onClick={() => void handleLogWeight()}
          >
            Log weight
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </article>

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
        {entries.length === 0 ? (
          <p className="muted">No weights logged yet.</p>
        ) : (
          [...entries]
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
            ))
        )}
      </article>
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
