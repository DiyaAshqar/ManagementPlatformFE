import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
  useGrouping: true,
});

/**
 * Single source of truth for formatting numbers across the system.
 * Always groups thousands and shows exactly 3 decimals, so every number in
 * the app lines up consistently (e.g. 15000 -> "15,000.000", 100 -> "100.000",
 * 1250.5 -> "1,250.500").
 * Use directly (outside templates) wherever a number needs to be composed
 * into a larger string, e.g. with a currency code.
 */
export function formatAppNumber(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return formatter.format(numericValue);
}

@Pipe({
  name: 'appNumber',
  standalone: true,
})
export class AppNumberPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string | null {
    return formatAppNumber(value);
  }
}
