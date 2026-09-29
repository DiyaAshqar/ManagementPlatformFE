import { SummaryCalculation } from '../models/report-common.model';
import { toNumber } from './report-value.utils';

/**
 * Round to a fixed number of decimals using a string-exponent shift, which
 * avoids the classic `Math.round(1.005 * 100)` float error. This is the
 * module's "safe decimal" primitive for financial values.
 */
export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const shifted = Number(`${value}e${decimals}`);
  if (!Number.isFinite(shifted)) {
    return Number(value.toFixed(decimals));
  }
  return Number(`${Math.round(shifted)}e-${decimals}`);
}

/**
 * Sum using Kahan compensated summation to minimise floating-point drift over
 * large datasets. The result is rounded to `decimals` to strip residual error.
 */
export function safeSum(values: readonly number[], decimals = 2): number {
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    const y = value - compensation;
    const t = sum + y;
    compensation = t - sum - y;
    sum = t;
  }
  return roundTo(sum, decimals);
}

/** Average of the finite values, rounded to `decimals` (0 when empty). */
export function safeAverage(values: readonly number[], decimals = 2): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return 0;
  }
  return roundTo(safeSum(finite, decimals + 4) / finite.length, decimals);
}

/**
 * Apply an aggregate over a set of raw values. Non-numeric values are ignored
 * for numeric aggregates; `count` counts rows regardless of value.
 */
export function aggregate(
  calculation: SummaryCalculation,
  rawValues: readonly unknown[],
  decimals = 2
): number {
  if (calculation === 'count') {
    return rawValues.length;
  }
  const numbers = rawValues
    .map((v) => toNumber(v))
    .filter((v): v is number => v !== null);

  switch (calculation) {
    case 'sum':
      return safeSum(numbers, decimals);
    case 'avg':
      return safeAverage(numbers, decimals);
    case 'min':
      return numbers.length ? roundTo(Math.min(...numbers), decimals) : 0;
    case 'max':
      return numbers.length ? roundTo(Math.max(...numbers), decimals) : 0;
    default:
      return 0;
  }
}
