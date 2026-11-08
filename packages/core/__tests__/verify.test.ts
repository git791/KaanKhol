// test: verify.ts — timetable verification functions
import { describe, it, expect } from 'vitest';
import { verifyTrain, verifyPlatform } from '../src/verify.js';
import { vote } from '../src/fuse.js';
import type { Train } from '../src/verify.js';
import type { Pass } from '../src/fuse.js';

const buildDb = (entries: Train[]): Map<string, Train> =>
  new Map(entries.map((t) => [t.number, t]));

const SAMPLE_DB = buildDb([
  { number: '12345', name: 'Rajdhani Express' },
  { number: '22222', name: 'Shatabdi Express' },
]);

describe('verifyTrain', () => {
  it('returns verified when trainNo is in DB and name matches', () => {
    const result = verifyTrain('12345', 'Rajdh', SAMPLE_DB);
    expect(result.status).toBe('verified');
    expect(result.name).toBe('Rajdhani Express');
  });

  it('returns verified when trainNo is in DB and no name supplied', () => {
    const result = verifyTrain('12345', undefined, SAMPLE_DB);
    expect(result.status).toBe('verified');
    expect(result.name).toBe('Rajdhani Express');
  });

  it('returns conflict when trainNo is in DB but name does not match first 5 chars', () => {
    const result = verifyTrain('12345', 'Shata Express', SAMPLE_DB);
    expect(result.status).toBe('conflict');
    expect(result.expected).toBe('Rajdhani Express');
    expect(result.name).toBeUndefined();
  });

  it('returns unverified when trainNo is not in DB', () => {
    const result = verifyTrain('99999', 'Some Train', SAMPLE_DB);
    expect(result.status).toBe('unverified');
  });

  it('returns unverified when trainNo is undefined', () => {
    const result = verifyTrain(undefined, 'Some Train', SAMPLE_DB);
    expect(result.status).toBe('unverified');
  });

  it('is case-insensitive when comparing the first 5 chars', () => {
    const result = verifyTrain('12345', 'rajdhani Express', SAMPLE_DB);
    expect(result.status).toBe('verified');
  });
});

describe('verifyPlatform', () => {
  it('returns verified when winner exists and voteCount >= 2', () => {
    expect(verifyPlatform('4', 2, 3)).toBe('verified');
    expect(verifyPlatform('4', 3, 3)).toBe('verified');
  });

  it('returns unverified when voteCount is 1', () => {
    expect(verifyPlatform('4', 1, 3)).toBe('unverified');
  });

  it('returns conflict when winner is undefined (tie)', () => {
    expect(verifyPlatform(undefined, 0, 2)).toBe('conflict');
  });

  it('returns unverified when winner is undefined and voteCount is 0', () => {
    // No votes at all — no winner, treated as conflict per spec
    // (winner undefined always returns conflict regardless of voteCount)
    expect(verifyPlatform(undefined, 0, 3)).toBe('conflict');
  });
});

// ---------------------------------------------------------------------------
// Golden test: 1 corrupted trainNo out of 3 passes — majority must win
// ---------------------------------------------------------------------------
describe('golden test: majority vote overrides single corrupted pass', () => {
  it('fused trainNo winner is "12345" despite one pass returning "12346"', () => {
    const passes: Pass[] = [
      { lang: 'en-IN', fields: { trainNo: '12345' } },
      { lang: 'hi-IN', fields: { trainNo: '12345' } },
      { lang: 'kn-IN', fields: { trainNo: '12346' } }, // corrupted
    ];

    const { winner } = vote(passes, (f) => f.trainNo);
    expect(winner).toBe('12345');

    // Verify that winner resolves correctly against the DB
    const db = buildDb([{ number: '12345', name: 'Rajdhani Express' }]);
    const verifyResult = verifyTrain(winner, undefined, db);
    expect(verifyResult.status).toBe('verified');
    expect(verifyResult.name).toBe('Rajdhani Express');
  });
});
