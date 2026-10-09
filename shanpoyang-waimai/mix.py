#!/usr/bin/env python3
"""成片：画面 + 配乐（含音效）→ 响度归一 → out/
用法: python3 mix.py                       第一版：build/video.mp4 + build/music.wav → out/shanpoyang-waimai_1080p30.mp4（-16 LUFS）
      python3 mix.py v2                    第二版：build/video2.mp4 + build/music2.wav → out/shanpoyang-waimai_v2_1080p30.mp4（-14 LUFS）
      python3 mix.py v3                    第三版：build/video3.mp4 + build/music2.wav → out/shanpoyang-waimai_v3_1080p30.mp4（-14 LUFS）"""
import os, re, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
V2 = sys.argv[1:] == ["v2"]; V3 = sys.argv[1:] == ["v3"]
OUT_LUFS = -14.0 if (V2 or V3) else -16.0
def lufs(f):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1])
music = f"{ROOT}/build/music2.wav" if (V2 or V3) else f"{ROOT}/build/music.wav"
video = f"{ROOT}/build/video3.mp4" if V3 else f"{ROOT}/build/video2.mp4" if V2 else f"{ROOT}/build/video.mp4"
gain = OUT_LUFS - lufs(music)
os.makedirs(f"{ROOT}/out", exist_ok=True)
out = f"{ROOT}/out/shanpoyang-waimai_v3_1080p30.mp4" if V3 else f"{ROOT}/out/shanpoyang-waimai_v2_1080p30.mp4" if V2 else f"{ROOT}/out/shanpoyang-waimai_1080p30.mp4"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", music,
                "-filter_complex", f"[1:a]volume={gain:.2f}dB,alimiter=limit=0.94:attack=3:release=80:level=false[a]",
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out], check=True)
print(out, "LUFS", lufs(out))
