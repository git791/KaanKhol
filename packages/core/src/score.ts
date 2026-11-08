// feat: clarity score calculator for fused announcement results
import type { Status } from './status.js';

/**
 * Shape of the fused result fields accepted by `clarityScore`.
 * Matches the output produced by the verify step.
 */
type ScoredFields = {
  trainNo: { status: Status };
  trainName: { status: Status };
  platform: { status: Status };
  delayMin?: { status: Status } | undefined;
};

/**
 * Compute a 0-100 clarity score from a fused, verified result.
 *
 * The three primary fields (trainNo, trainName, platform) are always expected.
 * delayMin is included in the denominator only when it is present in `fields`.
 *
 * Score = round(100 * verifiedCount / expectedCount)
 *
 * Only fields with `status === 'verified'` contribute to the numerator.
 *
 * @param fields - Fused result fields with per-field status values.
 * @returns Integer in the range [0, 100].
 */
export function clarityScore(fields: ScoredFields): number {
  const checks: Status[] = [
    fields.trainNo.status,
    fields.trainName.status,
    fields.platform.status,
  ];

  if (fields.delayMin !== undefined) {
    checks.push(fields.delayMin.status);
  }

  const verified = checks.filter((s) => s === 'verified').length;
  return Math.round((100 * verified) / checks.length);
}
