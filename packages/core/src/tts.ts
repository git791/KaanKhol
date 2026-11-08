// feat: TTS sentence builders for trilingual railway announcements

/**
 * Input fields required to build a TTS announcement sentence.
 * All fields must be pre-verified before calling `buildTTSSentence`.
 */
type TTSFields = {
  trainNo: string;
  trainName: string;
  platform: string;
  delayMin?: number | undefined;
};

/**
 * Per-language sentence builder functions.
 * Keys are BCP-47 language tags.
 */
export const TTS_TEMPLATES: Record<string, (f: TTSFields) => string> = {
  'en-IN': (f) => {
    const base = `Train ${f.trainNo}, ${f.trainName}, is now arriving on platform ${f.platform}.`;
    if (f.delayMin !== undefined && f.delayMin > 0) {
      return `${base} It is running ${f.delayMin} minute${f.delayMin === 1 ? '' : 's'} late.`;
    }
    return base;
  },

  'hi-IN': (f) => {
    const base = `गाड़ी संख्या ${f.trainNo}, ${f.trainName}, प्लेटफॉर्म ${f.platform} पर आ रही है।`;
    if (f.delayMin !== undefined && f.delayMin > 0) {
      return `${base} यह ${f.delayMin} मिनट देरी से चल रही है।`;
    }
    return base;
  },

  'kn-IN': (f) => {
    const base = `ರೈಲು ಸಂಖ್ಯೆ ${f.trainNo}, ${f.trainName}, ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ${f.platform} ರಲ್ಲಿ ಆಗಮಿಸುತ್ತಿದೆ.`;
    if (f.delayMin !== undefined && f.delayMin > 0) {
      return `${base} ಇದು ${f.delayMin} ನಿಮಿಷ ತಡವಾಗಿ ಓಡುತ್ತಿದೆ.`;
    }
    return base;
  },
};

/**
 * Build a natural-language announcement sentence for the given language.
 *
 * Falls back to `'en-IN'` if `lang` is not in `TTS_TEMPLATES`.
 * Callers must ensure all fields are verified before invoking this function.
 *
 * @param lang   - BCP-47 language tag for the desired output language.
 * @param fields - Verified announcement field values.
 * @returns A complete announcement sentence in the requested language.
 */
export function buildTTSSentence(lang: string, fields: TTSFields): string {
  const builder = TTS_TEMPLATES[lang] ?? TTS_TEMPLATES['en-IN'];
  // The 'en-IN' template is always defined in TTS_TEMPLATES.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return builder!(fields);
}
