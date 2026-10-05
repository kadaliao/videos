#!/usr/bin/env python3
"""逐段 Gemini TTS（Charon）→ whisper 词级时间 → Qwen Omni 听验 → build/timeline.json + 拼接旁白 audio/vo.wav
用法: python3 voice.py [--only N1,N2] [--force] [--no-listen]
缓存键 = 文本 + 风格 + 音色；只重合成改过的段落。"""
import json, os, re, subprocess, sys, hashlib, wave
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.abspath(__file__))
TTS = os.path.expanduser("~/.claude/skills/tts/scripts/tts.py")
LISTEN = os.path.expanduser("~/.claude/skills/tts/scripts/listen.py")
A, B = f"{ROOT}/audio/vo", f"{ROOT}/build"
LEAD, TAIL = 0.25, 0.35          # 全片开头留白、结尾留白
PUN = set("，。！？、；：“”‘’（）《》,.!?;:()\"' ·…—-%")

S = json.load(open(f"{ROOT}/script/script.json"))
SEG = S["segments"]
args = sys.argv[1:]
only = set(args[args.index("--only") + 1].split(",")) if "--only" in args else None
force, listen = "--force" in args, "--no-listen" not in args

def key(s): return hashlib.md5(json.dumps([s["text"], S["styles"][s["style"]], S["voice"]], ensure_ascii=False).encode()).hexdigest()[:10]
def dur(f):
    with wave.open(f) as w: return w.getnframes() / w.getframerate()

def one(s):
    n, k = s["id"], key(s)
    wav, meta = f"{A}/{n}.wav", f"{A}/{n}.json"
    if not force and os.path.exists(meta) and json.load(open(meta)).get("key") == k and (not only or n not in only):
        return n, None
    subprocess.run([TTS, s["text"], "--voice", S["voice"], "--style", S["styles"][s["style"]], "-o", wav], check=True, capture_output=True)
    w16 = f"{B}/wj/{n}_16k.wav"; os.makedirs(f"{B}/wj", exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-ar", "16000", "-ac", "1", w16], check=True)
    subprocess.run(["whisper", w16, "--model", "small", "--language", "zh", "--word_timestamps", "True",
                    "--output_format", "json", "--output_dir", f"{B}/wj"], check=True, capture_output=True)
    wj = json.load(open(f"{B}/wj/{n}_16k.json"))
    words = [(w["word"], w["start"], w["end"]) for sg in wj["segments"] for w in sg["words"]]
    heard = ""
    if listen:
        q = f"参考稿：{s['text']}\n逐字转写这段中文语音（只输出转写），然后另起一行写：问题：对照参考稿，有没有读错字、多念或漏念、怪异停顿、杂音（没有就写“无”）。"
        heard = subprocess.run([LISTEN, wav, "--ask", q], capture_output=True, text=True).stdout.strip()
    json.dump({"key": k, "dur": dur(wav), "words": words, "listen": heard}, open(meta, "w"), ensure_ascii=False, indent=1)
    return n, heard

todo = [s for s in SEG if not only or s["id"] in only]
with ThreadPoolExecutor(4) as ex:
    for n, r in ex.map(one, todo):
        if r is not None: print(f"===== {n}\n{r}\n", flush=True)

# ---------- 时间轴 ----------
def clean(t): return "".join(c for c in t if c not in PUN and not c.isspace())
def char_times(words, n):
    """whisper 词时间展开成逐字时间，按字符数线性映射到参考稿（whisper 的字数与稿子常有出入）。"""
    ts = []
    for w, a, b in words:
        cs = [c for c in w if c not in PUN and not c.isspace()]
        for i in range(len(cs)): ts.append(a + (b - a) * i / max(len(cs), 1))
    if not ts: return [0.0] * n
    return [ts[min(len(ts) - 1, round(i * len(ts) / n))] for i in range(n)]

def split_lines(text, maxc=13):
    """字幕断行：按标点切成分句；超长分句均分成几段（英文/数字不拆）；相邻短句合并（中间用空格），每行不超过 maxc 个可见字。"""
    import math
    out = []
    for c in [x.strip() for x in re.split(r"[，。！？：；]", text) if x.strip()]:
        n = len(clean(c)); k = math.ceil(n / maxc)
        if k <= 1: out.append(c); continue
        per = math.ceil(n / k); acc, cnt = "", 0
        for t in re.findall(r"[A-Za-z0-9.%]+|\s+|.", c):
            tl = len(clean(t))
            if acc.strip() and cnt + tl > per: out.append(acc.strip()); acc, cnt = "", 0
            acc += t; cnt += tl
        if acc.strip(): out.append(acc.strip())
    lines = []
    for c in out:
        if lines and len(clean(lines[-1])) + len(clean(c)) <= maxc - 1 and min(len(clean(lines[-1])), len(clean(c))) <= 5: lines[-1] += " " + c
        else: lines.append(c)
    return lines

t = LEAD; segs = []; cues = []; pcm = []
import array
SR = 24000
def silence(sec): return array.array("h", [0] * int(round(sec * SR)))
pcm.append(silence(LEAD))
for s in SEG:
    m = json.load(open(f"{A}/{s['id']}.json"))
    if s["gap"]:
        t += s["gap"]; pcm.append(silence(s["gap"]))
    c = clean(s["text"]); ct = char_times(m["words"], len(c))
    segs.append({"id": s["id"], "scene": s["scene"], "start": round(t, 3), "dur": round(m["dur"], 3), "text": s["text"], "clean": c,
                 "ct": [round(x, 3) for x in ct]})
    lines = s.get("subs") or split_lines(s["text"]); k = 0; starts = []
    assert clean("".join(lines)) == c, (s["id"], clean("".join(lines)), c)
    for l in lines:
        wdt = sum(0.55 if re.match(r"[A-Za-z0-9.% ]", ch) else 1 for ch in l)
        if wdt > 15: print("字幕过长", s["id"], l, wdt)
    for l in lines:
        starts.append(t + (ct[min(k, len(ct) - 1)] if k else 0.0)); k += len(clean(l))
    for i, l in enumerate(lines):
        e = starts[i + 1] - 0.04 if i + 1 < len(lines) else t + m["dur"]
        cues.append({"a": round(starts[i], 3), "b": round(e, 3), "text": l})
    with wave.open(f"{A}/{s['id']}.wav") as w:
        assert w.getframerate() == SR
        pcm.append(array.array("h", w.readframes(w.getnframes())))
    t += m["dur"]
total = t + TAIL + 2.6                       # 结尾留 2.6 秒落版
pcm.append(silence(TAIL + 2.6))
with wave.open(f"{ROOT}/audio/vo.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    for p in pcm: w.writeframes(p.tobytes())
json.dump({"total": round(total, 3), "segments": segs, "cues": cues}, open(f"{B}/timeline.json", "w"), ensure_ascii=False)
open(f"{B}/timeline.js", "w").write("window.TL=" + json.dumps({"total": round(total, 3), "segments": segs, "cues": cues}, ensure_ascii=False) + ";")
# srt
def ts(x): h, r = divmod(x, 3600); m_, s_ = divmod(r, 60); return f"{int(h):02d}:{int(m_):02d}:{int(s_):02d},{int(round((s_ % 1) * 1000)):03d}"
open(f"{ROOT}/out/subtitles.srt", "w").write("\n".join(f"{i+1}\n{ts(c['a'])} --> {ts(c['b'])}\n{c['text']}\n" for i, c in enumerate(cues)))
print(f"total {total:.2f}s, {len(cues)} cues, {sum(len(s['clean']) for s in segs)} chars")
