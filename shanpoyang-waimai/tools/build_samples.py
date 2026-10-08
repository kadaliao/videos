#!/usr/bin/env python3
"""把外部采样整理成 music.py 用的采样库 build/samples/<乐器>.npz（48 kHz float32 立体声，每条带实测音高）。
- 古筝：从 Freesound 一段 24 分钟的 CC0 古筝录音里自动切出单音（谱面检测起音 + HPS 测音高），每个音高挑余音最长的一条
- VSCO-2 CE（CC0）：大提琴 / 中提琴 / 小提琴组长音揉弦、低音提琴、竖琴、长笛、立式钢琴、定音鼓滚奏、锣、大鼓
音高一律从音频里实测，不信文件名。
用法: uv run --with numpy --with scipy python tools/build_samples.py   （先跑 tools/fetch_samples.sh）"""
import glob, os, re, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMP = os.environ.get("SAMPLES", os.path.expanduser("~/samples"))
OUT = f"{ROOT}/build/samples"; os.makedirs(OUT, exist_ok=True)
SR = 48000

def load(path, mono=False):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1" if mono else "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    return x if mono else x.reshape(-1, 2)

def f0_of(x, lo=40, hi=2000):
    """谐波积谱测基频，再用抛物线插值细化"""
    m = x.mean(1) if x.ndim == 2 else x
    n = len(m); w = m * np.hanning(n); L = 1 << int(np.ceil(np.log2(n * 8)))
    sp = np.abs(np.fft.rfft(w, L)); f = np.fft.rfftfreq(L, 1 / SR)
    hps = np.log(sp + 1e-9).copy()
    for h in (2, 3, 4): hps[:len(sp) // h] += np.log(sp[::h][:len(sp) // h] + 1e-9)
    band = (f > lo) & (f < hi); k = np.argmax(np.where(band, hps, -1e9))
    # 在原始谱上找最近的峰并插值
    k = k - 3 + np.argmax(sp[k - 3:k + 4])
    a, b, c = np.log(sp[k - 1:k + 2] + 1e-12); p = .5 * (a - c) / (a - 2 * b + c)
    return (k + p) * SR / L

def midi_of(f): return 69 + 12 * np.log2(f / 440)

def save(name, items):
    """items: [(audio(n,2), 实测midi, 力度层0..1, 标签)]"""
    np.savez(f"{OUT}/{name}.npz", **{f"a{i}": a.astype(np.float32) for i, (a, _, _, _) in enumerate(items)},
             midi=np.array([m for _, m, _, _ in items]), vel=np.array([v for _, _, v, _ in items]), tag=np.array([t for *_, t in items]))
    print(f"{name}: {len(items)} samples, midi {min(m for _, m, _, _ in items):.1f}–{max(m for _, m, _, _ in items):.1f}")

# ------------------------------------------------------------ 古筝
def build_zheng():
    x = load(f"{SAMP}/freesound/396868.mp3", mono=True)
    hop, win = 480, 2048; n = len(x) // hop
    X = np.lib.stride_tricks.sliding_window_view(np.pad(x, (win // 2, win // 2)), win)[::hop][:n]
    S = np.abs(np.fft.rfft(X * np.hanning(win), axis=1)); flux = np.r_[0, np.maximum(0, np.diff(np.log1p(S * 10), axis=0)).sum(1)]
    thr = np.median(flux) + 3 * np.std(flux)
    on = [i for i in range(1, n - 1) if flux[i] > thr and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]]
    ons = []
    for i in on:
        if not ons or i - ons[-1] > 8: ons.append(i)
    best = {}
    for j, i in enumerate(ons):
        nxt = ons[j + 1] if j + 1 < len(ons) else n
        gap = (nxt - i) * hop / SR; s = i * hop
        seg = x[s + int(.06 * SR): s + int(.5 * SR)]
        if len(seg) < 4000: continue
        f = f0_of(seg, 80, 1200); m = midi_of(f); r = round(m)
        if abs(m - r) > .35: continue
        pk = np.abs(x[s:s + int(.1 * SR)]).max()
        score = min(gap, 4.5) + (0 if pk > .05 else -3)
        if r not in best or score > best[r][0]: best[r] = (score, s, gap, m)
    items = []
    for r, (score, s, gap, m) in sorted(best.items()):
        if r not in (43, 45, 48, 50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74): continue
        L = int(min(gap - .015, 4.5) * SR); a = x[max(0, s - int(.008 * SR)): s + L].copy()
        a /= np.abs(a).max() + 1e-9
        fo = int(min(.25, L / SR / 3) * SR); a[-fo:] *= np.linspace(1, 0, fo) ** 2
        items.append((np.stack([a, a], 1), m, .7, f"zheng@{s / SR:.2f}s gap{gap:.2f}"))
    # 一段真实的古筝刮奏（上行）
    s0 = int(3.17 * SR); g = x[s0:s0 + int(4.0 * SR)].copy(); g /= np.abs(g).max()
    g[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR)) ** 2
    np.save(f"{OUT}/zheng_gliss.npy", np.stack([g, g], 1).astype(np.float32))
    save("zheng", items)

# ------------------------------------------------------------ VSCO-2 CE
V = f"{SAMP}/VSCO-2-CE"
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def name_midi(f, octave_shift):
    """文件名里的音名 → MIDI。VSCO 各乐器的八度记法不统一，octave_shift 由实测校准；钢琴用 MappingChart（文件号 N → 键号 21+2N）"""
    if octave_shift == "piano": return 21 + 2 * int(re.search(r"_(\d{3})\.wav", f).group(1))
    m = re.search(r"_([A-G])(#?)(-?\d)_", f)
    if not m: return None
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + (1 if m.group(2) else 0) + 12 * octave_shift

def build_dir(name, pattern, vel_of=lambda f: .5, lo=30, hi=2500, analyse=(.25, 1.0), norm=True, octave_shift=None):
    items = []
    for f in sorted(glob.glob(f"{V}/{pattern}")):
        a = load(f)
        s = int(analyse[0] * SR); e = int(analyse[1] * SR)
        m = midi_of(f0_of(a[s:e], lo, hi))
        nm = name_midi(os.path.basename(f), octave_shift) if octave_shift is not None else None
        if nm is not None:   # 实测只用来微调音准（去掉八度误判）
            fine = ((m - nm + 6) % 12) - 6
            m = nm + (fine if abs(fine) < .5 else 0)
        if norm: a = a / (np.abs(a).max() + 1e-9)
        items.append((a, m, vel_of(os.path.basename(f)), os.path.basename(f)))
    save(name, items)

def vtag(f, layers):
    for k, v in layers.items():
        if k in f: return v
    return .5

if __name__ == "__main__":
    build_zheng()
    build_dir("cello", "Strings/Cello Section/susvib/*.wav", lambda f: vtag(f, {"_v1": .35, "_v3": .8}), 50, 900, octave_shift=1)
    build_dir("viola", "Strings/Viola Section/susvib/*.wav", lambda f: vtag(f, {"_v1": .35, "_v2": .6, "_v3": .8}), 100, 1400, octave_shift=1)
    build_dir("violin", "Strings/Violin Section/susVib/*.wav", lambda f: vtag(f, {"_v1": .35, "_v2": .8}), 150, 2500, octave_shift=1)
    build_dir("bass", "Strings/Solo Contrabass/SusVib/*_rr1.wav", lambda f: vtag(f, {"_v1": .4, "_v2": .7}), 30, 400, octave_shift=1)
    build_dir("harp", "Strings/Harp/*.wav", lambda f: .6, 40, 2500, (.03, .5), octave_shift=0)
    build_dir("flute", "Woodwinds/Flute/susvib/*.wav", lambda f: .5, 150, 2000, octave_shift=1)
    build_dir("flute_exp", "Woodwinds/Flute/expvib/*.wav", lambda f: .6, 150, 2000, (.6, 2.0), octave_shift=1)
    build_dir("piano", "Keys/Upright Piano/Player_dyn[12]_rr1_*.wav", lambda f: vtag(f, {"dyn1": .3, "dyn2": .6}), 25, 4200, (.03, .5), norm=False, octave_shift="piano")
    build_dir("timp_roll", "Percussion/Timpani/Rolls/*.wav", lambda f: .7, 40, 300, (1.0, 3.0))
    build_dir("gong", "VSCO 1 Percussion/varMetal/Gong/gong_hit_m*.wav", lambda f: .5, 30, 1000, (.5, 2.0))
    build_dir("bdrum", "VSCO 1 Percussion/drums/bass/*.wav", lambda f: .5, 30, 300, (.01, .3))
