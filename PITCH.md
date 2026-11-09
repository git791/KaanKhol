# KaanKhol (कान खोल / ಕಿವಿ ತೆರೆಯಿರಿ)
## 1-Page Solution Pitch · Gnani.ai Great Indian AI Internship Challenge

---

### Executive Summary
During festival rush across Indian railway junctions, reverberant public address systems, crowd murmur, and diesel horns drown out critical train and platform announcements. Platform PA systems repeat every announcement three times: in the **Regional Language**, **Hindi**, and **Indian English**. 

Instead of treating these three audio passes as isolated events, **KaanKhol** frames them as an **Acoustic Error-Correcting Code**. By transcribing all three passes across distinct language models, performing cross-lingual majority voting on the extracted fields, and verifying against national timetable ground truth, KaanKhol eliminates speech hallucinations and re-synthesizes clear, verified announcements.

---

### The Problem
* **Acoustic Burst Corruption:** Reverberation and ambient platform noise drop syllables and garble train numbers or platform digits in single-pass speech recognition.
* **Passenger Anxiety:** Conflicting, unverified, or inaudible updates cause platform misdirection during peak rush hours (e.g., Diwali).

---

### Our Solution & Pipeline

```
[ Ambient Platform Audio ]
            |
            v
  Parallel Multilingual STT (Gnani Prisma v2.5: Regional + Hindi + English)
            |
            v
  Cross-Language Field Extraction & Triple Modular Redundancy Voting
            |
            v
  Ground-Truth Verification against National Timetable Database (D1 / SQLite)
            |
            v
  Canonical Re-Speech of Verified Facts Only (Gnani Timbre v2.5 TTS)
```

1. **Multilingual Ingestion:** Audio is processed across parallel language lanes (supporting Kannada, Tamil, Telugu, Marathi, Bengali, Gujarati, Malayalam, Punjabi, plus Hindi and English).
2. **Triple Modular Redundancy (TMR):** If platform noise corrupts the Hindi pass, agreement between the Regional and English passes recovers the correct train number, destination, and platform.
3. **Zero-Hallucination Verification:** Extracted train numbers are cross-referenced with official railway schedules. Discrepancies are flagged as unverified; hallucinations are discarded.
4. **Clean Re-Speech:** Only verified facts are synthesized into crisp audio using Gnani Timbre v2.5.

---

### Key Technical Achievements
* **Zero Storage Architecture:** Audio is streamed and processed entirely in memory; passenger audio is never persisted.
* **Edge-Native Deployment:** Deployed on Cloudflare Pages and Workers with low-latency regional routing.
* **Pan-Indian Coverage:** Live interactive language picker supporting 8 Indic regional languages.

---

### Submission & Verification Links
* **Live Web Application:** https://kaankhol.pages.dev
* **Source Code Repository:** https://github.com/git791/KaanKhol
* **Demo Video (YouTube):** https://youtu.be/8HzT9NzcSi8
* **Challenge Track:** Primary: **Jugaad Genius** · Supporting: **Real Deal**

**Team:** Bibi Sufiya Shariff & Mohammed Ayaan Adil Ahmed
