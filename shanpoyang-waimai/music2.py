#!/usr/bin/env python3
"""第二版配乐：国风电子，100 BPM，D 羽调式。按 edit.json 的剪辑表逐小节对齐镜头。
真实采样：古筝（Freesound CC0 录音切片）、VSCO-2 CE 的跳弓弦乐 / 长音弦乐 / 长笛 / 低音提琴；
电子部分（底鼓、拍手、镲、808 低音、超级锯齿铺底、上升音效、冲击）为合成。
  前奏：古筝刮奏 + 上升音效 → 第 1 小节鼓点进入
  A 段（白天到黎明、雨雪）：古筝十六分音符 riff 是主钩子，低音、铺底跟着走
  集结（超市）→ 第一次 drop（楼、烧烤）：跳弓弦乐 + 长笛和小提琴齐奏主旋律
  月亮：旋律到最高点；骑手坐下：军鼓滚奏渐强……“停”——全曲断掉，只剩一声古筝下滑音
  “活”：第二次 drop，主钩子重来；片尾手卷：鼓退出，古筝独自弹着淡出，最后“叮咚”
用法: uv run --with numpy --with scipy python music2.py → build/music2.wav"""
import json, os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.abspath(__file__))
SAMP = os.environ.get("SAMPLES", os.path.expanduser("~/samples"))
ED = json.load(open(f"{ROOT}/edit.json"))
SR = 48000
BEAT = 60 / ED["bpm"]; BAR = BEAT * 4
# 剪辑表 → 每个镜头的起止小节
bar = ED["titleBars"]; CUE = {}
for s in ED["shots"]:
    name = s.get("clip") or ("stop" if s.get("stop") else "scroll")
    CUE[name] = (bar, bar + s["bars"]); bar += s["bars"]
TOTAL_BARS = bar; DUR = TOTAL_BARS * BAR
STOP, RESUME = CUE["stop"]; SCROLL = CUE["scroll"][0]
N = int(SR * (DUR + 2))
rng = np.random.default_rng(100)

def B(b, beat=0.0): return b * BAR + beat * BEAT
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def sos(kind, f, order=2):
    ny = SR / 2
    if kind == "band": return butter(order, [max(20, f[0]) / ny, min(f[1], ny - 200) / ny], "bandpass", output="sos")
    return butter(order, min(max(f, 20), ny - 200) / ny, kind, output="sos")
def lp(x, f, o=2): return sosfilt(sos("low", f, o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos("high", f, o), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(sos("band", (lo, hi), o), x, axis=0)
def noise(n): return rng.standard_normal(n)
def T(d): return np.arange(int(d * SR)) / SR
def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

BUS_NAMES = ["kick", "drums", "bass", "pad", "zheng", "spic", "lead", "str", "fx", "amb", "sigh"]
BUS = {k: np.zeros((N, 2)) for k in BUS_NAMES}
GAIN = {"kick": .5, "drums": 1.0, "bass": .36, "pad": .3, "zheng": .78, "spic": .6, "lead": .6, "str": .24, "fx": .5, "amb": 1.3, "sigh": .9}
SEND = {"kick": .0, "drums": .10, "bass": .0, "pad": .25, "zheng": .18, "spic": .15, "lead": .28, "str": .32, "fx": .30, "amb": 0, "sigh": .45}  # “叹息”单独走混响，不受门限影响
DUCK = {"bass", "pad", "str", "spic", "zheng"}   # 跟着底鼓“呼吸”的声部

def add(bus, t, sig, g=1.0, pan=0.0):
    if sig.ndim == 1: sig = np.stack([sig, sig], 1)
    if pan: a = (pan + 1) * np.pi / 4; sig = sig * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)
    i = int(round(t * SR)); sig = sig * g
    if i < 0: sig = sig[-i:]; i = 0
    j = min(N, i + len(sig))
    if j > i: BUS[bus][i:j] += sig[:j - i]

# ------------------------------------------------------------------ 采样器（与第一版相同）
class Bank:
    def __init__(self, name, norm=False):
        d = np.load(f"{ROOT}/build/samples/{name}.npz")
        self.s = [(d[f"a{i}"].astype(np.float64), float(d["midi"][i]), float(d["vel"][i])) for i in range(len(d["midi"]))]
        self.s = [x for x in self.s if len(x[0]) > .25 * SR] or self.s
        if norm: self.s = [(a / (np.abs(a).max() + 1e-9), m, v) for a, m, v in self.s]
    def pick(self, m, vel):
        dist = [abs(mm - m) for _, mm, _ in self.s]; best = min(dist)
        cand = [k for k, dd in enumerate(dist) if dd <= best + .6]
        return self.s[min(cand, key=lambda k: abs(self.s[k][2] - vel) + rng.uniform(0, .05))]
def play(bank, m, vel=.6, dur=None, release=.3, curve=None, offset=0.0, attack=0.0, bright=None):
    a, root, _ = bank.pick(m, vel)
    if dur is None: dur = (len(a) / SR - offset) / 2 ** ((m - root) / 12) - release
    n = int((dur + release) * SR); t = np.arange(n) / SR
    semis = (m - root) + (np.interp(t, *zip(*curve)) if curve else 0)
    pos = offset * SR + np.cumsum(2 ** (semis / 12) * np.ones(n)) - 1
    ok = pos < len(a) - 2; pos = np.where(ok, pos, len(a) - 2)
    i = pos.astype(int); fr = (pos - i)[:, None]
    out = (a[i] * (1 - fr) + a[i + 1] * fr) * ok[:, None]
    e = np.clip((dur + release - t) / max(release, 1e-3), 0, 1) ** 1.5
    if attack > 0: e *= np.clip(t / attack, 0, 1)
    elif offset > 0: e *= np.clip(t / .02, 0, 1)
    out *= e[:, None]
    if bright is not None: out = lp(out, bright)
    return out * vel

ZHENG, FLUTE, FLUTE_X = Bank("zheng"), Bank("flute"), Bank("flute_exp")
VIOLIN, VIOLA, CELLO, BASSV = Bank("violin"), Bank("viola"), Bank("cello"), Bank("bass")
VSPIC, CSPIC = Bank("vln_spic", norm=True), Bank("cel_spic", norm=True)
GLISS = np.load(f"{ROOT}/build/samples/zheng_gliss.npy").astype(np.float64)
def zheng(m, vel, ring=.9, curve=None, release=.25): return play(ZHENG, m, vel, dur=ring, release=release, curve=curve, bright=2500 + 8000 * vel)

# ------------------------------------------------------------------ 合成：鼓、低音、铺底、上升、冲击
def kick(v=1.0):
    t = T(.55); f = 46 + 120 * np.exp(-t / .028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .3)
    click = hp(noise(len(t)), 2500) * np.exp(-t / .004) * .45 + np.sin(2 * np.pi * 1800 * t) * np.exp(-t / .002) * .3
    return np.tanh(1.6 * (body + click)) * v
def clap(v=1.0):
    t = T(.35); out = np.zeros(len(t))
    for d in (0, .009, .018, .028):
        k = int(d * SR); m = len(t) - k
        out[k:] += bp(noise(m), 900, 3500) * np.exp(-np.arange(m) / SR / (.006 if d < .028 else .11))
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / .07) * .35
    snap = hp(noise(len(t)), 5000) * np.exp(-t / .003) * .5
    return (out * .6 + tone + snap) * v
def hat(v=1.0, open_=False):
    t = T(.4 if open_ else .08)
    x = hp(noise(len(t)), 7500, 4) + hp(np.sign(np.sin(2 * np.pi * 5400 * t) + np.sin(2 * np.pi * 7900 * t)), 7000) * .2
    return x * np.exp(-t / (.16 if open_ else .022)) * v * .5
def tom(v=1.0, f0=110):
    t = T(.5); f = f0 * (1 + .6 * np.exp(-t / .03))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .22) * v
def impact(v=1.0):
    t = T(2.4); f = 32 + 45 * np.exp(-t / .12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .9)
    crack = lp(noise(len(t)), 1800) * np.exp(-t / .25) * .5
    return np.tanh(1.3 * (boom + crack)) * v
def riser(d, v=1.0):
    t = T(d); k = t / d
    sweep = bp(noise(len(t)), 300, 9000) * 0
    out = np.zeros(len(t)); blk = 2048; zi = np.zeros((2, 2)); nz = noise(len(t))
    for i in range(0, len(t), blk):   # 噪声带通扫频，越来越亮
        c = 300 * (40 ** (i / len(t))); s = sos("band", (c * .7, c * 1.5), 2)
        y, zi = sosfilt(s, nz[i:i + blk], zi=zi); out[i:i + blk] = y
    tone = np.sin(2 * np.pi * np.cumsum(200 * 4 ** k) / SR) * .15
    return (out * 1.6 + tone) * k ** 2.2 * v
def reverse_cymbal(d, v=1.0):
    t = T(d); x = hp(noise(len(t)), 4000) * (t / d) ** 3
    return x * v * .6
def saw(f, t):
    p = (np.cumsum(np.broadcast_to(f, t.shape)) / SR) % 1; dt = np.broadcast_to(f, t.shape) / SR
    y = 2 * p - 1; m1 = p < dt; x = p[m1] / dt[m1]; y[m1] -= x + x - x * x - 1
    m2 = p > 1 - dt; x = (p[m2] - 1) / dt[m2]; y[m2] -= x * x + x + x + 1
    return y
def supersaw(midis, d, v=1.0, cutoff=2500, attack=.05, release=.4):
    t = T(d + release); L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in midis:
        for k in range(7):
            det = (k - 3) / 3 * 14 / 1200; f = mtof(m) * 2 ** det
            y = saw(f, t); a = (k / 6) * np.pi / 2
            L += y * np.cos(a); R += y * np.sin(a)
    x = np.stack([L, R], 1) / (7 * len(midis)) * 2
    x = hp(lp(x, cutoff, 2), 320, 2)
    e = np.clip(t / attack, 0, 1) * np.clip((d + release - t) / release, 0, 1)
    return x * e[:, None] * v
def sub(m, d, v=1.0):
    t = T(d + .05); f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)
    e = np.clip(t / .008, 0, 1) * np.clip((d + .05 - t) / .05, 0, 1)
    return np.tanh(1.4 * x) * e * v * .7

# ================================================================== 乐谱
CH = {  # 低音、铺底和声、古筝 riff（16 个十六分音符，只用定弦里的音）、跳弓（8 个八分音符：大提琴, 小提琴）
    "Dm": (38, [50, 57, 62, 65, 69], [62, 65, 67, 69, 74, 69, 67, 65, 62, 65, 69, 72, 74, 72, 69, 65], [38, 38, 50, 38, 38, 50, 38, 45], [69, 74, 72, 74, 77, 74, 72, 69]),
    "Bb": (34, [46, 53, 58, 62, 65], [55, 62, 65, 67, 72, 67, 65, 62, 55, 62, 67, 69, 72, 69, 67, 62], [34, 34, 46, 34, 34, 46, 34, 41], [65, 70, 69, 70, 74, 70, 69, 65]),
    "F":  (41, [45, 53, 57, 60, 65], [53, 60, 65, 69, 72, 69, 65, 60, 53, 60, 65, 67, 69, 67, 65, 60], [41, 41, 53, 41, 41, 53, 41, 48], [65, 69, 72, 69, 77, 72, 69, 65]),
    "C":  (36, [48, 55, 60, 64, 67], [48, 55, 60, 62, 67, 62, 60, 55, 48, 55, 62, 67, 72, 67, 62, 55], [36, 36, 48, 36, 36, 48, 36, 43], [67, 72, 74, 72, 76, 72, 74, 67]),
}
PROG = ["Dm", "Bb", "F", "C"]
def chord(b): return PROG[int(np.floor(b)) % 4]
a1 = CUE["c01"][0]; rain0 = CUE["c03"][0]; build0 = CUE["c05"][0]; drop1 = CUE["c06"][0]; moon0 = CUE["c08"][0]; sit0 = CUE["c09"][0]

# 各段落的配器开关（小节区间）
SEC = {
    "intro": (0, a1), "A1": (a1, rain0), "A2": (rain0, build0), "build": (build0, drop1),
    "drop1": (drop1, moon0), "moon": (moon0, sit0), "rise": (sit0, STOP), "drop2": (RESUME, SCROLL), "outro": (SCROLL, TOTAL_BARS),
}
def in_(b, *names): return any(SEC[n][0] <= b < SEC[n][1] for n in names)
def secv(b):   # 段落力度：A 段收着，drop 放开
    if in_(b, "A1"): return .62
    if in_(b, "A2"): return .8
    if in_(b, "build"): return .75 + .25 * (b - build0) / (drop1 - build0)
    if in_(b, "rise"): return .85 + .15 * (b - sit0) / (STOP - sit0)
    return 1.0

# ---- 前奏：古筝刮奏 + 反向镲 + 上升，冲击落在第一镜
add("zheng", B(0, .3), GLISS[:int(2.1 * SR)], g=.5, pan=-.1)
add("fx", B(0, 1), reverse_cymbal(BAR * .75), g=.8)
add("fx", B(0, 1), riser(BAR * .75), g=.35)
add("pad", 0, supersaw(CH["Dm"][1], BAR, .5, cutoff=900, attack=1.2, release=.2))
for b0 in (a1, drop1, RESUME):
    add("fx", B(b0), impact(.9 if b0 != a1 else .7))

# ---- 鼓
def beats_in(b0, b1, step):
    x = b0 * 4
    while x < b1 * 4 - 1e-9: yield x / 4; x += step
for b in np.arange(0, TOTAL_BARS, .25):
    beat = round((b % 1) * 4, 3); bb = int(np.floor(b))
    if in_(b, "A1", "A2", "drop1", "moon", "drop2"):
        full = in_(b, "drop1", "moon", "drop2")
        if beat in (0, 2) or (full and beat == 2.5 and bb % 2 == 1) or (in_(b, "A2") and beat == 2.5 and bb % 2 == 1):
            add("kick", B(b), kick((1.0 if beat == 0 else .9) * secv(b)))
        if beat in (1, 3): add("drums", B(b), clap(.9 if full else .75), pan=.05)
    if in_(b, "build", "rise"):   # 集结：四拍底鼓
        add("kick", B(b), kick(.85 * secv(b)))
# 镲：八分音符，drop 里十六分，反拍开镲
for x in beats_in(a1, STOP, .5):
    if in_(x, "build"): continue
    full = in_(x, "drop1", "moon")
    add("drums", B(x) + rng.normal(0, .003), hat((.55 if (x * 2) % 2 else .4) * rng.uniform(.8, 1.05)), pan=.25)
    if full and (x * 4) % 2 == 1: add("drums", B(x), hat(.45, True), pan=-.2)
    if (full or in_(x, "A2")) : add("drums", B(x) + BEAT / 4, hat(.25), pan=.3)
for x in beats_in(RESUME, SCROLL, .5):
    add("drums", B(x), hat(.5), pan=.25); add("drums", B(x) + BEAT / 4, hat(.25), pan=.3)
    if (x * 4) % 2 == 1: add("drums", B(x), hat(.45, True), pan=-.2)
for x in beats_in(SCROLL, SCROLL + 2, 1): add("drums", B(x) + BEAT / 2, hat(.25), pan=.25)   # 片尾只剩轻轻的镲
# 军鼓滚奏：集结段 8 分 → 16 分；坐下那两小节从 8 分一路滚到 32 分，渐强，撞上“停”
def roll(b0, b1, v0, v1, steps):
    n = 0; x = b0
    while x < b1 - 1e-6:
        k = (x - b0) / (b1 - b0); step = steps[min(len(steps) - 1, int(k * len(steps)))]
        add("drums", B(x) + rng.normal(0, .004), clap((v0 + (v1 - v0) * k ** 1.5) * rng.uniform(.8, 1.0) * (1.15 if (x * 4) % 1 < 1e-6 else 1)) * .8, pan=.05); x += step / 4
roll(build0, drop1, .25, .9, [2, 1, .5])
roll(sit0, STOP, .15, 1.0, [2, 1, .5, .25])
for k, x in enumerate(np.arange(STOP - .5, STOP, .125)): add("drums", B(x), tom(.5 + .06 * k, 130 - 8 * k), pan=-.3 + .1 * k)
add("fx", B(build0), riser(BAR * (drop1 - build0)), g=.45)
add("fx", B(sit0), riser(BAR * (STOP - sit0)), g=.55)
add("fx", B(drop1) - BAR * .5, reverse_cymbal(BAR * .5), g=.9)
add("fx", B(RESUME) - BAR * .25, reverse_cymbal(BAR * .25), g=.5)

# ---- 808 低音 + 铺底
for bb in range(int(a1), int(np.ceil(SCROLL + 2))):
    if STOP <= bb < RESUME: continue
    root, voic, *_ = CH[chord(bb)]
    if in_(bb, "A1", "A2", "drop1", "moon", "drop2"):
        for beat in (0, 1.5, 2, 3.5) if in_(bb, "drop1", "moon", "drop2") else (0, 2, 3.5):
            add("bass", B(bb, beat), sub(root + 12 if root < 40 else root, BEAT * (1.4 if beat in (0, 2) else .45), .9 * secv(bb)))
    elif in_(bb, "build", "rise"):
        for beat in range(4): add("bass", B(bb, beat), sub(root + 12 if root < 40 else root, BEAT * .45, .8))
    cut = {"A1": 1300, "A2": 1800, "build": 1200 + 1500 * (bb - build0), "drop1": 3200, "moon": 4200, "rise": 2000 + 1500 * (bb - sit0), "drop2": 3500, "outro": 900, "intro": 900}
    sec = next((n for n in SEC if SEC[n][0] <= bb < SEC[n][1]), "outro")
    v = {"outro": .35, "moon": .7}.get(sec, .55)
    if sec == "outro" and bb >= SCROLL + 2: continue
    add("pad", B(bb), supersaw(voic, BAR, v, cutoff=cut[sec], attack=.03, release=.25))

# ---- 古筝 riff：A 段八分音符，A2 起十六分音符；drop 里与旋律交错；片尾独自淡出
for bb in np.arange(a1, TOTAL_BARS - .5, 1):
    if STOP <= bb < RESUME: continue
    rf = CH[chord(bb)][2]
    dense = in_(bb, "A2", "drop1", "drop2", "rise") or (in_(bb, "moon"))
    for i, m in enumerate(rf):
        if not dense and i % 2: continue
        if in_(bb, "drop1", "moon") and i < 8 and i % 2: continue      # 给旋律让出空间
        if in_(bb, "build") and i % 4: continue
        v = (.75 if i % 4 == 0 else .55 if i % 2 == 0 else .42) * rng.uniform(.88, 1.05)
        if in_(bb, "outro"): v *= max(.15, 1 - (bb - SCROLL) / 3.2)
        if in_(bb, "drop1", "moon", "drop2"): v *= 1.2
        add("zheng", B(bb, i / 4) + rng.normal(0, .004), zheng(m, v, ring=.55 if dense else .9), pan=-.2 + .4 * ((i * 3) % 5) / 4)
for b0 in (rain0, drop1, moon0, RESUME): add("zheng", B(b0) - .9, GLISS[:int(1.0 * SR)], g=.35, pan=.15)

# ---- 跳弓弦乐（真实采样）：A2 起大提琴八分音符，drop 里小提琴加入
for bb in np.arange(rain0, SCROLL, 1):
    if STOP <= bb < RESUME: continue
    _, _, _, cel, vln = CH[chord(bb)]
    for i in range(8):
        acc = 1.0 if i % 2 == 0 else .75
        add("spic", B(bb, i / 2), play(CSPIC, cel[i] + 12, .6 * acc, release=.08), pan=.3)
        if in_(bb, "drop1", "moon", "drop2", "rise"):
            add("spic", B(bb, i / 2) + .006, play(VSPIC, vln[i], .55 * acc, release=.08), pan=-.3)

# ---- 长音弦乐：月亮段的大和声
for bb in range(int(moon0), int(sit0)):
    root, voic, *_ = CH[chord(bb)]
    for m in voic + [root + 12]:
        bank = CELLO if m < 52 else VIOLA if m < 64 else VIOLIN
        add("str", B(bb), play(bank, m, .7, dur=BAR, release=.6, attack=.15, offset=.15), pan=.3 if m < 52 else -.25 if m >= 64 else 0)

# ---- 主旋律：长笛（低音区）+ 小提琴齐奏
HOOK = [(0, .75, 74), (.75, .25, 72), (1, 1, 74), (2, .5, 77), (2.5, .5, 74), (3, 1, 72),
        (4, .5, 69), (4.5, .5, 72), (5, 1.5, 74), (6.5, .5, 72), (7, 1, 69),
        (8, .75, 74), (8.75, .25, 77), (9, 1, 79), (10, .5, 77), (10.5, .5, 74), (11, 1, 72),
        (12, .5, 74), (12.5, .5, 72), (13, .5, 69), (13.5, .5, 67), (14, 2, 69)]
PEAK = [(0, 1.5, 81), (1.5, .5, 79), (2, 1, 77), (3, 1, 74), (4, .5, 77), (4.5, .5, 79), (5, 3, 81)]
def melody(b0, notes, v, until=None):
    for s, d, m in notes:
        t0 = B(b0, s)
        if until is not None and t0 >= B(until): break
        dd = d * BEAT if until is None else min(d * BEAT, B(until) - t0)
        add("lead", t0, play(FLUTE_X if dd > 1.0 else FLUTE, m, v, dur=dd, release=.12), pan=.1)
        add("lead", t0 + .004, play(VIOLIN, m, v * .55, dur=dd, release=.15, offset=.12, attack=.02), pan=-.1)
melody(drop1, HOOK, .8)
melody(moon0, PEAK, .9)
melody(RESUME, HOOK[:11], .85, until=SCROLL)

# ---- 停：一声古筝从 F 慢慢落回 D（不受静音门影响）
add("sigh", B(STOP, .6), zheng(50, .85, ring=3.6, release=.9, curve=[(0, 3), (.5, 3), (.85, 2.6), (1.15, 1.6), (1.4, .5), (1.6, 0), (2.2, 0), (2.5, .2), (2.8, 0)]))

# ---- 音效（CC0 真实录音），与镜头对应
def bed(path, start=0.0): return load(path)[int(start * SR):]
def place(x, pts, g=1.0):
    ts, vs = zip(*pts); n = int((ts[-1] - ts[0]) * SR)
    seg = x[:n] if len(x) >= n else np.tile(x, (n // len(x) + 1, 1))[:n]
    add("amb", ts[0], seg * np.interp(np.arange(n) / SR + ts[0], ts, vs)[:, None], g=g)
c03, c04, c07, c09 = CUE["c03"], CUE["c04"], CUE["c07"], CUE["c09"]
rain = bed(f"{SAMP}/freesound/rain_city.mp3", 20)
place(rain, [(B(c03[0] + .8), 0), (B(c03[0] + 1.2), .8), (B(c04[0] + .5), .6), (B(c04[0] + 1), 0)])
place(bed(f"{SAMP}/freesound/snow_wind.mp3", 2), [(B(c04[0] + .3), 0), (B(c04[0] + .8), .7), (B(c04[1]), .5), (B(c04[1] + .3), 0)])
place(bed(f"{SAMP}/freesound/sizzle.mp3", .5), [(B(c07[0] + .6), 0), (B(c07[0] + 1), .5), (B(c07[1] - .2), .4), (B(c07[1] + .1), 0)])
place(rain[int(60 * SR):], [(B(c09[0] + .6), 0), (B(c09[0] + 1.1), .6), (B(STOP) - .003, .6), (B(STOP), 0)])
drop = bed(f"{SAMP}/freesound/drop.mp3"); stamp = lp(bed(f"{SAMP}/freesound/stamp.mp3"), 2500)
add("fx", .05, drop, g=.6)
add("fx", 1.5, stamp, g=.45)                                  # 片头“网友”印
t_scroll = B(SCROLL) + .35
add("fx", t_scroll + 1.3, stamp, g=.55); add("fx", t_scroll + 1.6, stamp, g=.45)
def ding():
    out = np.zeros(int(2.4 * SR)); t = np.arange(len(out)) / SR
    for f0, t0, a0 in [(1567.98, 0, 1.0), (2093.0, .13, .8)]:
        tt = np.maximum(0, t - t0); on = t >= t0
        for r, a, tau in [(1, 1, .9), (2.0, .12, .35), (3.0, .05, .2), (4.16, .03, .12)]: out += on * a0 * a * np.exp(-tt / tau) * np.sin(2 * np.pi * f0 * r * tt)
        k = int(t0 * SR); out[k:k + 96] *= np.linspace(0, 1, 96)
    return out * .5
add("fx", B(SCROLL) + 4.2, ding(), g=.3)

if os.environ.get("DUMP"):
    for k in BUS_NAMES:
        print(k.ljust(6), " ".join(f"{20 * np.log10(np.sqrt(((BUS[k][int(b * BAR * SR):int((b + 1) * BAR * SR)] * GAIN[k]) ** 2).mean()) + 1e-9):4.0f}" for b in range(int(TOTAL_BARS))))
# ================================================================== 混音
# 侧链：底鼓一响，低音 / 铺底 / 弦乐让一下
kick_env = np.abs(BUS["kick"][:, 0]); trig = np.zeros(N)
idx = np.where((kick_env[1:] > .3) & (kick_env[:-1] <= .3))[0]
duck = np.ones(N); L = int(.28 * SR); shape = 1 - .78 * np.exp(-np.arange(L) / (.08 * SR))
for i in idx: duck[i:i + L] = np.minimum(duck[i:i + L], shape[:min(L, N - i)])
for k in DUCK: BUS[k] *= duck[:, None]
# 停：除了“叹息”全部一刀切断；厅堂余响自然散尽
g = np.ones(N); i0, i1 = int(B(STOP) * SR), int(B(RESUME) * SR); g[i0:i1] = 0
f8 = int(.004 * SR); g[i0 - f8:i0] = np.linspace(1, 0, f8)
for k in BUS_NAMES:
    if k != "sigh": BUS[k] *= g[:, None]
hall = load(f"{SAMP}/freesound/ir_liverpool.mp3"); hall /= np.sqrt((hall ** 2).sum(0)).max()
dry = np.zeros((N, 2)); send = np.zeros((N, 2))
for k in BUS_NAMES:
    dry += BUS[k] * GAIN[k]
    if k != "sigh": send += BUS[k] * GAIN[k] * SEND[k]
wet = np.stack([fftconvolve(send[:, c], hall[:, c])[:N] for c in range(2)], 1)
wg = np.ones(N); fz = int(.12 * SR); wg[i0:i0 + fz] = np.linspace(1, 0, fz); wg[i0 + fz:i1] = 0; wet *= wg[:, None]   # “停”：连余响也掐掉
sigh_wet = np.stack([fftconvolve(BUS['sigh'][:, c] * GAIN['sigh'] * SEND['sigh'], hall[:, c])[:N] for c in range(2)], 1)
mix = hp(dry + wet * .9 + sigh_wet * .9, 28, 2)
# 总线：轻压缩 + 柔和削波
env = np.sqrt(np.maximum(lp(mix.mean(1) ** 2, 8), 0)); gr = np.minimum(1, (np.maximum(env, 1e-6) / .25) ** -.35)
mix *= gr[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.6) / np.tanh(1.6)
e = np.clip((DUR - np.arange(N) / SR) / 1.2, 0, 1); mix *= e[:, None]
os.makedirs(f"{ROOT}/build", exist_ok=True)
with wave.open(f"{ROOT}/build/music2.wav", "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix[:int(DUR * SR)] * .92, -1, 1) * 32767).astype("<i2").tobytes())
print("build/music2.wav", f"{DUR:.2f}s", {k: round(v[0] * BAR, 2) for k, v in CUE.items()})
