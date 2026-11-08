// feat: timetable-based verification for fused announcement fields
import type { Status } from './status.js';

export type { Status };

/**
 * A train record from the timetable dataset.
 */
export type Train = {
  /** 5-digit train number string, e.g. '12345'. */
  number: string;
  /** Official train name as listed in the timetable, e.g. 'Rajdhani Express'. */
  name: string;
};

/**
 * Result of a timetable verification lookup for a train.
 */
export type VerifyResult = {
  /** Overall verification outcome. */
  status: Status;
  /** Canonical train name from the timetable, present when found. */
  name?: string | undefined;
  /** The expected name from the timetable when the provided name conflicts. */
  expected?: string | undefined;
};

/**
 * Verify a fused train number and name against a timetable map.
 *
 * Logic:
 * - `trainNo` absent or not found in `db` → `{ status: 'unverified' }`
 * - `trainNo` found, name provided and first 5 chars differ from DB entry → `{ status: 'conflict', expected }`
 * - `trainNo` found and name matches (or no name to compare) → `{ status: 'verified', name }`
 *
 * @param trainNo - Fused 5-digit train number, or `undefined` if not extracted.
 * @param name    - Fused train name string, or `undefined`.
 * @param db      - Map keyed by 5-digit train number strings.
 * @returns `VerifyResult` with status and optional name fields.
 */
export function verifyTrain(
  trainNo: string | undefined,
  name: string | undefined,
  db: Map<string, Train>,
): VerifyResult {
  if (trainNo === undefined) {
    return { status: 'unverified' };
  }

  const hit = db.get(trainNo);
  if (hit === undefined) {
    return { status: 'unverified' };
  }

  if (name !== undefined) {
    const providedPrefix = name.slice(0, 5).toLowerCase();
    const expectedPrefix = hit.name.slice(0, 5).toLowerCase();
    if (providedPrefix !== expectedPrefix) {
      return { status: 'conflict', expected: hit.name };
    }
  }

  return { status: 'verified', name: hit.name };
}

/**
 * Derive a verification status for a fused platform value.
 *
 * Platform values cannot be verified against the timetable because platform
 * assignments change in real time. Status is derived from vote confidence:
 *
 * - `winner` exists and `voteCount >= 2` → `'verified'`
 * - `winner` is absent (tie) → `'conflict'`
 * - `voteCount < 2` or no winner → `'unverified'`
 *
 * @param winner     - The majority-vote winner for the platform field.
 * @param voteCount  - Number of passes that voted for `winner`.
 * @param totalPasses - Total number of passes (not currently used but kept for
 *   future confidence weighting).
 * @returns The derived `Status`.
 */
export function verifyPlatform(
  winner: string | undefined,
  voteCount: number,
  totalPasses: number,
): Status {
  void totalPasses; // reserved for future confidence weighting
  if (winner === undefined) {
    return 'conflict';
  }
  if (voteCount >= 2) {
    return 'verified';
  }
  return 'unverified';
}
