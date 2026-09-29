import { AppNumberPipe } from './app-number.pipe';

describe('AppNumberPipe', () => {
  let pipe: AppNumberPipe;

  beforeEach(() => {
    pipe = new AppNumberPipe();
  });

  it('creates an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('formats whole numbers with exactly 3 decimals', () => {
    expect(pipe.transform(15000)).toBe('15,000.000');
    expect(pipe.transform(100)).toBe('100.000');
    expect(pipe.transform(0)).toBe('0.000');
  });

  it('formats fractional numbers with exactly 3 decimals', () => {
    expect(pipe.transform(1250.5)).toBe('1,250.500');
    expect(pipe.transform(99.7561)).toBe('99.756');
    expect(pipe.transform(0.1)).toBe('0.100');
  });

  it('accepts numeric strings', () => {
    expect(pipe.transform('15000')).toBe('15,000.000');
    expect(pipe.transform('1250.5')).toBe('1,250.500');
  });

  it('returns null for empty/invalid values', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform('')).toBeNull();
    expect(pipe.transform('not-a-number')).toBeNull();
    expect(pipe.transform(NaN)).toBeNull();
  });

  it('formats negative numbers', () => {
    expect(pipe.transform(-15000)).toBe('-15,000.000');
    expect(pipe.transform(-1250.5)).toBe('-1,250.500');
  });
});
