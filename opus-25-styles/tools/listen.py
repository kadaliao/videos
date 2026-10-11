#!/usr/bin/env python3
"""请多模态模型听一段音频并给出问题清单（aihubmix，OpenAI 兼容接口）。
usage: python3 tools/listen.py <audio> <question-file|-> [model] [--from 秒 --to 秒]"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
a = sys.argv[1:]; ss = a[a.index('--from') + 1] if '--from' in a else None; to = a[a.index('--to') + 1] if '--to' in a else None
pos = [x for i, x in enumerate(a) if not x.startswith('--') and (i == 0 or not a[i - 1].startswith('--'))]
src, qf = pos[0], pos[1]; model = pos[2] if len(pos) > 2 else "qwen3.8-omni-flash"
q = sys.stdin.read() if qf == "-" else open(qf).read()
tmp = tempfile.mktemp(suffix=".mp3")
cut = (["-ss", ss] if ss else []) + (["-to", to] if to else [])
subprocess.run(["ffmpeg", "-v", "error", "-y", *cut, "-i", src, "-ac", "2", "-b:a", "128k", tmp], check=True)
body = {"model": model, "stream": True, "modalities": ["text"], "messages": [{"role": "user", "content": [
    {"type": "input_audio", "input_audio": {"data": "data:;base64," + base64.b64encode(open(tmp, "rb").read()).decode(), "format": "mp3"}},
    {"type": "text", "text": q}]}]}
req = urllib.request.Request("https://aihubmix.com/v1/chat/completions", json.dumps(body).encode(),
                             {"Authorization": "Bearer " + os.environ["AIHUBMIX_AP_KEY"], "Content-Type": "application/json"})
for k in range(4):
    try:
        out = []
        with urllib.request.urlopen(req, timeout=600) as r:
            for line in r:
                line = line.decode().strip()
                if line.startswith("data:") and line != "data: [DONE]":
                    d = json.loads(line[5:]); out += [c["delta"].get("content") or "" for c in d.get("choices", []) if "delta" in c]
        print("".join(out)); break
    except urllib.error.HTTPError as e: print("retry", e, e.read()[:300], file=sys.stderr); time.sleep(5)
    except Exception as e: print("retry", e, file=sys.stderr); time.sleep(5)
