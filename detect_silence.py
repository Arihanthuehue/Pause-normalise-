import sys
import json
from pydub import AudioSegment
from pydub.silence import detect_silence

audio_path = sys.argv[1]

audio = AudioSegment.from_file(audio_path)

if audio.max_dBFS > -100:
    silence_thresh = audio.max_dBFS - 40
else:
    silence_thresh = -40

silence_ranges = detect_silence(audio, min_silence_len=50, silence_thresh=silence_thresh)
qualifying = [[s, e] for s, e in silence_ranges if (e - s) >= 150]

print(json.dumps(qualifying))
