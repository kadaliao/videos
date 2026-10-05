#!/usr/bin/env python3
"""合成音效轨（按 build/sfx.json 事件程序化生成）+ 配乐（Mixkit，循环、避让人声）+ 旁白 → 成片。
用法: uv run --with numpy python mix.py   （先跑 voice.py 与 render.mjs）"""
import json, os, re, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 48000
BGM = f"{ROOT}/audio/bgm/mixkit-568-focus-on-yourself.mp3"   # Mixkit Stock Music Free License：可商用，但不可单独再分发，所以不入库，缺了就从官方地址下载
if not os.path.exists(BGM):
    os.makedirs(os.path.dirname(BGM), exist_ok=True)
    subprocess.run(["curl", "-fsSL", "-o", BGM, "https://assets.mixkit.co/music/568/568.mp3"], check=True)
BGM_START, BGM_LUFS, OUT_LUFS = 4.0, -27.0, -16.0
TL = json.load(open(f"{ROOT}/build/timeline.json")); L = TL["total"]
rng = np.random.default_rng(7)

def env(n, a, d):  # 线性起音 + 指数衰减
    t = np.arange(n) / SR; e = np.exp(-t / d); k = int(a * SR); e[:k] *= np.linspace(0, 1, k) if k else 1; return e
def noise(n): return rng.standard_normal(n)
def bp(x, lo, hi):  # FFT 带通
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def sweep(f0, f1, dur):
    t = np.arange(int(dur * SR)) / SR; f = f0 * (f1 / f0) ** (t / dur); return np.sin(2 * np.pi * np.cumsum(f) / SR)

def sfx(name):
    if name == "whoosh":
        n = int(.45 * SR); x = bp(noise(n), 300, 5000); e = np.sin(np.linspace(0, np.pi, n)) ** 2; return x * e * .22
    if name == "swish":
        n = int(.6 * SR); x = bp(noise(n), 800, 9000); e = np.sin(np.linspace(0, np.pi, n)) ** 3; return (x * e * .2 + sweep(400, 1600, .6) * e * .05)
    if name == "pop":
        n = int(.18 * SR); return sweep(900, 500, .18) * env(n, .002, .04) * .3
    if name == "tick":
        n = int(.08 * SR); return np.sin(2 * np.pi * 2200 * np.arange(n) / SR) * env(n, .001, .015) * .22
    if name == "hit":
        n = int(.9 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 55 * t) * env(n, .002, .25) * .55 + bp(noise(n), 2000, 8000) * env(n, .001, .05) * .12)
    if name == "down":
        n = int(.7 * SR); return sweep(700, 120, .7) * env(n, .005, .3) * .22
    if name == "rise":
        n = int(1.0 * SR); e = np.linspace(0, 1, n) ** 2 * np.exp(-np.maximum(0, np.arange(n) / SR - .9) / .05)
        return (sweep(200, 1200, 1.0) * .08 + bp(noise(n), 1500, 8000) * .08) * e
    if name == "zap":   # 一束光打开：明亮上扫 + 高频沙沙
        n = int(.35 * SR); e = env(n, .004, .12)
        return (sweep(900, 2600, .35) * .09 + bp(noise(n), 3000, 10000) * .1) * e
    raise KeyError(name)

ev = json.load(open(f"{ROOT}/build/sfx.json"))
tr = np.zeros(int((L + 2) * SR))
for e in ev:
    s = sfx(e["n"]); i = int(max(0, e["t"] - (0.25 if e["n"] in ("whoosh", "swish", "rise") else 0)) * SR)
    tr[i:i + len(s)] += s[:len(tr) - i]
tr = np.clip(tr, -1, 1)
with wave.open(f"{ROOT}/build/sfx.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((tr * 32767 * .9).astype("<i2").tobytes())

def lufs(f, af=""):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", (af + "," if af else "") + "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1])

g = BGM_LUFS - lufs(BGM)
fc = (f"[1:a]aresample={SR},aformat=channel_layouts=mono,asplit=2[vo][key];"
      f"[2:a]aresample={SR}[fx];"
      f"[3:a]atrim=start={BGM_START},asetpts=PTS-STARTPTS,aresample={SR},aformat=channel_layouts=stereo,volume={g:.2f}dB,"
      f"atrim=0:{L},afade=t=in:d=0.5,afade=t=out:st={L - 3}:d=3[bg0];"
      f"[bg0][key]sidechaincompress=threshold=0.05:ratio=3:attack=40:release=500[bg];"
      f"[vo][fx]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo[vf];"
      f"[vf][bg]amix=inputs=2:duration=longest:normalize=0,atrim=0:{L}[mx]")
tmp = f"{ROOT}/build/mix_pre.wav"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc", "-i", f"{ROOT}/audio/vo.wav", "-i", f"{ROOT}/build/sfx.wav", "-i", BGM,
                "-filter_complex", fc, "-map", "[mx]", "-ar", str(SR), tmp], check=True)
gain = OUT_LUFS - lufs(tmp)
out = f"{ROOT}/out/nobel-2026-optogenetics.mp4"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{ROOT}/build/video.mp4", "-i", tmp, "-filter_complex", f"[1:a]volume={gain:.2f}dB,alimiter=limit=0.93:level=false[a]",
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], check=True)
print(out, "LUFS", lufs(out))
