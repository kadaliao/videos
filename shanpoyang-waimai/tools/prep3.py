#!/usr/bin/env python3
"""第三版素材整理：
- 横卷全景 / 高楼：art3/raw/P*.png → art3/jpg/P*.jpg（原尺寸，JPEG）
- 骑手姿态：art3/raw/S*.png → art3/png/S*.png。先做平场校正（纸色→纯白），再“从白底反解”出带透明度的墨色：
  白纸处全透明，淡墨处半透明的黑，藤黄处不透明 —— 这样骑手可以正常叠在任何底色上（包括夜景），不会像正片叠底那样被压黑。
- 各姿态的尺寸、着地线，以及骑行像的车轮位置写进 art3/png/rig.json，供 film3.html 单独转动前轮。"""
import glob, json, os
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(f"{ROOT}/art3/jpg", exist_ok=True); os.makedirs(f"{ROOT}/art3/png", exist_ok=True)

for f in sorted(glob.glob(f"{ROOT}/art3/raw/P*.png")):
    n = os.path.basename(f)[:-4]
    if n.endswith("_shanghai"): continue
    Image.open(f).convert("RGB").save(f"{ROOT}/art3/jpg/{n}.jpg", quality=88, optimize=True)
    print(n)

rig = {}
for f in sorted(glob.glob(f"{ROOT}/art3/raw/S*.png")):
    n = os.path.basename(f)[:-4]
    im = Image.open(f).convert("RGB")
    a = np.asarray(im).astype(np.float32) / 255
    paper = np.asarray(im.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(60))).astype(np.float32) / 255
    flat = np.clip(a / np.maximum(paper, 1e-3), 0, 1)
    # 透明度：墨的深度与颜色饱和度取大者
    dark = 1 - flat.min(2); sat = flat.max(2) - flat.min(2)
    alpha = np.clip(np.maximum((dark - .04) * 1.25, sat * 3.0), 0, 1)
    alpha[alpha < .03] = 0
    # 从白底反解颜色：flat = a*c + (1-a)*1  →  c = (flat - (1-a)) / a
    c = np.where(alpha[..., None] > 1e-3, (flat - (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3), 0)
    rgba = np.dstack([np.clip(c, 0, 1), alpha])
    ys, xs = np.where(alpha > .15); pad = 24
    x0, y0, x1, y1 = max(0, xs.min() - pad), max(0, ys.min() - pad), min(a.shape[1], xs.max() + pad), min(a.shape[0], ys.max() + pad)
    out = (rgba[y0:y1, x0:x1] * 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(f"{ROOT}/art3/png/{n}.png", optimize=True)
    # 着地线：最下面一行有墨的位置（车轮底 / 脚底）
    al = out[..., 3] > 60; rows = np.where(al.any(1))[0]
    rig[n] = {"w": int(x1 - x0), "h": int(y1 - y0), "ground": int(rows.max())}
    print(n, rig[n])

# 骑行像的车轮与着地线：自动检测不可靠（后轮被排气管挡住），按图手工标定（像素坐标对应裁切后的 S1_ride.png）
if "S1_ride" in rig:
    rig["S1_ride"].update({"ground": 1606, "wheels": [{"x": 490, "y": 1450, "r": 160, "spin": True}, {"x": 1384, "y": 1450, "r": 150, "spin": False}]})
json.dump(rig, open(f"{ROOT}/art3/png/rig.json", "w"), indent=1)
