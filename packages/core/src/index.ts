// feat: public API surface for @kaankhol/core

// --- extract ---
export {
  normDigits,
  regexExtract,
  FieldsSchema,
} from './extract.js';
export type { Fields } from './extract.js';

// --- status ---
export type { Status } from './status.js';

// --- fuse ---
export { vote } from './fuse.js';
export type { Pass, VoteResult } from './fuse.js';

// --- verify ---
export { verifyTrain, verifyPlatform } from './verify.js';
// Note: Status is already exported above from status.ts; Train and VerifyResult only
export type { Train, VerifyResult } from './verify.js';

// --- score ---
export { clarityScore } from './score.js';

// --- tts ---
export { TTS_TEMPLATES, buildTTSSentence } from './tts.js';
