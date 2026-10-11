#!/usr/bin/env python3
"""成片：build/video.mp4 + build/music.wav → 响度归一（-14 LUFS）→ out/opus-25-styles_1080p30.mp4"""
import os, re, subprocess
ROOT = os.path.dirname(os.path.abspath(__file__))
def lufs(f):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1])
music, video = f"{ROOT}/build/music.wav", f"{ROOT}/build/video.mp4"
gain = -14.0 - lufs(music)
os.makedirs(f"{ROOT}/out", exist_ok=True); out = f"{ROOT}/out/opus-25-styles_1080p30.mp4"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", music,
                "-filter_complex", f"[1:a]volume={gain:.2f}dB,alimiter=limit=0.89:attack=3:release=80:level=false[a]",
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out], check=True)
print(out, "LUFS", lufs(out))
