#!/usr/bin/env python3
"""把 build/stills/*.jpg 拼成联系表。 usage: python3 tools/sheet.py out.jpg [cols] [w]"""
import glob, os, sys
from PIL import Image, ImageDraw
fs = sorted(glob.glob("build/stills/t*.jpg"), key=lambda f: float(os.path.basename(f)[1:-4]))
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 6; w = int(sys.argv[3]) if len(sys.argv) > 3 else 270; h = w * 16 // 9
rows = (len(fs) + cols - 1) // cols
sh = Image.new("RGB", (cols * w, rows * (h + 20)), "white"); d = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    x, y = (i % cols) * w, (i // cols) * (h + 20)
    sh.paste(Image.open(f).resize((w, h)), (x, y + 20)); d.text((x + 4, y + 4), os.path.basename(f), fill="black")
sh.save(sys.argv[1], quality=85)
