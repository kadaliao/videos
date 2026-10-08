#!/usr/bin/env python3
"""art/*.png（Gemini 原图）→ art/jpg/*.jpg（渲染用）；骑手小像与墨滴做平场校正（纸色→纯白，便于正片叠底）。"""
import glob, os
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(f"{ROOT}/art/jpg", exist_ok=True)
for f in sorted(glob.glob(f"{ROOT}/art/[A-P]_*.png")):   # Q_drop / R_rider 单独处理
    n = os.path.basename(f)[:-4]
    Image.open(f).convert("RGB").save(f"{ROOT}/art/jpg/{n}.jpg", quality=90, optimize=True)
    print(n)
im = Image.open(f"{ROOT}/art/R_rider.png").convert("RGB")
a = np.asarray(im).astype(np.float32)
paper = np.asarray(im.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(40))).astype(np.float32)
flat = np.clip(a / np.maximum(paper, 1) * 255, 0, 255)
ink = (255 - flat.min(2)) > 60
ys, xs = np.where(ink); pad = 30
box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(a.shape[1], xs.max() + pad), min(a.shape[0], ys.max() + pad))
Image.fromarray(flat.astype(np.uint8)).crop(box).save(f"{ROOT}/art/jpg/rider.png", optimize=True)
print("rider", box)
im = Image.open(f"{ROOT}/art/Q_drop.png").convert("RGB")
a = np.asarray(im).astype(np.float32)
paper = np.asarray(im.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(60))).astype(np.float32)
flat = np.clip(a / np.maximum(paper, 1) * 255, 0, 255).mean(2)
Image.fromarray(flat.astype(np.uint8)).convert("RGB").save(f"{ROOT}/art/jpg/drop.jpg", quality=92)
print("drop")
