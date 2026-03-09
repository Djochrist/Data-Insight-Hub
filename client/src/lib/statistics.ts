export type NumericSummary = {
  count: number;
  missing: number;
  min: number;
  max: number;
  range: number;
  mean: number;
  median: number;
  mode: number | null;
  variance: number;
  standardDeviation: number;
  q1: number;
  q3: number;
  iqr: number;
  sum: number;
};

export type HistogramBin = {
  label: string;
  start: number;
  end: number;
  frequency: number;
};

function sortNumbers(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function round(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getNumericValues(rows: Record<string, unknown>[], key: string) {
  return rows
    .map((row) => {
      const value = row[key];
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value !== null);
}

export function getMissingCount(rows: Record<string, unknown>[], key: string) {
  return rows.reduce((count, row) => {
    const value = row[key];
    return typeof value === "number" && Number.isFinite(value) ? count : count + 1;
  }, 0);
}

export function quantile(values: number[], ratio: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = sortNumbers(values);
  const index = (sorted.length - 1) * ratio;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return round(sorted[lowerIndex]);
  }

  return round(sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight);
}

export function summarizeNumeric(values: number[], missing = 0): NumericSummary | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = sortNumbers(values);
  const count = sorted.length;
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = sum / count;
  const variance = sorted.reduce((acc, value) => acc + (value - mean) ** 2, 0) / count;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);

  const frequencies = new Map<number, number>();
  for (const value of sorted) {
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  }

  let mode: number | null = null;
  let maxFrequency = 1;
  for (const [value, frequency] of frequencies.entries()) {
    if (frequency > maxFrequency) {
      maxFrequency = frequency;
      mode = value;
    }
  }

  return {
    count,
    missing,
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    range: round(sorted[sorted.length - 1] - sorted[0]),
    mean: round(mean),
    median,
    mode,
    variance: round(variance),
    standardDeviation: round(Math.sqrt(variance)),
    q1,
    q3,
    iqr: round(q3 - q1),
    sum: round(sum),
  };
}

export function buildHistogram(values: number[], requestedBins?: number) {
  if (values.length === 0) {
    return [];
  }

  const sorted = sortNumbers(values);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (min === max) {
    return [
      {
        label: `${round(min)}`,
        start: min,
        end: max,
        frequency: sorted.length,
      },
    ];
  }

  const binsCount = requestedBins ?? Math.max(6, Math.min(16, Math.round(Math.sqrt(sorted.length))));
  const width = (max - min) / binsCount;

  const bins: HistogramBin[] = Array.from({ length: binsCount }, (_, index) => {
    const start = min + index * width;
    const end = index === binsCount - 1 ? max : start + width;

    return {
      label: `${round(start, 2)}-${round(end, 2)}`,
      start,
      end,
      frequency: 0,
    };
  });

  for (const value of sorted) {
    const rawIndex = Math.floor((value - min) / width);
    const index = Math.min(rawIndex, bins.length - 1);
    bins[index].frequency += 1;
  }

  return bins;
}

export function buildFrequencyPolygon(values: number[], requestedBins?: number) {
  return buildHistogram(values, requestedBins).map((bin) => ({
    x: round((bin.start + bin.end) / 2, 3),
    frequency: bin.frequency,
  }));
}

export function buildBoxPlotData(summary: NumericSummary) {
  return [
    {
      name: "distribution",
      min: summary.min,
      q1: summary.q1,
      median: summary.median,
      q3: summary.q3,
      max: summary.max,
    },
  ];
}
