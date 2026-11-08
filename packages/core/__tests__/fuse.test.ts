// test: fuse.ts — majority-vote function
import { describe, it, expect } from 'vitest';
import { vote } from '../src/fuse.js';
import type { Pass } from '../src/fuse.js';

const makePass = (lang: string, trainNo?: string, platform?: string): Pass => ({
  lang,
  fields: { trainNo, platform },
});

describe('vote', () => {
  it('returns winner when all 3 passes agree', () => {
    const passes: Pass[] = [
      makePass('en-IN', '12345'),
      makePass('hi-IN', '12345'),
      makePass('kn-IN', '12345'),
    ];
    const result = vote(passes, (f) => f.trainNo);
    expect(result.winner).toBe('12345');
    expect(result.votes['12345']).toHaveLength(3);
  });

  it('returns majority winner when 2 agree and 1 differs', () => {
    const passes: Pass[] = [
      makePass('en-IN', '12345'),
      makePass('hi-IN', '12345'),
      makePass('kn-IN', '99999'),
    ];
    const result = vote(passes, (f) => f.trainNo);
    expect(result.winner).toBe('12345');
    expect(result.votes['12345']).toHaveLength(2);
    expect(result.votes['99999']).toHaveLength(1);
  });

  it('returns undefined winner on a 2-way tie (1 vs 1)', () => {
    const passes: Pass[] = [
      makePass('en-IN', '12345'),
      makePass('hi-IN', '99999'),
    ];
    const result = vote(passes, (f) => f.trainNo);
    expect(result.winner).toBeUndefined();
    expect(result.votes['12345']).toHaveLength(1);
    expect(result.votes['99999']).toHaveLength(1);
  });

  it('returns undefined winner on a 3-way tie', () => {
    const passes: Pass[] = [
      makePass('en-IN', '11111'),
      makePass('hi-IN', '22222'),
      makePass('kn-IN', '33333'),
    ];
    const result = vote(passes, (f) => f.trainNo);
    expect(result.winner).toBeUndefined();
  });

  it('treats a single pass as the winner', () => {
    const passes: Pass[] = [makePass('en-IN', '12345')];
    const result = vote(passes, (f) => f.trainNo);
    expect(result.winner).toBe('12345');
  });

  it('returns undefined winner when all passes are missing the field', () => {
    const passes: Pass[] = [
      makePass('en-IN', undefined),
      makePass('hi-IN', undefined),
      makePass('kn-IN', undefined),
    ];
    const result = vote(passes, (f) => f.trainNo);
    expect(result.winner).toBeUndefined();
    expect(Object.keys(result.votes)).toHaveLength(0);
  });

  it('ignores passes that are missing the field when counting votes', () => {
    const passes: Pass[] = [
      makePass('en-IN', '12345'),
      makePass('hi-IN', undefined),
      makePass('kn-IN', '12345'),
    ];
    const result = vote(passes, (f) => f.trainNo);
    expect(result.winner).toBe('12345');
    expect(result.votes['12345']).toHaveLength(2);
  });

  it('works for numeric fields (delayMin)', () => {
    const passesWithDelay: Pass[] = [
      { lang: 'en-IN', fields: { delayMin: 10 } },
      { lang: 'hi-IN', fields: { delayMin: 10 } },
      { lang: 'kn-IN', fields: { delayMin: 15 } },
    ];
    const result = vote(passesWithDelay, (f) => f.delayMin);
    expect(result.winner).toBe(10);
  });
});
