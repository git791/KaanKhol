// feat: majority-vote fusion for multi-language STT passes
import type { Fields } from './extract.js';

/**
 * A single decoded language pass: the language tag and its extracted fields.
 */
export type Pass = {
  /** BCP-47 language tag, e.g. 'en-IN', 'hi-IN', 'kn-IN'. */
  lang: string;
  /** Fields extracted from the STT transcript for this language. */
  fields: Fields;
};

/**
 * Result of a majority vote over a single field across all passes.
 *
 * @template T - The field value type (string or number).
 */
export type VoteResult<T extends string | number> = {
  /**
   * The winning value if a strict majority exists, otherwise `undefined`.
   * A single-pass result is treated as a winner by convention.
   */
  winner?: T | undefined;
  /**
   * Map from string-serialised value to the list of language tags that voted
   * for it. Useful for debugging and status derivation.
   */
  votes: Record<string, string[]>;
};

/**
 * Run a majority vote over `passes` for a single extracted field.
 *
 * Rules:
 * - Passes that return `undefined` for the picked field are ignored.
 * - The candidate with the most votes wins.
 * - On a tie (two or more candidates share the highest vote count), `winner`
 *   is `undefined`.
 * - A single contributing pass is considered a winner.
 *
 * @param passes - Array of decoded language passes.
 * @param pick   - Selector function that extracts the target field from `Fields`.
 * @returns `VoteResult` containing the winning value and the full vote tally.
 */
export function vote<T extends string | number>(
  passes: Pass[],
  pick: (f: Fields) => T | undefined,
): VoteResult<T> {
  // Accumulate votes: serialised value -> list of language tags
  const tally = new Map<string, { value: T; langs: string[] }>();

  for (const pass of passes) {
    const value = pick(pass.fields);
    if (value === undefined) {
      continue;
    }
    const key = String(value);
    const existing = tally.get(key);
    if (existing !== undefined) {
      existing.langs.push(pass.lang);
    } else {
      tally.set(key, { value, langs: [pass.lang] });
    }
  }

  // Build the public votes record
  const votes: Record<string, string[]> = {};
  for (const [key, { langs }] of tally) {
    votes[key] = langs;
  }

  if (tally.size === 0) {
    return { winner: undefined, votes };
  }

  // Find the maximum vote count
  let maxVotes = 0;
  for (const { langs } of tally.values()) {
    if (langs.length > maxVotes) {
      maxVotes = langs.length;
    }
  }

  // Collect all candidates with the maximum vote count
  const topCandidates: T[] = [];
  for (const { value, langs } of tally.values()) {
    if (langs.length === maxVotes) {
      topCandidates.push(value);
    }
  }

  // Tie: more than one candidate shares the top count
  if (topCandidates.length !== 1) {
    return { winner: undefined, votes };
  }

  return { winner: topCandidates[0], votes };
}
