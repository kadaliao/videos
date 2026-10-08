#!/usr/bin/env python3
"""成片：build/video.mp4（画面）+ build/music.wav（配乐与音效）→ 响度归一到 -16 LUFS → out/shanpoyang-waimai_1080p30.mp4
用法: python3 mix.py   （先跑 music.py 与 render.mjs）"""
import os, re, subprocess
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_LUFS = -16.0
def lufs(f):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1])
music = f"{ROOT}/build/music.wav"
gain = OUT_LUFS - lufs(music)
os.makedirs(f"{ROOT}/out", exist_ok=True)
out = f"{ROOT}/out/shanpoyang-waimai_1080p30.mp4"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{ROOT}/build/video.mp4", "-i", music,
                "-filter_complex", f"[1:a]volume={gain:.2f}dB,alimiter=limit=0.94:attack=3:release=80:level=false[a]",
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out], check=True)
print(out, "LUFS", lufs(out))
