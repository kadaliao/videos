#!/usr/bin/env python3
"""把 fonts/*.ttf 按源码里出现的字符子集化为 fonts/*-sub.ttf（入库的是子集版）。
用法: uv run --with fonttools python tools/subset.py"""
import glob, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = "".join(open(f, encoding="utf-8").read() for f in glob.glob(f"{ROOT}/src/**/*.js", recursive=True) + [f"{ROOT}/index.html"])
chars = set(text) | set(chr(c) for c in range(0x20, 0x7f)) | set("·—…“”‘’《》「」、，。！？：；（）【】→←↑↓★☆●○■□▲△▶◀♥♪✓✕×÷±°%")
chars = "".join(sorted(c for c in chars if ord(c) >= 0x20))
open(f"{ROOT}/build/charset.txt", "w", encoding="utf-8").write(chars)
for f in sorted(glob.glob(f"{ROOT}/fonts/*.ttf")):
    if f.endswith("-sub.ttf"): continue
    out = f[:-4] + "-sub.ttf"
    subprocess.run([sys.executable, "-m", "fontTools.subset", f, f"--text-file={ROOT}/build/charset.txt", f"--output-file={out}",
                    "--layout-features=*", "--no-hinting", "--desubroutinize"], check=True)
    print(f"{os.path.basename(out)}: {os.path.getsize(f) // 1024} KB → {os.path.getsize(out) // 1024} KB")
