#!/usr/bin/env python3
"""用 Gemini 3 Pro Image（aihubmix 中转）生成水墨画面。
usage: python3 tools/paint.py <out.png> <prompt-file|-> [aspect=9:16] [size=2K] [ref.png ...]"""
import base64, json, os, sys, urllib.request
out, pf = sys.argv[1], sys.argv[2]
aspect = sys.argv[3] if len(sys.argv) > 3 else "9:16"
size = sys.argv[4] if len(sys.argv) > 4 else "2K"
refs = sys.argv[5:]
prompt = sys.stdin.read() if pf == "-" else open(pf).read()
def ref_jpeg(p):  # 参考图缩到 1280px JPEG 再上传，原图 base64 太大容易被中途断开
    import io
    from PIL import Image
    im = Image.open(p).convert("RGB"); im.thumbnail((1280, 1280)); b = io.BytesIO(); im.save(b, "JPEG", quality=90)
    return base64.b64encode(b.getvalue()).decode()
parts = [{"text": prompt}] + [{"inline_data": {"mime_type": "image/jpeg", "data": ref_jpeg(r)}} for r in refs]
body = {"contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"], "imageConfig": {"aspectRatio": aspect, "imageSize": size}}}
model = os.environ.get("PAINT_MODEL", "gemini-3-pro-image-preview")
req = urllib.request.Request(f"https://aihubmix.com/gemini/v1beta/models/{model}:generateContent", json.dumps(body).encode(),
                             {"x-goog-api-key": os.environ["AIHUBMIX_AP_KEY"], "Content-Type": "application/json"})
import time
for attempt in range(5):
    try: r = json.load(urllib.request.urlopen(req, timeout=300)); break
    except Exception as e:
        print("retry", attempt, e, file=sys.stderr); time.sleep(5 * (attempt + 1))
else: sys.exit(1)
n = 0
for c in r.get("candidates", []):
    for p in c.get("content", {}).get("parts", []):
        d = p.get("inline_data") or p.get("inlineData")
        if d:
            open(out, "wb").write(base64.b64decode(d["data"])); n += 1; print("saved", out)
        elif "text" in p: print("text:", p["text"][:300])
if not n: print(json.dumps(r)[:1500]); sys.exit(1)
