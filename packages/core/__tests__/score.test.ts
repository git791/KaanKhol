// test: score.ts — clarityScore
import { describe, it, expect } from 'vitest';
import { clarityScore } from '../src/score.js';

const v = { status: 'verified' } as const;
const u = { status: 'unverified' } as const;
const c = { status: 'conflict' } as const;

describe('clarityScore', () => {
  it('returns 100 when all 3 primary fields are verified', () => {
    expect(
      clarityScore({ trainNo: v, trainName: v, platform: v }),
    ).toBe(100);
  });

  it('returns 67 when 2 of 3 primary fields are verified', () => {
    expect(
      clarityScore({ trainNo: v, trainName: v, platform: u }),
    ).toBe(67);
  });

  it('returns 33 when only 1 of 3 primary fields is verified', () => {
    expect(
      clarityScore({ trainNo: v, trainName: u, platform: u }),
    ).toBe(33);
  });

  it('returns 0 when none of the 3 primary fields are verified', () => {
    expect(
      clarityScore({ trainNo: u, trainName: u, platform: u }),
    ).toBe(0);
  });

  it('treats conflict the same as unverified (does not count toward score)', () => {
    expect(
      clarityScore({ trainNo: v, trainName: c, platform: c }),
    ).toBe(33);
  });

  it('includes delayMin in denominator when present and verified', () => {
    // 4 expected, 4 verified → 100
    expect(
      clarityScore({ trainNo: v, trainName: v, platform: v, delayMin: v }),
    ).toBe(100);
  });

  it('includes delayMin in denominator when present and unverified', () => {
    // 4 expected, 3 verified → 75
    expect(
      clarityScore({ trainNo: v, trainName: v, platform: v, delayMin: u }),
    ).toBe(75);
  });

  it('does not include delayMin when it is absent', () => {
    // 3 expected, 2 verified → 67
    expect(
      clarityScore({ trainNo: v, trainName: v, platform: u }),
    ).toBe(67);
  });

  it('returns 0 when all 4 fields including delay are unverified', () => {
    expect(
      clarityScore({ trainNo: u, trainName: u, platform: u, delayMin: u }),
    ).toBe(0);
  });
});
