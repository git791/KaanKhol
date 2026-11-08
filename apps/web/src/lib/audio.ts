/**
 * audio.ts — Browser audio capture and 16 kHz mono WAV encoding.
 * No network calls; pure browser APIs only.
 */

/**
 * Convert any audio Blob to a 16 kHz mono WAV Blob.
 * Uses OfflineAudioContext for resampling — works in all modern browsers.
 */
export async function toWav16kMono(blob: Blob): Promise<Blob> {
  const arrayBuf = await blob.arrayBuffer()
  // Use a temporary AudioContext just for decoding
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(arrayBuf)
  } finally {
    await ctx.close()
  }

  if (decoded.duration > 65) {
    throw new Error('Audio is longer than 60 seconds. Trim and try again.')
  }

  const targetRate = 16000
  const length = Math.ceil(decoded.duration * targetRate)
  const off = new OfflineAudioContext(1, length, targetRate)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const rendered = await off.startRendering()

  return encodeWav(rendered.getChannelData(0), targetRate)
}

/** Encode a Float32Array of mono PCM samples to a WAV Blob (PCM 16-bit). */
function encodeWav(samples: Float32Array, rate: number): Blob {
  const dataBytes = samples.length * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buf)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // RIFF header
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeStr(8, 'WAVE')
  // fmt chunk
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)       // chunk size
  view.setUint16(20, 1, true)        // PCM
  view.setUint16(22, 1, true)        // mono
  view.setUint32(24, rate, true)     // sample rate
  view.setUint32(28, rate * 2, true) // byte rate
  view.setUint16(32, 2, true)        // block align
  view.setUint16(34, 16, true)       // bits per sample
  // data chunk
  writeStr(36, 'data')
  view.setUint32(40, dataBytes, true)
  // PCM samples
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true)
  }

  return new Blob([buf], { type: 'audio/wav' })
}

/** Measure current mic input level (0–1) for the pulse ring animation. */
export function createLevelMeter(stream: MediaStream): {
  getLevel: () => number
  stop: () => void
} {
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  const data = new Uint8Array(analyser.frequencyBinCount)

  return {
    getLevel() {
      analyser.getByteFrequencyData(data)
      const sum = data.reduce((a, b) => a + b, 0)
      return sum / (data.length * 255)
    },
    stop() {
      source.disconnect()
      ctx.close()
    },
  }
}

/** Record from mic until stop() is called or maxSeconds is reached. */
export async function startRecording(
  maxSeconds = 60,
  onLevel?: (level: number) => void,
): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const meter = onLevel ? createLevelMeter(stream) : null
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  let levelRaf: number | null = null
  if (meter && onLevel) {
    const tick = () => {
      onLevel(meter.getLevel())
      levelRaf = requestAnimationFrame(tick)
    }
    levelRaf = requestAnimationFrame(tick)
  }

  recorder.start(100) // collect every 100 ms

  // Auto-stop at maxSeconds
  const autoStop = setTimeout(() => recorder.stop(), maxSeconds * 1000)

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        clearTimeout(autoStop)
        if (levelRaf !== null) cancelAnimationFrame(levelRaf)
        meter?.stop()

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          const raw = new Blob(chunks, { type: recorder.mimeType })
          resolve(raw)
        }
        if (recorder.state !== 'inactive') recorder.stop()
      }),
  }
}
