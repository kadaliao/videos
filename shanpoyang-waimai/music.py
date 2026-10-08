#!/usr/bin/env python3
"""《山坡羊·外卖骑手》配乐 + 音效。按 timeline.json 的小节逐拍对齐画面。
72 BPM，D 羽调式（D F G A C）——恰好就是那段古筝录音的定弦。
真实采样（全部 CC0）：古筝（Freesound 录音里切出的单音与刮奏）、VSCO-2 CE 的弦乐群 / 低音提琴 / 长笛 / 立式钢琴 / 竖琴 / 定音鼓 / 锣，
混响用利物浦爱乐音乐厅的脉冲响应。古琴泛音为合成（纯正弦叠竖琴起音）。
  古筝：贯穿全曲的八分音符固定音型，像一直在转的车轮 ——“停不了”；按滑、吟揉都用变速重采样做在真实采样上
  长笛（低音区，代箫）：主题；弦乐群：和声；钢琴：雨；竖琴：雪；定音鼓滚奏：撞上“停”
高潮的终止和弦被“停”字截断（第 28 小节），一声古筝下滑音“叹息”，两小节后固定音型独自重新开始。
用法: uv run --with numpy --with scipy python music.py   → build/music.wav（48 kHz 立体声，未做响度归一）
先跑: tools/fetch_samples.sh && uv run --with numpy --with scipy python tools/build_samples.py"""
import json, os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.abspath(__file__))
SAMP = os.environ.get("SAMPLES", os.path.expanduser("~/samples"))
TL = json.load(open(f"{ROOT}/timeline.json"))
SR = 48000
BEAT = 60 / TL["bpm"]; BAR = BEAT * TL["beatsPerBar"]
DUR = TL["totalBars"] * BAR
N = int(SR * (DUR + 1))
STOP, RESUME = TL["stopBar"] * BAR, TL["resumeBar"] * BAR
rng = np.random.default_rng(2026)

def B(bar, beat=0.0): return bar * BAR + beat * BEAT
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def sos(kind, f, order=2):
    ny = SR / 2
    if kind == "band": return butter(order, [max(20, f[0]) / ny, min(f[1], ny - 200) / ny], "bandpass", output="sos")
    return butter(order, min(max(f, 20), ny - 200) / ny, kind, output="sos")
def lp(x, f, o=2): return sosfilt(sos("low", f, o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos("high", f, o), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(sos("band", (lo, hi), o), x, axis=0)
def noise(n): return rng.standard_normal(n)
def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

BUS_NAMES = ["zheng", "qin", "flute", "str", "pno", "harp", "perc", "sigh", "amb", "fx"]
BUS = {k: np.zeros((N, 2)) for k in BUS_NAMES}
SEND = {"zheng": .20, "qin": .34, "flute": .30, "str": .30, "pno": .28, "harp": .32, "perc": .25, "sigh": .40, "amb": .0, "fx": .18}
GAIN = {"zheng": .62, "qin": .55, "flute": .50, "str": .42, "pno": .55, "harp": .40, "perc": .55, "sigh": .80, "amb": .55, "fx": .6}

def add(bus, t, sig, g=1.0, pan=0.0):
    if sig.ndim == 1: sig = np.stack([sig, sig], 1)
    if pan:  # 等功率声像（对立体声采样做平衡）
        a = (pan + 1) * np.pi / 4; sig = sig * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)
    i = int(round(t * SR)); sig = sig * g
    if i < 0: sig = sig[-i:]; i = 0
    j = min(N, i + len(sig))
    if j > i: BUS[bus][i:j] += sig[:j - i]

# ------------------------------------------------------------------ 采样器
class Bank:
    def __init__(self, name):
        d = np.load(f"{ROOT}/build/samples/{name}.npz")
        self.s = [(d[f"a{i}"].astype(np.float64), float(d["midi"][i]), float(d["vel"][i])) for i in range(len(d["midi"]))]
        self.s = [x for x in self.s if len(x[0]) > .8 * SR] or self.s   # 余音太短的切片不用
        if name == "piano":   # 钢琴采样保留了原始电平（很轻），按力度层统一抬到峰值 ≈1，层间差异交给 vel
            self.s = [(a / (np.abs(a).max() + 1e-9), m, v) for a, m, v in self.s]
    def pick(self, m, vel):
        dist = [abs(mm - m) for _, mm, _ in self.s]; best = min(dist)
        cand = [k for k, dd in enumerate(dist) if dd <= best + .6]
        k = min(cand, key=lambda k: abs(self.s[k][2] - vel) + rng.uniform(0, .05))
        return self.s[k]

def play(bank, m, vel=.6, dur=None, release=.3, curve=None, offset=0.0, attack=0.0, bright=None):
    """变速重采样播放一个音。curve: [(秒, 半音偏移)] 按滑；dur: 发音时长（之后 release 秒淡出）；offset: 从采样第几秒起读（连奏时跳过起音）"""
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
    elif offset > 0: e *= np.clip(t / .03, 0, 1)
    out *= e[:, None]
    if bright is not None: out = lp(out, bright)
    return out * vel

ZHENG, CELLO, VIOLA, VIOLIN, BASS = Bank("zheng"), Bank("cello"), Bank("viola"), Bank("violin"), Bank("bass")
FLUTE, FLUTE_X, PIANO, HARP = Bank("flute"), Bank("flute_exp"), Bank("piano"), Bank("harp")
TIMP, GONG, BDRUM = Bank("timp_roll"), Bank("gong"), Bank("bdrum")
GLISS = np.load(f"{ROOT}/build/samples/zheng_gliss.npy").astype(np.float64)

def zheng(m, vel, ring=1.6, curve=None, release=.35):
    return play(ZHENG, m, vel, dur=ring, release=release, curve=curve, bright=1800 + 7000 * vel)

def qin_harmonic(m, vel=.6):
    """古琴泛音：纯正弦（长尾）叠一层很轻的竖琴拨弦作起音"""
    f = mtof(m); n = int(5.5 * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for k, (a, tau) in enumerate([(1, 3.2), (.18, 1.4), (.06, .7)], 1):
        out += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6))
    out[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    h = play(HARP, m, .5, dur=1.2, release=.6, bright=5000)
    s = np.stack([out, out], 1) * .32; s[:len(h)] += h * .45
    return hp(s, 160) * vel

def strings_chord(midis, dur, vel, attack=.8, release=1.4):
    """一组和声：低于 50 交给大提琴（最低音再加低音提琴），50–64 中提琴，更高给小提琴"""
    out = np.zeros((int((dur + release) * SR), 2))
    lo = min(midis)
    for m in midis:
        bank, pan = (CELLO, .35) if m < 52 else (VIOLA, .1) if m < 64 else (VIOLIN, -.35)
        s = play(bank, m, vel, dur=dur, release=release, attack=attack, offset=rng.uniform(.05, .25))
        if bank is not CELLO: s = hp(s, 140)      # 给低音区让路
        a = (pan + 1) * np.pi / 4; out[:len(s)] += s * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2) / np.sqrt(len(midis))
        if m == lo and m < 48:
            s = play(BASS, m, vel * .8, dur=dur, release=release, attack=attack, offset=.1)
            out[:len(s)] += s * .55
    return out

def flute_line(notes, vel=.6, cresc=None):
    """notes: [(起始秒, 时值秒, midi, 倚音)]，连奏：后一音跳过起音并与前音交叉 50ms；长音用渐强揉音的 expvib 采样"""
    for i, (s, d, m, g) in enumerate(notes):
        nxt = notes[i + 1] if i + 1 < len(notes) else None
        legato_in = i > 0 and s - (notes[i - 1][0] + notes[i - 1][1]) < .06
        legato_out = nxt is not None and nxt[0] - (s + d) < .06
        bank = FLUTE_X if d > 1.7 else FLUTE
        if cresc: vel = cresc[0] + (cresc[1] - cresc[0]) * i / max(1, len(notes) - 1)
        rel = .06 if legato_out else .35
        st = s
        if g is not None:   # 倚音：上方邻音先吹 70ms
            gs = play(FLUTE, g, vel * .9, dur=.07, release=.03, offset=.06 if legato_in else 0)
            add("flute", s - .02, gs, pan=.15); st = s + .05; d -= .05
        sig = play(bank, m, vel * (1.05 if d > 1.7 else 1), dur=d + (.05 if legato_out else 0), release=rel,
                   offset=(.07 if (legato_in or g is not None) else 0))
        add("flute", st, sig, pan=.15)

def timp_roll(m, dur, v0, v1):
    s = play(TIMP, m, 1.0, dur=dur, release=.02, offset=.5)
    e = np.linspace(v0, v1, len(s)) ** 1.8; return s * e[:, None]

# ================================================================== 乐谱
CH = {  # 低音、弦乐和声、古筝固定音型（8 个八分音符；只用定弦里的音）
    "Dm":  (38, [50, 57, 65, 69, 74], [50, 57, 62, 57, 65, 57, 62, 57]),
    "Bb":  (34, [46, 53, 62, 65, 74], [43, 50, 55, 50, 62, 50, 60, 50]),
    "F/A": (45, [45, 53, 60, 65, 72], [45, 53, 57, 53, 60, 53, 57, 53]),
    "C":   (36, [48, 55, 62, 67, 72], [48, 55, 60, 55, 62, 55, 60, 55]),
    "Gm":  (43, [43, 50, 58, 62, 67], [43, 50, 55, 50, 62, 50, 57, 50]),
    "A7s": (45, [45, 52, 62, 67, 69], [45, 53, 57, 53, 62, 53, 55, 53]),
}
P = ["Dm", "Bb", "F/A", "C"]; Q = ["Gm", "Bb", "F/A", "A7s"]
chord_at = {b: P[b % 4] for b in range(4, 24)}
chord_at.update({b: Q[b - 24] for b in range(24, 28)})
chord_at.update({30: "Dm", 31: "Dm", 32: "Bb", 33: "F/A", 34: "C", 35: "Dm", 36: "Dm"})

# ---- 开篇（第 0–3 小节）：远处一声极轻的锣，古琴泛音，古筝按滑
add("perc", B(0, .2), lp(play(GONG, 50, .5, release=1.0), 4500), g=.2)
for beat, m, v in [(.5, 69, .55), (1.6, 74, .5), (3.1, 81, .4), (5.0, 69, .55), (6.0, 72, .5), (7.0, 74, .62),
                   (12.4, 74, .5), (13.6, 69, .45), (14.6, 72, .4)]:
    add("qin", B(0, beat), qin_harmonic(m, v), pan=.2 * np.sin(beat))
add("zheng", B(2, .5), zheng(60, .55, ring=2.4, curve=[(0, 0), (.3, 0), (.7, 2), (1.2, 2), (1.5, 2.3), (1.8, 2), (2.1, 2.25), (2.8, 2)]), pan=.1)
add("zheng", B(2, 2.5), zheng(50, .7, ring=3.0), pan=-.05)
add("zheng", B(2, 2.5) + .02, zheng(62, .45, ring=3.0), pan=.05)

# ---- 第 4 小节：一段真实的古筝上行刮奏，把车轮推动起来
add("zheng", B(4) - 1.55, GLISS, g=.35, pan=-.1)

# ---- 古筝固定音型：第 4 小节起从不停下；只在第 28–30 小节被“停”截断，第 30 小节独自重新开始
def zv(b):
    if b < 8: return .42 + .03 * (b - 4)
    if b < 16: return .52
    if b < 20: return .46
    if b < 24: return .5
    if b < 28: return .68
    if b < 31: return .40
    return max(.06, .40 - .065 * (b - 31))
for b in list(range(4, 28)) + list(range(30, 37)):
    pat = CH[chord_at.get(b, "Dm")][2]
    for i, m in enumerate(pat):
        s = B(b, i * .5) + rng.normal(0, .007)
        v = zv(b + i / 8) * (1.0 if i % 2 == 0 else .8) * (1.12 if i == 0 else 1) * (1.3 if (b, i) == (30, 0) else 1) * rng.uniform(.88, 1.06)
        add("zheng", s, zheng(m, v, ring=1.1 if i % 2 else 1.5), pan=-.22 + .12 * (i % 2))
# 古筝在第 5–7 小节的应答：按音 + 吟揉 + 下滑
add("zheng", B(5, 2), zheng(69, .5, ring=2.2, curve=[(0, 0), (.5, 0), (.8, .25), (1.1, 0), (1.4, .25), (1.7, 0)]), pan=.25)
add("zheng", B(6, 0), zheng(67, .5, ring=2.0, curve=[(0, 0), (.6, 0), (1.1, -2), (2.0, -2)]), pan=.25)
add("zheng", B(6, 3), zheng(62, .55, ring=3.2, curve=[(0, 0), (.5, 0), (.75, .3), (1.0, 0), (1.25, .3), (1.5, 0), (1.75, .2), (2.0, 0)]), pan=.25)
# 高潮段：每小节强拍一个八度双音（撮）
for b, (lo_, hi_) in zip(range(24, 28), [(43, 55), (43, 55), (45, 57), (45, 57)]):
    zv_ = .62 + .06 * (b - 24)
    add("zheng", B(b), zheng(lo_, zv_, ring=2.6), pan=-.1); add("zheng", B(b) + .025, zheng(hi_, zv_ * .78, ring=2.6), pan=.1)

# ---- “停”之后的一声叹息：古筝按住 D3 弦推高到 F，再慢慢放下（不受静音门影响）
add("sigh", B(28, 3), zheng(50, .8, ring=4.6, release=1.2, curve=[(0, 3), (.55, 3), (.9, 2.8), (1.2, 2.2), (1.45, 1.2), (1.65, .35), (1.8, 0), (2.5, 0), (2.8, .2), (3.1, 0), (3.4, .15), (3.7, 0)]), pan=0)

# ---- 尾声：泛音再现主题动机
for beat, m, v in [(0.5, 69, .5), (1.5, 72, .48), (2.5, 74, .58), (8.5, 74, .5), (9.5, 72, .45), (10.5, 69, .5),
                   (16.5, 69, .45), (17.5, 72, .42), (18.5, 74, .5), (20.5, 81, .38), (24.0, 74, .45), (24.05, 69, .3)]:
    add("qin", B(31, beat), qin_harmonic(m, v), pan=.25 * np.sin(beat * 1.3))

# ---- 弦乐群
add("str", B(2), strings_chord([38, 50], BAR * 2 + .3, .3, attack=2.5))
for b in (4, 6):
    r = CH[chord_at[b]][0]; add("str", B(b), strings_chord([r, r + 12], BAR * 2 + .2, .3, attack=1.2))
def sv(b): return {8: .32, 9: .32, 10: .38, 11: .4}.get(b, .42 if b < 16 else .46 if b < 20 else .55 if b < 24 else .54 + .08 * (b - 24))
for b in range(8, 28):
    root, voic, _ = CH[chord_at[b]]
    vo = voic[:3] if b in (8, 9) else voic          # 夜里只留低声部
    add("str", B(b), strings_chord([root] + vo, BAR + .12, sv(b), attack=.7 if b < 24 else .45, release=1.3))
for b in range(31, 36):
    root, voic, _ = CH[chord_at[b]]
    add("str", B(b), strings_chord([root + 12] + voic[:3], BAR + .2, max(.1, .24 - .035 * (b - 31)), attack=1.4, release=2.6))

# ---- 立式钢琴：雨（第 12–13 小节），其后稀疏点缀；高潮时弹低音八度
pno = {12: [(0, 74), (1.5, 69), (2.5, 72)], 13: [(0, 77), (1.5, 74), (2.5, 69)]}
for b, ns in pno.items():
    for beat, m in ns: add("pno", B(b, beat) + rng.normal(0, .01), play(PIANO, m, .3, dur=3.0, release=.6), pan=.2)
    root = CH[chord_at[b]][0]
    add("pno", B(b), play(PIANO, root + 12, .3, dur=3.2, release=.6), pan=-.1)
    add("pno", B(b) + .015, play(PIANO, root + 19, .25, dur=3.2, release=.6), pan=-.05)
for b in range(16, 24):
    add("pno", B(b, 2.5), play(PIANO, CH[chord_at[b]][1][-1] + 12, .3, dur=2.2, release=.6), pan=.3)
for b in range(24, 28):
    root = CH[chord_at[b]][0]
    for beat in (0, 2):
        pv = .38 + .06 * (b - 24) + (.04 if beat == 0 else 0)
        add("pno", B(b, beat), play(PIANO, root + 12, pv, dur=1.5, release=.4), pan=-.15)
        add("pno", B(b, beat) + .01, play(PIANO, root + 24, pv * .8, dur=1.5, release=.4), pan=-.15)

# ---- 竖琴：雪（第 14–15 小节），像雪片一样高而轻
for b, ns in {14: [(0, 86), (1, 81), (2, 77), (3, 74)], 15: [(0, 84), (1.5, 79), (2.5, 74), (3.5, 72)]}.items():
    for beat, m in ns: add("harp", B(b, beat) + rng.normal(0, .01), hp(play(HARP, m, .55, release=.8), 220), pan=-.3 + .2 * beat)

# ---- 打击：第 20 小节起极轻的大鼓；第 24 小节一声锣；第 27 小节定音鼓滚奏渐强，撞上“停”
for b in range(20, 27):
    for beat in ((0, 2) if b < 24 else (0, 1.5, 2, 3.5)):
        add("perc", B(b, beat), hp(play(BDRUM, 36, .45, release=.5), 38), g=.2 if b < 24 else .3, pan=.05)
add("perc", B(24), lp(play(GONG, 50, .6, release=1.5), 4500), g=.17, pan=-.05)
add("perc", B(26, 2), timp_roll(45, BAR * 1.5, .02, 1.0), g=.9, pan=.05)

# ---- 长笛（低音区，代箫）：主题（第 16–23 小节）与高潮（第 24–27 小节，末音悬在 A5→E，被“停”截断）
theme = [  # (拍，相对第 16 小节), 时值拍, midi, 倚音
    (.5, 1, 69, None), (1.5, .5, 72, None), (2, 5.5, 74, 76),
    (8, .75, 72, None), (8.75, .25, 74, None), (9, .5, 72, None), (9.5, .5, 69, None), (10, 5, 67, 69),
    (16.5, 1, 69, None), (17.5, .5, 72, None), (18, 1, 67, None), (19, 1, 65, None), (20, 4.5, 62, 65),
    (25, .5, 65, None), (25.5, .5, 67, None), (26, 1, 69, None), (27, 1, 72, None), (28, 3.5, 69, 72),
    (32, 1.5, 74, None), (33.5, .5, 77, None), (34, 2, 79, 81), (36, .75, 77, None), (36.75, .25, 74, None), (37, 2.5, 72, 74),
    (40, .5, 74, None), (40.5, .5, 72, None), (41, .5, 69, None), (41.5, .5, 67, None), (42, 2, 69, 72),
    (44, 1, 72, None), (45, 1, 74, None), (46, 2.4, 76, 79),
]
flute_line([(B(16, s), d * BEAT, m, g) for s, d, m, g in theme[:18]], .72)
flute_line([(B(16, s), d * BEAT, m, g) for s, d, m, g in theme[18:]], .8, cresc=(.6, .86))

# ================================================================== 音效（真实录音，CC0）与画面对应
def bed(path, start_in_file=0.0):
    x = load(path); return x[int(start_in_file * SR):]
def place_bed(x, points, g=1.0):
    ts, vs = zip(*points); t0, t1 = ts[0], ts[-1]
    n = int((t1 - t0) * SR); seg = x[:n] if len(x) >= n else np.tile(x, (n // len(x) + 1, 1))[:n]
    e = np.interp(np.arange(n) / SR + t0, ts, vs); add("amb", t0, seg * e[:, None], g=g)
rb = lambda b: b * BAR
rain = bed(f"{SAMP}/freesound/rain_city.mp3", 20)
place_bed(rain, [(rb(11.8), 0), (rb(12.3), .9), (rb(13.6), .9), (rb(14.3), 0)])
place_bed(rain[int(60 * SR):], [(rb(26.6), 0), (rb(27.0), 1.0), (rb(28) - .004, 1.0), (rb(28), 0)])   # “停”：雨声与画面中的雨一起冻结
place_bed(bed(f"{SAMP}/freesound/rain_light.mp3", 30), [(rb(30), 0), (rb(30) + .04, .6), (rb(31.2), .4), (rb(32.5), 0)])
place_bed(bed(f"{SAMP}/freesound/snow_wind.mp3", 2), [(rb(13.8), 0), (rb(14.4), .8), (rb(15.6), .7), (rb(16.3), 0)])
sz = bed(f"{SAMP}/freesound/sizzle.mp3", .5)[:int(7.5 * SR)]
xf = int(.5 * SR); loop = np.concatenate([sz[:-xf], sz[-xf:] * np.linspace(1, 0, xf)[:, None] + sz[:xf] * np.linspace(0, 1, xf)[:, None]])
place_bed(np.tile(loop, (3, 1)), [(rb(20), 0), (rb(20.6), .45), (rb(23.4), .4), (rb(24.2), 0)])
drop = bed(f"{SAMP}/freesound/drop.mp3"); stamp = bed(f"{SAMP}/freesound/stamp.mp3")
add("fx", B(0, .3), drop, g=.5)                 # 开篇一滴墨
add("fx", B(33, 0), drop, g=.32)                # 收卷
add("fx", 6.4, lp(stamp, 2500), g=.4, pan=-.15)       # 题目下的“网友”印
add("fx", B(34, 1.0), lp(stamp, 2500), g=.6, pan=-.1)   # 两枚印
add("fx", B(34, 3.0), lp(stamp, 2500), g=.5, pan=.1)
def ding():
    out = np.zeros(int(2.6 * SR)); t = np.arange(len(out)) / SR
    for f0, t0, a0 in [(1567.98, 0, 1.0), (2093.0, .13, .8)]:
        tt = np.maximum(0, t - t0); on = t >= t0
        for r, a, tau in [(1, 1, .9), (2.0, .12, .35), (3.0, .05, .2), (4.16, .03, .12)]:
            out += on * a0 * a * np.exp(-tt / tau) * np.sin(2 * np.pi * f0 * r * tt)
        k = int(t0 * SR); out[k:k + 96] *= np.linspace(0, 1, 96)
    return out * .5
add("fx", TL["dingBar"] * BAR, ding(), g=.26, pan=.05)   # 叮咚——新订单

if os.environ.get("DUMP"):   # 调试：各声部逐小节 RMS
    for k in BUS_NAMES:
        print(k.ljust(6), " ".join(f"{20 * np.log10(np.sqrt(((BUS[k][int(b * BAR * SR):int((b + 1) * BAR * SR)] * GAIN[k]) ** 2).mean()) + 1e-9):6.1f}" for b in range(20, 28)))
# ================================================================== 停：静音门（干声一刀切断，厅堂余响自然散尽）
g = np.ones(N); i0, i1 = int(STOP * SR), int(RESUME * SR)
g[i0:i1] = 0; f8 = int(.006 * SR); g[i0 - f8:i0] = np.linspace(1, 0, f8)
for k in ["zheng", "qin", "flute", "str", "pno", "harp", "perc"]: BUS[k] *= g[:, None]

# 混响：真实音乐厅脉冲响应（2 秒）+ 一条平滑的合成长尾
hall = load(f"{SAMP}/freesound/ir_liverpool.mp3")
m = int(3.6 * SR); t = np.arange(m) / SR
tail = np.stack([lp(noise(m), 7000) * np.exp(-t / .55) + lp(noise(m), 1800) * np.exp(-t / .9) for _ in range(2)], 1)
tail[:int(.08 * SR)] *= np.linspace(0, 1, int(.08 * SR))[:, None]
IR = np.zeros((m, 2)); IR[:len(hall)] += hall / np.sqrt((hall ** 2).sum(0)).max()
IR += tail / np.sqrt((tail ** 2).sum(0)).max() * .45
dry = np.zeros((N, 2)); send = np.zeros((N, 2)); sigh_send = BUS["sigh"] * GAIN["sigh"] * SEND["sigh"]
for k in BUS_NAMES:
    dry += BUS[k] * GAIN[k]
    if k != "sigh": send += BUS[k] * GAIN[k] * SEND[k]
conv = lambda x: np.stack([fftconvolve(x[:, c], IR[:, c])[:N] for c in range(2)], 1)
wet = conv(send)
wg = np.ones(N)   # 干声一刀切断，厅堂的余响自然散尽
mix = dry + wet * wg[:, None] + conv(sigh_send)
mix = hp(mix, 32, 2)
e = np.clip((DUR - np.arange(N) / SR) / 2.0, 0, 1); mix *= e[:, None]
mix /= np.abs(mix).max() / .89
os.makedirs(f"{ROOT}/build", exist_ok=True)
with wave.open(f"{ROOT}/build/music.wav", "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix[:int(DUR * SR)], -1, 1) * 32767).astype("<i2").tobytes())
print("build/music.wav", f"{DUR:.2f}s")
