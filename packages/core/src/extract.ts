// feat: regex-based field extractor for trilingual railway announcements
import { z } from 'zod';

/**
 * Devanagari digit codepoints 0-9 (U+0966 - U+096F).
 * Used to normalise Devanagari numerals before regex matching.
 */
const DEVANAGARI = '०१२३४५६७८९';

/**
 * Replace every Devanagari digit in `s` with its ASCII equivalent.
 * All other characters are preserved as-is.
 *
 * @param s - Raw string that may contain Devanagari numerals.
 * @returns String with Devanagari numerals replaced by ASCII digits 0-9.
 */
export const normDigits = (s: string): string =>
  s.replace(/[०-९]/gu, (ch) => {
    const idx = DEVANAGARI.indexOf(ch);
    return idx === -1 ? ch : String(idx);
  });

/**
 * Structured fields extracted from a single STT transcript.
 * All fields are optional because extraction may fail for any given language.
 */
export type Fields = {
  trainNo?: string | undefined;
  platform?: string | undefined;
  delayMin?: number | undefined;
  trainName?: string | undefined;
};

// ---------------------------------------------------------------------------
// Internal regex patterns
// ---------------------------------------------------------------------------

/** Matches a 5-digit train number (word-bounded). */
const TRAIN_NO_RE = /\b(\d{5})\b/u;

const WORD_NUMS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  एक: '1', दो: '2', तीन: '3', चार: '4', पांच: '5', पाँच: '5',
  छह: '6', सात: '7', आठ: '8', नौ: '9', दस: '10',
  ಒಂದು: '1', ಎರಡು: '2', ಮೂರು: '3', ನಾಲ್ಕು: '4', ಐದು: '5',
  ಆರು: '6', ಏಳು: '7', ಎಂಟು: '8', ಒಂಬತ್ತು: '9', ಹತ್ತು: '10',
};

const WORD_NUMS_PATTERN = Object.keys(WORD_NUMS).join('|');

/**
 * Matches a platform announcement followed by 1-2 digits or number words.
 * Supports English, Hindi and Kannada keywords for "platform" and "number".
 */
const PLATFORM_RE = new RegExp(
  `(?:platform|प्लेटफॉर्म|प्लेटफार्म|ಪ್ಲಾಟ್‌ಫಾರ್ಮ್)\\s*(?:number|नंबर|संख्या|ನಂಬರ್)?\\s*(\\d{1,2}|${WORD_NUMS_PATTERN})`,
  'iu'
);

/**
 * Matches a delay duration before "minutes" keywords.
 * Supports English, Hindi and Kannada.
 */
const DELAY_RE = new RegExp(
  `(\\d+|${WORD_NUMS_PATTERN})\\s*(?:minutes?|मिनट|ನಿಮಿಷ)`,
  'iu'
);

/**
 * Extract structured fields from a single STT transcript using regex patterns.
 * Devanagari digits are normalised to ASCII before matching.
 *
 * @param text - Raw transcript text from one language pass.
 * @returns Partial `Fields` object; only matched fields are populated.
 */
export function regexExtract(text: string): Fields {
  const normalised = normDigits(text);
  const result: Fields = {};

  const trainNoMatch = TRAIN_NO_RE.exec(normalised);
  if (trainNoMatch?.[1] !== undefined) {
    result.trainNo = trainNoMatch[1];
  }

  const platformMatch = PLATFORM_RE.exec(normalised);
  if (platformMatch?.[1] !== undefined) {
    const rawVal = platformMatch[1].toLowerCase();
    result.platform = WORD_NUMS[rawVal] ?? rawVal;
  }

  const delayMatch = DELAY_RE.exec(normalised);
  if (delayMatch?.[1] !== undefined) {
    const rawVal = delayMatch[1].toLowerCase();
    const digitVal = WORD_NUMS[rawVal] ?? rawVal;
    result.delayMin = parseInt(digitVal, 10);
  }

  return result;
}

/**
 * Zod schema for validating LLM-extracted or externally-supplied field objects.
 * Acts as the type boundary guard before any downstream processing.
 */
export const FieldsSchema = z.object({
  trainNo: z.string().regex(/^\d{5}$/).optional(),
  trainName: z.string().max(60).optional(),
  platform: z.string().regex(/^\d{1,2}$/).optional(),
  delayMin: z.number().int().min(0).max(1440).optional(),
});
