/**
 * generate_sample_wavs.js
 * Generates bundled valid 16 kHz mono PCM WAV files with platform chime & audio signal
 * so that "Try a Sample" in the web UI works immediately out-of-the-box.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.resolve(__dirname, '../../apps/web/public/samples');

function createWavBuffer(sampleRate = 16000, durationSec = 3.5) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataByteSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataByteSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataByteSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // 1 channel (mono)
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate (sr * numChannels * bitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataByteSize, 40);

  // Synthesize Indian Railway Chime (4-tone bell: C5, E5, G5, C6) + subtle carrier wave
  const chimeFreqs = [523.25, 659.25, 783.99, 1046.50];
  const toneDuration = 0.4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Chime phase (first 1.6 seconds)
    if (t < chimeFreqs.length * toneDuration) {
      const toneIdx = Math.floor(t / toneDuration);
      const toneTime = t - toneIdx * toneDuration;
      const freq = chimeFreqs[toneIdx];
      const envelope = Math.exp(-toneTime * 6); // exponential decay
      sample = Math.sin(2 * Math.PI * freq * toneTime) * envelope * 0.5;
    } else {
      // Voice-like modulated harmonic pulses simulating an acoustic announcement
      const voiceT = t - chimeFreqs.length * toneDuration;
      const f0 = 140 + Math.sin(voiceT * 3) * 20; // pitch contour
      const formants =
        Math.sin(2 * Math.PI * f0 * t) * 0.3 +
        Math.sin(2 * Math.PI * f0 * 2 * t) * 0.15 +
        Math.sin(2 * Math.PI * 800 * t) * 0.1;
      const syllableMod = Math.max(0, Math.sin(2 * Math.PI * 4 * voiceT));
      sample = formants * syllableMod * 0.4;
    }

    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer;
}

fs.mkdirSync(SAMPLES_DIR, { recursive: true });

const sbcBuffer = createWavBuffer(16000, 4.0);
fs.writeFileSync(path.join(SAMPLES_DIR, 'sbc-platform4-kn-hi-en.wav'), sbcBuffer);

const ndlsBuffer = createWavBuffer(16000, 4.0);
fs.writeFileSync(path.join(SAMPLES_DIR, 'ndls-rajdhani-kn-hi-en.wav'), ndlsBuffer);

console.log('Sample WAV files created successfully in apps/web/public/samples/');
