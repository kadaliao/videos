#!/usr/bin/env python3
"""水墨画 → 动态镜头（OpenRouter 视频接口，图生视频，可指定首帧/尾帧）。
usage: python3 tools/animate.py <out.mp4> <prompt-file|-> --first a.jpg [--last b.jpg] [--model google/veo-3.1-fast] [--dur 6] [--res 1080p]"""
import argparse, base64, io, json, os, sys, time, urllib.request
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument("out"); ap.add_argument("prompt")
ap.add_argument("--first"); ap.add_argument("--last"); ap.add_argument("--model", default="google/veo-3.1-fast")
ap.add_argument("--dur", type=int, default=6); ap.add_argument("--res", default="1080p"); ap.add_argument("--audio", action="store_true"); ap.add_argument("--job", help="只轮询已提交的任务")
a = ap.parse_args()
prompt = "" if a.job else sys.stdin.read() if a.prompt == "-" else open(a.prompt).read()
KEY = os.environ["OPENROUTER_API_KEY"]; API = "https://openrouter.ai/api/v1/videos"
def data_url(p):
    im = Image.open(p).convert("RGB"); im.thumbnail((1080, 1920)); b = io.BytesIO(); im.save(b, "JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
body = {"model": a.model, "prompt": prompt.strip(), "duration": a.dur, "resolution": a.res, "aspect_ratio": "9:16", "generate_audio": a.audio}
fr = []
if a.first: fr.append({"type": "image_url", "image_url": {"url": data_url(a.first)}, "frame_type": "first_frame"})
if a.last: fr.append({"type": "image_url", "image_url": {"url": data_url(a.last)}, "frame_type": "last_frame"})
if fr: body["frame_images"] = fr
def call(url, data=None):
    req = urllib.request.Request(url, json.dumps(data).encode() if data else None, {"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    for i in range(5):
        try: return urllib.request.urlopen(req, timeout=300).read()
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:800]
            if e.code < 500: sys.exit(f"HTTP {e.code}: {msg}")
            print("retry", e.code, msg[:200], file=sys.stderr)
        except Exception as e: print("retry", e, file=sys.stderr)
        time.sleep(10 * (i + 1))
    sys.exit("failed")
if a.job: jid = a.job
else:
    job = json.loads(call(API, body)); jid = job.get("id") or job.get("job_id"); print("job", jid, job.get("status"), flush=True)
t0 = time.time()
while True:
    time.sleep(15)
    st = json.loads(call(f"{API}/{jid}")); s = st.get("status")
    if s in ("completed", "succeeded", "success"): break
    if s in ("failed", "cancelled", "expired", "error"): sys.exit(f"{s}: {json.dumps(st)[:800]}")
    if time.time() - t0 > 1800: sys.exit("timeout")
url = None
for k in ("unsigned_urls", "urls", "video_urls"):
    if st.get(k): url = st[k][0]
data = urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer " + KEY}), timeout=600).read() if url else call(f"{API}/{jid}/content")
open(a.out, "wb").write(data); print("saved", a.out, len(data), f"{time.time() - t0:.0f}s", json.dumps({k: v for k, v in st.items() if k in ('usage', 'cost')}))
