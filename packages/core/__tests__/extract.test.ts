// test: extract.ts — normDigits and regexExtract
import { describe, it, expect } from 'vitest';
import { normDigits, regexExtract, FieldsSchema } from '../src/extract.js';

describe('normDigits', () => {
  it('converts all Devanagari digits to ASCII', () => {
    expect(normDigits('०१२३४५६७८९')).toBe('0123456789');
  });

  it('leaves ASCII digits unchanged', () => {
    expect(normDigits('0123456789')).toBe('0123456789');
  });

  it('converts mixed Devanagari and ASCII', () => {
    expect(normDigits('प्लेटफॉर्म ४')).toBe('प्लेटफॉर्म 4');
  });

  it('handles empty string', () => {
    expect(normDigits('')).toBe('');
  });
});

describe('regexExtract', () => {
  it('extracts a 5-digit train number', () => {
    const result = regexExtract('Train 12345 is arriving shortly.');
    expect(result.trainNo).toBe('12345');
  });

  it('does not extract a 4-digit number as trainNo', () => {
    const result = regexExtract('Train 1234 is arriving shortly.');
    expect(result.trainNo).toBeUndefined();
  });

  it('does not extract a 6-digit number as trainNo', () => {
    const result = regexExtract('Train 123456 is arriving.');
    expect(result.trainNo).toBeUndefined();
  });

  it('extracts platform number from English text', () => {
    const result = regexExtract('The train will arrive at platform 4.');
    expect(result.platform).toBe('4');
  });

  it('extracts platform number from English text with "number" keyword', () => {
    const result = regexExtract('Please proceed to platform number 12.');
    expect(result.platform).toBe('12');
  });

  it('extracts platform number from Hindi text (प्लेटफॉर्म)', () => {
    const result = regexExtract('गाड़ी प्लेटफॉर्म 4 पर आएगी।');
    expect(result.platform).toBe('4');
  });

  it('extracts platform number from Hindi text (प्लेटफार्म)', () => {
    const result = regexExtract('प्लेटफार्म 7 पर पहुंचेगी।');
    expect(result.platform).toBe('7');
  });

  it('extracts delay minutes from English text', () => {
    const result = regexExtract('The train is running 15 minutes late.');
    expect(result.delayMin).toBe(15);
  });

  it('extracts delay minutes from Hindi text', () => {
    const result = regexExtract('गाड़ी 20 मिनट देरी से चल रही है।');
    expect(result.delayMin).toBe(20);
  });

  it('extracts delay minutes from Kannada text', () => {
    const result = regexExtract('ರೈಲು 10 ನಿಮಿಷ ತಡವಾಗಿದೆ.');
    expect(result.delayMin).toBe(10);
  });

  it('returns empty object when no matches', () => {
    const result = regexExtract('No useful information here.');
    expect(result).toStrictEqual({});
  });

  it('extracts trainNo from Devanagari-numeral text after normalisation', () => {
    const result = regexExtract('गाड़ी संख्या १२३४५ प्लेटफॉर्म ३ पर आएगी।');
    expect(result.trainNo).toBe('12345');
    expect(result.platform).toBe('3');
  });
});

describe('FieldsSchema', () => {
  it('accepts a valid object', () => {
    const result = FieldsSchema.safeParse({
      trainNo: '12345',
      trainName: 'Rajdhani Express',
      platform: '4',
      delayMin: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a 4-digit trainNo', () => {
    const result = FieldsSchema.safeParse({ trainNo: '1234' });
    expect(result.success).toBe(false);
  });

  it('rejects a 6-digit trainNo', () => {
    const result = FieldsSchema.safeParse({ trainNo: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects a platform with more than 2 digits', () => {
    const result = FieldsSchema.safeParse({ platform: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects negative delayMin', () => {
    const result = FieldsSchema.safeParse({ delayMin: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects delayMin exceeding 1440', () => {
    const result = FieldsSchema.safeParse({ delayMin: 1441 });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields absent', () => {
    const result = FieldsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects trainName exceeding 60 characters', () => {
    const result = FieldsSchema.safeParse({
      trainName: 'A'.repeat(61),
    });
    expect(result.success).toBe(false);
  });
});
