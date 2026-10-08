#!/usr/bin/env python3
"""请 Gemini 听一段音频并给出乐评/问题清单。 usage: python3 tools/listen.py <audio> <question-file|-> [model]"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
src, qf = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "gemini-3.1-pro-preview"
q = sys.stdin.read() if qf == "-" else open(qf).read()
tmp = tempfile.mktemp(suffix=".mp3")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "2", "-b:a", "160k", tmp], check=True)
body = {"contents": [{"role": "user", "parts": [{"inline_data": {"mime_type": "audio/mp3", "data": base64.b64encode(open(tmp, "rb").read()).decode()}}, {"text": q}]}]}
req = urllib.request.Request(f"https://aihubmix.com/gemini/v1beta/models/{model}:generateContent", json.dumps(body).encode(),
                             {"x-goog-api-key": os.environ["AIHUBMIX_AP_KEY"], "Content-Type": "application/json"})
for a in range(4):
    try: r = json.load(urllib.request.urlopen(req, timeout=600)); break
    except Exception as e: print("retry", e, file=sys.stderr); time.sleep(5)
print("".join(p.get("text", "") for p in r["candidates"][0]["content"]["parts"]))
