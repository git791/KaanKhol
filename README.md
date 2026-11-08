# KaanKhol (कान खोल / ಕಿವಿ ತೆರೆಯಿರಿ)

> "Open your ears." A trilingual Indian railway platform announcement decoder using multi-pass speech redundancy, cross-language voting, timetable ground-truth verification, and clear re-speech.

[![Live Demo](https://img.shields.io/badge/Demo-kaankhol.pages.dev-3DDC97?style=for-the-badge)](https://kaankhol.pages.dev)
[![Edge Worker](https://img.shields.io/badge/API-Cloudflare_Worker-FFB62E?style=for-the-badge)](https://kaankhol-edge.m-ayaan-a-ahmed.workers.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-35C4D8?style=for-the-badge)](https://opensource.org/licenses/MIT)

Built for the **Gnani.ai Great Indian AI Internship Challenge** (Target: Nov 9, 2026 · Deadline: Nov 10, 2026, 11:59 PM IST).

- **Primary Award Track:** **Jugaad Genius** (turning platform acoustic repetition into an error-correcting code)
- **Supporting Tracks:** **Noise Canceller** (fact recovery under severe SNR and 8 kHz telephony), **Real Deal** (real timetable data, usable now)
- **Team Members:**
  - **Bibi Sufiya Shariff**
  - **Mohammed Ayaan Adil Ahmed**

---

## 1. The Problem: The Diwali Platform Rush

During festival rush (such as Diwali week), Indian railway stations are cacophonies of crowd murmur, diesel rumble, horn blasts, and reverberant PA systems. Rushed passengers constantly miss critical platform changes and delay announcements.

Platform public address systems repeat every announcement **three times in three languages**:
1. Regional Language (e.g. Kannada `kn-IN`, Tamil `ta-IN`, Marathi `mr-IN`)
2. Hindi (`hi-IN`)
3. Indian English (`en-IN`)

Because of reverberation and ambient noise, acoustic bursts corrupt individual phonemes in any single pass. However, all three passes convey the **exact same underlying facts** (train number, name, platform, delay).

---

## 2. The Solution: Cross-Language Redundancy as an Error-Correcting Code

Instead of treating the three passes as isolated audio events, **KaanKhol treats them as three noisy transmissions of a single message**:

```
[ Ambient Platform Audio ]
            |
            v
   [ 16 kHz Mono WAV ]
            |
  +---------+---------+
  | (Parallel REST)   |
  v                   v                   v
[ Pass 1: kn-IN ]   [ Pass 2: hi-IN ]   [ Pass 3: en-IN ]
(Gnani Prisma v2.5) (Gnani Prisma v2.5) (Gnani Prisma v2.5)
  |                   |                   |
  v                   v                   v
[ Transcript 1 ]    [ Transcript 2 ]    [ Transcript 3 ]
  |                   |                   |
  +---------+---------+
            |
            v
 [ Regex + Workers AI Field Extraction ]
            |
            v
 [ Multi-Pass Majority Voting (fuse.ts) ]
            |
            v
 [ Timetable Ground-Truth Verification (verify.ts) ]
            |
            +---> Match found: Train marked "verified"
            +---> Platform: Verified by cross-pass consensus
            +---> Disagreement: Flagged as "conflict"
            |
            v
 [ Departure Board UI with Verified Signal Chips ]
            |
            v
 [ Re-announce with Gnani Timbre v2.5 TTS + Captions ]
```

---

## 3. Seven-Layer System Architecture

```
Layer 1: Presentation
  React 19, Tailwind v4 (Night Platform tokens), 60 FPS Acoustic Canvas, Lenis, Phosphor Icons
       |
Layer 2: Audio Capture & Resampling
  MediaRecorder API -> OfflineAudioContext resampler -> 16 kHz 16-bit Mono PCM WAV
       |
Layer 3: Edge Security & Routing
  Cloudflare Workers (Hono framework), Zod request boundary validation, daily salted IP hashing
       |
Layer 4: Speech Intelligence
  Gnani Prisma v2.5 (STT parallel passes) & Gnani Timbre v2.5 (Canonical TTS playback)
       |
Layer 5: Understanding & Normalisation
  Devanagari/Indic digit normaliser, bilingual word-numeral regex, Cloudflare Workers AI fallback
       |
Layer 6: Fusion & Ground-Truth Verification
  Pure TypeScript core: multi-pass majority voting, timetable lookup against 76 verified schedules
       |
Layer 7: Persistence & Benchmarking
  Cloudflare D1 SQL database (crowdsourced station clarity) + static SNR benchmark dataset
```

---

## 4. Tech Stack Decisions (100% Free Tier)

| Layer | Choice | Why Chosen | Free Tier Limits |
|---|---|---|---|
| **Frontend** | **Vite + React 19** | Instant HMR, static output for Cloudflare Pages, clean bundling | Unlimited |
| **Styling** | **Tailwind CSS v4** | CSS-first `@theme` tokens mapping directly to the "Night Platform" dark palette | Free / OSS |
| **Edge API** | **Cloudflare Workers (Hono)** | 10ms execution, hides Gnani API key server-side, global edge routing | 100,000 req/day |
| **Database** | **Cloudflare D1** | Serverless SQL (SQLite), zero cold starts, handles IP-hashed ratings | 5M reads/day, 5 GB storage |
| **STT Engine** | **Gnani Prisma v2.5** | High-accuracy multilingual Indian accent speech recognition (REST v3) | 5,000 challenge credits |
| **TTS Engine** | **Gnani Timbre v2.5** | High-fidelity natural Indian voice synthesis for canonical re-speech | 5,000 challenge credits |
| **LLM Fallback**| **Cloudflare Workers AI** | `llama-3.1-8b-instruct` runs directly on the edge for gap extraction | 10,000 Neurons/day |
| **Motion** | **Lenis + GSAP** | Silky 60 FPS smooth scrolling with automatic reduced-motion fallbacks | Free (MIT / Standard) |
| **Icons** | **Phosphor Icons** | Clean technical instrument-panel iconography; **zero emojis** used | Free (MIT) |

---

## 5. Core Implementation Snippets

### 5.1 Client-Side 16 kHz Mono Resampler (`apps/web/src/lib/audio.ts`)
Converts any arbitrary browser recording (44.1 kHz, 48 kHz, stereo) to Gnani's exact input format without server roundtrips:

```typescript
export async function toWav16kMono(blob: Blob): Promise<Blob> {
  const arrayBuf = await blob.arrayBuffer()
  const ctx = new AudioContext()
  const decoded = await ctx.decodeAudioData(arrayBuf)
  await ctx.close()

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
```

### 5.2 Multi-Pass Majority Voting (`packages/core/src/fuse.ts`)
Votes across up to three independent language transcripts for every structured field:

```typescript
export function vote<T extends string | number>(
  passes: Pass[],
  pick: (f: Fields) => T | undefined,
): VoteResult<T> {
  const tally = new Map<string, { value: T; langs: string[] }>()

  for (const pass of passes) {
    const value = pick(pass.fields)
    if (value === undefined) continue
    const key = String(value)
    const existing = tally.get(key)
    if (existing) existing.langs.push(pass.lang)
    else tally.set(key, { value, langs: [pass.lang] })
  }

  // Find majority candidate
  let maxVotes = 0
  for (const { langs } of tally.values()) {
    if (langs.length > maxVotes) maxVotes = langs.length
  }

  const topCandidates: T[] = []
  for (const { value, langs } of tally.values()) {
    if (langs.length === maxVotes) topCandidates.push(value)
  }

  // Strict tie-breaker: on equal votes, winner is undefined (marked conflict)
  if (topCandidates.length !== 1) return { winner: undefined, votes }
  return { winner: topCandidates[0], votes }
}
```

### 5.3 Timetable Ground-Truth Verification (`packages/core/src/verify.ts`)
Validates extracted train numbers and names against the national timetable database:

```typescript
export function verifyTrain(
  trainNo: string | undefined,
  name: string | undefined,
  db: Map<string, Train>,
): VerifyResult {
  if (!trainNo) return { status: 'unverified' }
  const hit = db.get(trainNo)
  if (!hit) return { status: 'unverified' }

  if (name) {
    const providedPrefix = name.slice(0, 5).toLowerCase()
    const expectedPrefix = hit.name.slice(0, 5).toLowerCase()
    if (providedPrefix !== expectedPrefix) {
      return { status: 'conflict', expected: hit.name }
    }
  }

  return { status: 'verified', name: hit.name }
}
```

### 5.4 Edge STT Proxy to Gnani Prisma (`apps/edge/src/routes/stt.ts`)
Never exposes the API key to the client; streams audio in volatile memory:

```typescript
app.post('/', async (c) => {
  const form = await c.req.formData()
  const lang = LangSchema.safeParse(form.get('language_code'))
  const rawFile = form.get('audio_file')

  const upstream = new FormData()
  upstream.set('audio_file', rawFile as any)
  upstream.set('language_code', lang.data)
  upstream.set('preferred_language', lang.data)
  upstream.set('format', 'transcribe')
  upstream.set('itn_native_numerals', 'false')

  const res = await fetch('https://api.vachana.ai/stt/v3', {
    method: 'POST',
    headers: { 'X-API-Key-ID': c.env.GNANI_API_KEY_ID },
    body: upstream,
  })

  return c.json(await res.json())
})
```

---

## 6. End-User Workflow & Experience

```
[ Step 1: Arrive ]
Hero scene renders expanding acoustic shockwaves and three converging language wave ribbons.

[ Step 2: Input ]
User chooses:
  - Record: Taps the amber mic button (auto-resampled to 16 kHz mono WAV)
  - Upload: Drops an existing platform audio clip
  - Sample: Clicks "Bengaluru Platform 4" or "Delhi Express"

[ Step 3: 3-Lane Decoding ]
Three parallel requests fire to Gnani Prisma (kn-IN, hi-IN, en-IN).
Each lane displays its live transcript as it arrives.

[ Step 4: Fusion & Verification ]
Tokens agreeing across passes are highlighted.
Fields are voted upon and cross-checked with `trains.json`.

[ Step 5: Departure Board Presentation ]
Result card flips in with departure-board flap animations:
  - Train: 12658 [✓ verified] (3/3 passes)
  - Name: SBC MAS MAIL [✓ verified]
  - Platform: 4 [✓ verified]
  - Delay: 15 min [✓ verified]
  - Clarity Score: 100/100

[ Step 6: Clear Re-Speech ]
User taps "Hear it clearly". Gnani Timbre speaks only verified facts:
"Train 12658, SBC MAS MAIL, will arrive on platform 4. It is running 15 minutes late."
Caption is displayed simultaneously.

[ Step 7: Rate the Station ]
User taps "Rate this station's clarity". Clarity score is submitted to Cloudflare D1.
```

---

## 7. Noise Benchmark Results (Pre-Computed Grid)

To satisfy **Competition Scoring: Noise Canceller Track** without consuming live visitor credits, KaanKhol includes a pre-computed benchmark dataset (`apps/web/public/benchmark.json`) generated from synthetic announcements mixed with authentic CC0 Indian platform noise:

| Acoustic Condition | Single-Pass Prisma STT (Best) | KaanKhol Fused (3 Passes + Timetable) | Advantage Delta |
|---|---|---|---|
| **20 dB SNR** (Mild Noise) | 86.7% Fact Recovery | **96.7% Fact Recovery** | **+10.0%** |
| **10 dB SNR** (Moderate Rush) | 73.3% Fact Recovery | **90.0% Fact Recovery** | **+16.7%** |
| **5 dB SNR** (Heavy Reverb) | 56.7% Fact Recovery | **80.0% Fact Recovery** | **+23.3%** |
| **0 dB SNR** (Severe Distortion) | 36.7% Fact Recovery | **63.3% Fact Recovery** | **+26.6%** |
| **8 kHz Telephony** (Narrowband) | 46.7% Fact Recovery | **73.3% Fact Recovery** | **+26.6%** |

*Takeaway:* As ambient noise increases, the single-language error rate rises sharply. Cross-language fusion acts as an error-correcting code, recovering over **26% more actionable facts** under severe noise.

---

## 8. Crowdsourced Station Leaderboard (Cloudflare D1)

The station leaderboard maps announcement audio clarity across Indian railway junctions:
- **Database Engine:** Cloudflare D1 (Serverless SQLite) in APAC.
- **Privacy & Anti-Abuse:** Client IP is hashed with a daily-rotating salt (`SHA-256(IP + Date)`). Raw IP addresses are **never** stored.
- **Rate-Limiting:** 1 submission per station per hashed IP per day.
- **Rules Compliance:** In accordance with competition rules, seed rows are explicitly labelled `sample`. Real submissions update live averages instantaneously.

---

## 9. Local Development & Setup

### Prerequisites
- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)

### 1. Clone the repository
```bash
git clone https://github.com/git791/KaanKhol.git
cd KaanKhol
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Configure local environment variables
Copy `.env.example` to `apps/edge/.dev.vars`:
```bash
cp .env.example apps/edge/.dev.vars
```
Add your credentials in `apps/edge/.dev.vars`:
```env
GNANI_API_KEY_ID=your_gnani_key_id
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run tests
Execute the 52 Vitest unit tests in `@kaankhol/core`:
```bash
pnpm test
```

### 5. Start development servers
```bash
# Terminal 1: Edge Worker (Port 8787)
pnpm dev:edge

# Terminal 2: Web Frontend (Port 5173)
pnpm dev:web
```
Open **`http://localhost:5173`** in your browser.

---

## 10. Design & Accessibility Compliance

- **Night Platform Palette:** Deep signal blue (`#08141F`, `#0C1D2D`), signal-lamp amber (`#FFB62E`), verified green (`#3DDC97`), and conflict red (`#FF5C5C`). No white or black backgrounds.
- **Devanagari & Kannada Typography:** Minimum line-height of 1.65 to prevent matra clipping. Zero letter-spacing on Indic scripts.
- **Reduced Motion:** If `prefers-reduced-motion` is enabled, smooth scrolling is skipped, transforms are replaced by 150ms opacity fades, and canvas animations are replaced by static vector elements.
- **No Emojis:** Strictly compliant with competition rules. All icons are Phosphor SVG elements.

---

## 11. Attributions & Open Data

- **3D & Vector Assets:** Kenney Train Kit (CC0), cosmac Low Poly Speaker (CC0).
- **Icons:** Phosphor Icons (MIT License).
- **Fonts:** Clash Display and Satoshi (ITF Free Font Licence), Noto Sans Devanagari and Kannada (SIL Open Font License).
- **Railway Datasets:** Train schedules and station coordinates adapted from `datameet/railways` (CC0 1.0 Universal).
- **Audio Noise Corpus:** CC0 ambient clips from Freesound.org (documented in `bench/NOISE_SOURCES.md`).
- **Speech Intelligence:** Powered by **Gnani Prisma v2.5** (STT) and **Gnani Timbre v2.5** (TTS).

---

## 12. Team

- **Bibi Sufiya Shariff**
- **Mohammed Ayaan Adil Ahmed**

---

*License: MIT. Developed for the Gnani.ai Great Indian AI Internship Challenge, November 2026.*
