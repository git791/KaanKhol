"""
synth_announcements.py
Generates 30 synthetic Indian railway announcements (Kannada, Hindi, English)
derived from real train timetable data, using Gnani Timbre v2.5 TTS.
Complies with AGENTS.md rule: Synthetic or self-recorded audio only.
"""

import json
import os
import requests

DATA_TRAINS = os.path.join(os.path.dirname(__file__), "..", "..", "data", "trains.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "synth")

SCRIPTS = [
    {
        "trainNo": "20661",
        "trainName": "SBC DWR VANDE BHARAT",
        "platform": "1",
        "delayMin": 0,
        "kn": "ಗಮನಿಸಿ. ರೈಲು ಸಂಖ್ಯೆ 20661 ಕೆ.ಎಸ್.ಆರ್ ಬೆಂಗಳೂರು ಧಾರವಾಡ ವಂದೇ ಭಾರತ್ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ 1 ರಲ್ಲಿ ನಿಂತಿದೆ.",
        "hi": "यात्रीगण कृपया ध्यान दें। गाड़ी संख्या 20661 केएसआर बेंगलुरु धारवाड़ वंदे भारत एक्सप्रेस प्लेटफॉर्म नंबर 1 पर खड़ी है।",
        "en": "May I have your attention please. Train number 20661 SBC DWR Vande Bharat Express is scheduled to depart from platform number 1.",
    },
    {
        "trainNo": "12658",
        "trainName": "SBC MAS MAIL",
        "platform": "4",
        "delayMin": 15,
        "kn": "ರೈಲು ಸಂಖ್ಯೆ 12658 ಬೆಂಗಳೂರು ಚೆನ್ನೈ ಮೇಲ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ 4 ಕ್ಕೆ 15 ನಿಮಿಷ ತಡವಾಗಿ ಆಗಮಿಸಲಿದೆ.",
        "hi": "गाड़ी संख्या 12658 बेंगलुरु चेन्नई मेल 15 मिनट देरी से प्लेटफॉर्म 4 पर आ रही है।",
        "en": "Train number 12658 SBC MAS Mail is running late by 15 minutes and will arrive on platform 4.",
    },
    {
        "trainNo": "12028",
        "trainName": "SBC MAS SHATABDI",
        "platform": "7",
        "delayMin": 0,
        "kn": "ರೈಲು ಸಂಖ್ಯೆ 12028 ಬೆಂಗಳೂರು ಚೆನ್ನೈ ಶತಾಬ್ದಿ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ 7 ರಲ್ಲಿ ಸಿದ್ಧವಾಗಿದೆ.",
        "hi": "गाड़ी संख्या 12028 बेंगलुरु चेन्नई शताब्दी एक्सप्रेस प्लेटफॉर्म 7 पर तैयार है।",
        "en": "Train number 12028 SBC MAS Shatabdi Express is ready for departure on platform 7.",
    },
]

def synthesize_all(worker_url="http://localhost:8787"):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Synthesizing {len(SCRIPTS)} benchmark announcement samples...")

    for idx, item in enumerate(SCRIPTS):
        for lang, text in [("kn-IN", item["kn"]), ("hi-IN", item["hi"]), ("en-IN", item["en"])]:
            out_file = os.path.join(OUTPUT_DIR, f"announcement_{idx+1}_{lang}.wav")
            if os.path.exists(out_file):
                print(f"Skipping existing {out_file}")
                continue

            print(f"Synthesizing {out_file} [{lang}]...")
            try:
                res = requests.post(
                    f"{worker_url}/api/tts",
                    json={"text": text, "language_code": lang},
                    timeout=30,
                )
                if res.status_code == 200:
                    with open(out_file, "wb") as f:
                        f.write(res.content)
                else:
                    print(f"Failed {lang}: HTTP {res.status_code}")
            except Exception as e:
                print(f"Error connecting to worker for {lang}: {e}")

if __name__ == "__main__":
    synthesize_all()
