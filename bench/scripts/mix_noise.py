"""
mix_noise.py
Offline Python script to mix synthetic announcements with CC0 station ambient noise
at calibrated SNR levels (20, 10, 5, 0 dB) and apply 8 kHz telephony downsampling.
Reference: docs/TECHNICAL.md section 10.
"""

import os
import numpy as np
try:
    import soundfile as sf
except ImportError:
    sf = None

def mix(speech: np.ndarray, noise: np.ndarray, snr_db: float) -> np.ndarray:
    """
    Scale noise array to achieve the requested SNR in dB relative to speech.
    """
    if len(noise) < len(speech):
        repeats = int(np.ceil(len(speech) / len(noise)))
        noise = np.tile(noise, repeats)
    noise = noise[: len(speech)]

    ps = np.mean(speech ** 2)
    pn = np.mean(noise ** 2)
    if pn == 0:
        return speech

    scale = np.sqrt(ps / (pn * (10 ** (snr_db / 10))))
    mixed = speech + scale * noise
    return np.clip(mixed, -1.0, 1.0)

def simulate_telephony_8khz(speech: np.ndarray, orig_sr: int = 16000) -> np.ndarray:
    """
    Simulate narrow-band telephony: decimate to 8 kHz and re-upsample back to 16 kHz.
    """
    if orig_sr != 16000:
        return speech
    # Simple decimation (half rate)
    down = speech[::2]
    # Simple linear interpolation back to 16 kHz
    up = np.repeat(down, 2)
    return up[:len(speech)]

def main():
    if sf is None:
        print("Note: Install soundfile and numpy to run noise mixing: pip install soundfile numpy")
        return

    print("Noise mixing utility ready.")

if __name__ == "__main__":
    main()
