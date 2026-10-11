#!/usr/bin/env python3
"""配乐：120 BPM 的未来贝斯 / 电子流行，全部合成。读 src/timeline.js 的同一套段落时间，转场处放过门音效。
结构（一小节 2 秒）：
  0–4s     片头：铺底 + 上升音效，0.5s 砸标题
  4–64s    前 15 种：律动逐渐加厚（A1 → A4），每 16 秒加一层
  64–68s   章节卡：鼓组抽空，64.5s “+10” 砸下，上升到 68s
  68–108s  后 10 种：drop，换和弦进行、主旋律进来
  108–120s 片尾：冲击 → 律动 → 116s 终止和弦 → 淡出
用法: uv run --with numpy --with scipy python music.py   → build/music.wav
"""
import os, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
TOTAL = 120.0
N = int(SR * (TOTAL + 1))
rng = np.random.default_rng(7)
ROOT = os.path.dirname(os.path.abspath(__file__))

# 段落边界（与 src/timeline.js 一致）
SCENE_START = {n: 4 + 4 * (n - 1) for n in range(1, 16)} | {n: 68 + 4 * (n - 16) for n in range(16, 26)}
TRANS = {2: 'drop', 3: 'iris', 4: 'linewipe', 5: 'zoom', 6: 'blob', 7: 'whip', 8: 'glitch', 9: 'tear', 10: 'defocus',
         11: 'flip', 12: 'crt', 13: 'mosaic', 14: 'wave', 15: 'band', 16: 'ink', 17: 'slats', 18: 'scan', 19: 'halftone',
         20: 'misreg', 21: 'layers', 22: 'flicker', 23: 'rows', 24: 'irisblack', 25: 'dissolve'}

# 母线
bus = {k: np.zeros((N, 2)) for k in ['drums', 'bass', 'pad', 'pluck', 'lead', 'fx', 'verb_send', 'delay_send']}


def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR


def place(name, t0, sig, gain=1.0, pan=0.0, verb=0.0, delay=0.0):
    i = int(round(t0 * SR))
    if i >= N or len(sig) == 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[:N - i]
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    sig = sig * gain
    bus[name][i:i + len(sig)] += sig
    if verb: bus['verb_send'][i:i + len(sig)] += sig * verb
    if delay: bus['delay_send'][i:i + len(sig)] += sig * delay


def lp(x, fc, order=2): return sosfilt(butter(order, min(fc, SR * .45), 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, min(hi, SR * .45)], 'band', fs=SR, output='sos'), x, axis=0)


def sweep_filter(x, f0, f1, kind='band', width=1.0, chunk=1024):
    """分块变化截止频率的滤波（足够做扫频音效）。"""
    out = np.zeros_like(x); n = len(x)
    for s in range(0, n, chunk):
        k = s / max(1, n - 1); fc = f0 * (f1 / f0) ** k
        if kind == 'band': sos = butter(2, [fc / (1 + width), min(fc * (1 + width), SR * .45)], 'band', fs=SR, output='sos')
        elif kind == 'low': sos = butter(2, min(fc, SR * .45), 'low', fs=SR, output='sos')
        else: sos = butter(2, fc, 'high', fs=SR, output='sos')
        seg = x[max(0, s - 2048):s + chunk]
        out[s:s + chunk] = sosfilt(sos, seg, axis=0)[-len(x[s:s + chunk]):]
    return out


def saw(f, t, ph=0.0): return 2 * ((f * t + ph) % 1.0) - 1
def adsr(n, a, d, s, r, sustain_len):
    a, d, r = int(a * SR), int(d * SR), int(r * SR); sl = max(0, int(sustain_len * SR) - a - d)
    env = np.concatenate([np.linspace(0, 1, max(1, a)), np.linspace(1, s, max(1, d)), np.full(sl, s), np.linspace(s, 0, max(1, r))])
    return env[:n] if len(env) >= n else np.pad(env, (0, n - len(env)))

# ---------------- 乐器 ----------------
def kick(punch=1.0):
    t = tt(.5); f = 44 + 120 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5) * (1 + .3 * punch)
    click = rng.standard_normal(len(t)) * np.exp(-t * 500) * .35 + np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 300) * .15
    return np.tanh((body + hp(click, 2000)) * 1.6) * .9

def clap():
    t = tt(.35); env = np.zeros(len(t))
    for o in (0, .011, .022): env += (t >= o) * np.exp(-np.maximum(0, t - o) * 140)
    env += (t >= .03) * np.exp(-np.maximum(0, t - .03) * 18) * .5
    return bp(rng.standard_normal(len(t)), 900, 3800) * env * 1.4

def hat(open_=False):
    t = tt(.3 if open_ else .06); x = hp(rng.standard_normal(len(t)), 7500, 4)
    return lp(x, 11000, 2) * np.exp(-t * (14 if open_ else 70)) * (.32 if open_ else .3)

def crash(d=2.2):
    t = tt(d); x = hp(rng.standard_normal((len(t), 2)), 4500, 2)
    metal = sum(np.sin(2 * np.pi * f * t) for f in (3157, 4211, 5333, 6812))[:, None] * .05
    return (x + metal) * np.exp(-t * 2.2)[:, None] * .45

def sub_boom(d=1.2, f0=70, f1=32):
    d = min(d, 1.2); t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 5); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2) * np.minimum(1, (d - t) * 8) * .6

def supersaw(m, d, voices=7, detune=.11, cutoff=2600, a=.04, r=.35):
    t = tt(d + r); f = mtof(m); out = np.zeros((len(t), 2))
    for v in range(voices):
        dt = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune; pan = (v / (voices - 1)) * 2 - 1
        s = saw(f * 2 ** (dt / 12), t, rng.random())
        out[:, 0] += s * (1 - pan) * .5; out[:, 1] += s * (1 + pan) * .5
    out = hp(lp(out / voices, cutoff, 2), 220, 2)
    return out * adsr(len(t), a, .2, .8, r, d)[:, None]

def pluck(m, d=.4, bright=1.0):
    t = tt(d); f = mtof(m); out = np.zeros(len(t))
    for k in range(1, 18):
        if f * k > SR * .45: break
        out += np.sin(2 * np.pi * f * k * t + k) / k * np.exp(-t * (4 + k * 3.2 / bright))
    return out * np.minimum(1, t * 400) * .6

def bell(m, d=1.2):
    t = tt(d); f = mtof(m)
    return (np.sin(2 * np.pi * f * t + 1.1 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)) * np.exp(-t * 3.2)) * np.minimum(1, t * 600) * .5

def lead(m, d, glide_from=None):
    t = tt(d + .25); f0 = mtof(m)
    f = np.full(len(t), f0)
    if glide_from is not None: f = f0 * (mtof(glide_from) / f0) ** np.exp(-t * 40)
    vib = 1 + .006 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - .18) * 4, 0, 1)
    ph = np.cumsum(f * vib) / SR
    s = sum(2 * ((ph * 2 ** (dt / 1200) + o) % 1) - 1 for dt, o in ((-5, 0), (0, .3), (5, .6))) / 3
    sq = np.sign(np.sin(2 * np.pi * ph * .5 * 2)) * .25
    x = hp(lp(s + sq, 4200, 2), 300, 1)
    return x * adsr(len(t), .01, .15, .75, .22, d)

def bass_note(m, d, kind='saw'):
    t = tt(d + .05); f = mtof(m)
    sub = np.sin(2 * np.pi * f * t)
    top = lp(saw(f, t), 700 if kind == 'saw' else 380, 2)
    return (sub * .8 + top * .4) * adsr(len(t), .004, .12, .6, .04, d)

def noise_riser(d, f0=300, f1=9000, gain=.5):
    x = rng.standard_normal((int(d * SR), 2)); x = lp(sweep_filter(x, f0, min(f1, 6000), 'band', .5), 7000, 2)
    env = np.linspace(0, 1, len(x)) ** 2.2
    return x * env[:, None] * gain * .55

def whoosh(d=.5, f0=500, f1=5000):
    n = int(d * SR); x = rng.standard_normal((n, 2)); k = np.linspace(0, 1, n)
    x = lp(hp(sweep_filter(x, f0, min(f1, 5000), 'band', .6), 300, 2), 9000, 2)
    env = np.sin(np.pi * k * .5) ** 3 * np.minimum(1, (1 - k) * 12)
    pan = np.stack([1 - k * .8, .2 + k * .8], 1)
    return x * env[:, None] * pan * .7

def reverse_cymbal(d=1.0):
    c = crash(d); return c[::-1] * np.linspace(0, 1, len(c))[:, None] ** 1.5

# ---------------- 编排 ----------------
A_PROG = [[53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 62], [57, 60, 64, 67]]   # Fmaj7 G Em7 Am7
A_ROOT = [41, 43, 40, 45]
B_PROG = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]]   # Am F C G
B_ROOT = [45, 41, 36, 43]

kicks = []

def section(t0, t1):
    if t0 < 4: return 'intro'
    if t0 < 64: return 'A'
    if t0 < 68: return 'chapter'
    if t0 < 108: return 'B'
    return 'outro'

for bar in range(60):
    t0 = bar * BAR; sec = section(t0, t0 + BAR)
    level = 0 if t0 < 20 else 1 if t0 < 36 else 2 if t0 < 52 else 3     # A 段逐步加厚
    prog, roots = (B_PROG, B_ROOT) if sec in ('B', 'outro') else (A_PROG, A_ROOT)
    ci = bar % 4; chord, root = prog[ci], roots[ci]
    end_outro = t0 >= 116

    # 铺底和弦
    if sec != 'outro' or not end_outro:
        cut = {'intro': 900, 'A': 1400 + level * 600, 'chapter': 1200, 'B': 3800, 'outro': 2400}[sec]
        g = {'intro': .2, 'A': .16, 'chapter': .2, 'B': .17, 'outro': .16}[sec]
        for m in chord: place('pad', t0, supersaw(m, BAR - .05, cutoff=cut), g, 0, verb=.35)
    if end_outro and bar == 58:   # 终止和弦，长音
        for m in [57, 60, 64, 69, 76]: place('pad', t0, supersaw(m, 3.2, detune=.06, cutoff=2400, r=1.6), .22, 0, verb=.6)
        place('bass', t0, np.sin(2 * np.pi * mtof(33) * tt(3.5)) * np.exp(-tt(3.5) * 1.2) * .7, 1)
        place('fx', t0, crash(3.5), .5); place('drums', t0, sub_boom(2.5, 60, 26), .9); place('drums', t0, kick(1.3), 1)

    # 鼓
    if sec == 'A' or sec == 'B' or (sec == 'outro' and not end_outro):
        for b in range(4):
            tb = t0 + b * BEAT
            if sec == 'A' and level == 0 and b % 2 == 1: pass
            else: place('drums', tb, kick(), .95); kicks.append(tb)
            if (sec == 'B' or level >= 1 or sec == 'outro') and b % 2 == 1: place('drums', tb, clap(), .55, 0, verb=.18)
            place('drums', tb + BEAT / 2, hat(open_=(sec == 'B' or level >= 2)), .55 if sec == 'B' else .45, .25)
            if sec == 'B' or level >= 2:
                for s in (1, 3): place('drums', tb + s * BEAT / 4, hat(), .22 + .08 * rng.random(), -.3)
        # A 段最后两小节：军鼓滚奏集结进章节卡
        if sec == 'A' and bar >= 30:
            for s in range(16):
                ts = t0 + s * BEAT / 4 if bar == 30 else t0 + s * BEAT / 4
                dens = 1 if bar == 30 else 2
                for q in range(dens): place('drums', ts + q * BEAT / 8, clap() * .6, .15 + .35 * ((bar - 30) * 16 + s) / 32, 0, verb=.2)
    if sec == 'intro':
        # 片头两小节：滤波铺底 + 上升，最后一拍军鼓滚奏
        if bar == 1:
            for s in range(8): place('drums', t0 + 2 * BEAT + s * BEAT / 4, clap() * .6, .15 + .06 * s, 0, verb=.25)

    # 低音
    if sec in ('A', 'B') or (sec == 'outro' and not end_outro):
        if sec == 'A' and level < 2:      # 房屋式反拍低音
            for b in range(4): place('bass', t0 + b * BEAT + BEAT / 2, bass_note(root, BEAT * .45), .5)
        else:
            for b in range(4): place('bass', t0 + b * BEAT, bass_note(root - (0 if b % 2 == 0 else 0), BEAT * .92), .55)

    # 拨弦琶音
    if (sec == 'A' and level >= 1) or sec == 'B' or (sec == 'outro' and not end_outro):
        arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[3] + 12, chord[2] + 24, chord[3] + 12, chord[1] + 12, chord[2] + 12]
        for s in range(16):
            m = arp[s % 8]; place('pluck', t0 + s * BEAT / 4, pluck(m, .35, 1.2 if sec == 'B' else .9), .32 if sec == 'B' else .3, (-.4 if s % 2 else .4), verb=.25, delay=.25)
    if sec == 'A' and level >= 2 and bar % 2 == 0:   # A3 起：钟琴动机
        mot = [chord[3] + 12, chord[2] + 12, chord[1] + 24, chord[2] + 12]
        for k, m in enumerate(mot): place('pluck', t0 + k * BEAT, bell(m), .2, .2, verb=.4, delay=.3)

# 主旋律（后 10 种，68–108s，4 小节一句，奇偶句结尾不同）
PH1 = [(0, 1.5, 76), (1.5, .5, 74), (2, 1, 72), (3, 1, 76), (4, 1.5, 77), (5.5, .5, 76), (6, 1, 72), (7, 1, 69),
       (8, 1.5, 79), (9.5, .5, 76), (10, 1, 74), (11, 1, 72), (12, 1.5, 74), (13.5, .5, 71), (14, 1, 74), (15, 1, 79)]
PH2 = PH1[:12] + [(12, .5, 74), (12.5, .5, 76), (13, 1, 79), (14, 2, 81)]
t = 68.0; k = 0
while t < 108 - 1e-6:
    ph = PH1 if k % 2 == 0 else PH2
    for b, d, m in ph:
        tb = t + b * BEAT
        if tb >= 108: break
        place('lead', tb, lead(m, d * BEAT * .95), .5, 0, verb=.25, delay=.22)
        place('lead', tb, lead(m - 12, d * BEAT * .95), .16, 0, verb=.15)
        place('lead', tb, pluck(m + 12, .45, 1.4), .16, 0, verb=.3)
    t += 16 * BEAT   # 一句 4 小节 = 8 秒
    k += 1

# 片头 / 章节 / 片尾的关键音效
place('fx', 0, sub_boom(1.2, 80, 30), .7)
place('fx', 0.5 - .35, whoosh(.4, 400, 6000), .5)
place('fx', 0.5, kick(1.4), 1.0); place('fx', 0.5, crash(2.5), .45); place('fx', 0.5, sub_boom(1.8), .9)
place('fx', 1.0, noise_riser(3.0, 250, 8000), .45)
place('fx', 3.0, reverse_cymbal(1.0), .7)
place('fx', 4.0, crash(2.5), .5); place('fx', 4.0, sub_boom(1.6, 75, 28), .9)
# 章节卡
place('fx', 63.0, reverse_cymbal(1.0), .7)
place('fx', 64.0, crash(1.6), .5)
place('fx', 64.5, kick(1.5), .9); place('fx', 64.5, sub_boom(1.2, 90, 30), .8); place('fx', 64.5, crash(3.0), .5)
for m in [57, 60, 64, 69]: place('pad', 64.5, supersaw(m, 3.3, cutoff=1800, a=.01, r=.5), .22, 0, verb=.5)
place('fx', 65.0, noise_riser(3.0, 200, 10000), .55)
for s in range(16): place('drums', 66.0 + s * BEAT / 4, clap() * .6, .1 + .45 * s / 15, 0, verb=.2)
place('fx', 67.0, reverse_cymbal(1.0), .8)
place('fx', 68.0, crash(3.0), .5); place('fx', 68.0, sub_boom(2.0, 80, 26), 1.0)
# 片尾
place('fx', 107.0, reverse_cymbal(1.0), .7)
place('fx', 108.0, crash(3.0), .5); place('fx', 108.0, sub_boom(2.0), 1.0)
place('fx', 112.0, crash(2.5), .6); place('fx', 112.0, kick(1.4), .8); place('fx', 112.0, sub_boom(1.6), .7)

# 每个转场：过门 whoosh + 落点
def sfx_for(kind, b):
    place('fx', b - .45, whoosh(.45, 400, 4500), .14)
    if kind == 'glitch':
        for i in range(10):
            ts = b - .3 + i * .06; n = int(.04 * SR); x = np.round(rng.standard_normal(n) * 3) / 3
            place('fx', ts, bp(x, 300, 6000) * .35, 1, (i % 2) * 1.4 - .7)
    elif kind == 'crt':
        tq = tt(.35); place('fx', b - .35, np.sin(2 * np.pi * np.cumsum(1800 * np.exp(-tq * 9) + 60) / SR) * np.exp(-tq * 4) * .25, 1)
        tq = tt(.25); place('fx', b, hp(rng.standard_normal(len(tq)), 3000) * np.exp(-tq * 12) * .25, 1)
    elif kind == 'mosaic':
        for i, m in enumerate([72, 76, 79, 84, 88]):
            tq = tt(.07); place('fx', b - .1 + i * .06, np.sign(np.sin(2 * np.pi * mtof(m) * tq)) * .08 * np.exp(-tq * 10), 1)
    elif kind == 'wave':
        tq = tt(.25); place('fx', b, np.sin(2 * np.pi * np.cumsum(300 + 900 * tq / .25) / SR) * np.exp(-tq * 10) * .3, 1, verb=.3)
    elif kind == 'band':
        tq = tt(.5); place('fx', b - .25, np.sin(2 * np.pi * np.cumsum(500 + 1500 * (tq / .5) ** 1.5) / SR) * np.sin(np.pi * tq / .5) * .12, 1)
    elif kind == 'ink':
        tq = tt(.3); place('fx', b - .1, np.sin(2 * np.pi * np.cumsum(900 + 1500 * np.exp(-tq * 30)) / SR) * np.exp(-tq * 18) * .3, 1, verb=.5)
    elif kind == 'flicker':
        tq = tt(.6); hum = (np.sin(2 * np.pi * 100 * tq) + .5 * np.sin(2 * np.pi * 200 * tq) + .3 * np.sign(np.sin(2 * np.pi * 100 * tq)))
        gate = (np.floor(tq * 22).astype(int) % 3 != 1).astype(float)
        place('fx', b - .3, hum * gate * .07, 1)
    elif kind == 'rows':
        for i in range(10):
            tq = tt(.03); place('fx', b - .3 + i * .055 + rng.random() * .015, hp(rng.standard_normal(len(tq)), 2000) * np.exp(-tq * 150) * .3, 1, rng.random() - .5)
    elif kind == 'irisblack':
        for i in range(int(.8 * 18)):
            tq = tt(.02); place('fx', b + i / 18, hp(rng.standard_normal(len(tq)), 1500) * np.exp(-tq * 300) * .12, 1)
    elif kind == 'dissolve':
        for i in range(24):
            m = 84 + (i * 5) % 14; place('fx', b - .4 + i * .03, bell(m, .5) * .12, 1, rng.random() * 1.6 - .8, verb=.6)
    elif kind in ('zoom', 'iris', 'drop', 'flip', 'halftone'):
        place('fx', b, sub_boom(.6, 90, 40), .35)
    elif kind == 'layers':
        for i in range(4):
            tq = tt(.12); place('fx', b - .3 + i * .1, bp(rng.standard_normal(len(tq)), 400, 2500) * np.exp(-tq * 30) * .3, 1, verb=.2)

for n, kind in TRANS.items(): sfx_for(kind, SCENE_START[n])
sfx_for('shutter', 64.0)

# ---------------- 混音 ----------------
# 侧链：每个底鼓压低铺底、低音、琶音
duck = np.ones(N)
for k in kicks:
    i = int(k * SR); n = int(.3 * SR); seg = 1 - .65 * np.exp(-np.arange(n) / SR / .09)
    duck[i:i + n] = np.minimum(duck[i:i + n], seg[:max(0, min(n, N - i))])
for b, depth in (('pad', 1.0), ('bass', .8), ('pluck', .5), ('lead', .25)):
    bus[b] *= (1 - depth * (1 - duck))[:, None]

# 混响（合成的指数衰减冲激响应）与乒乓延迟
ir_t = tt(2.6); ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t / .75)[:, None]
ir = lp(ir, 6000, 1); ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
verb = np.stack([fftconvolve(bus['verb_send'][:, c], ir[:, c])[:N] for c in range(2)], 1) * .9
dl = int(BEAT * .75 * SR); delay = np.zeros((N, 2)); src = bus['delay_send'].copy()
for k in range(1, 5):
    sh = src[:N - dl * k] * (.45 ** k); c = k % 2
    delay[dl * k:, c] += lp(sh[:, c], 4000, 1)

mix = (bus['drums'] * .95 + bus['bass'] * .85 + bus['pad'] * .8 + bus['pluck'] * .7 + bus['lead'] * .75 + bus['fx'] * .8 + verb * .55 + delay * .35)
mix = hp(mix, 28, 2)
# 结尾淡出
fade_i = int(118.0 * SR); mix[fade_i:] *= np.linspace(1, 0, N - fade_i)[:, None] ** 1.5
mix = mix[:int(TOTAL * SR)]
# 柔性限幅
mix = mix / (np.abs(mix).max() + 1e-9) * 1.1
mix = np.tanh(mix) / np.tanh(1.1) * .89

os.makedirs(f'{ROOT}/build', exist_ok=True)
with wave.open(f'{ROOT}/build/music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
print('build/music.wav', f'{len(mix) / SR:.1f}s')
