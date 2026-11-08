// feat: shared Status type to avoid circular imports
/**
 * Verification status for a fused announcement field.
 *
 * - `'verified'`   - Confirmed against the timetable or by majority vote.
 * - `'conflict'`   - Timetable mismatch or vote tie detected.
 * - `'unverified'` - Insufficient data or field not found in the timetable.
 */
export type Status = 'verified' | 'conflict' | 'unverified';
