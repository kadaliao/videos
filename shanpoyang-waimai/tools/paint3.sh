#!/usr/bin/env bash
# 第三版素材：横卷全景（21:9，4K）、高楼（9:16，4K）、骑手各个姿态（1:1，以骑行像为参考保证同一人）。已存在的跳过。
cd "$(dirname "$0")/.."
pan() { [ -s art3/raw/$1.png ] || (cat art3/style.txt; echo; cat art3/p/$1.txt) | python3 tools/paint.py art3/raw/$1.png - ${2:-21:9} 4K; }
spr() { [ -s art3/raw/$1.png ] || (cat art3/style.txt; echo; cat art3/p/$1.txt) | python3 tools/paint.py art3/raw/$1.png - 1:1 2K art3/raw/S1_ride.png; }
pan P1_city & pan P2_rain & pan P3_snow & wait
pan P4_market & pan P6_bbq & pan P7_moon & wait
pan P8_curb & pan P9_road & pan P5_tower 9:16 & wait
spr S2_lookup & spr S3_bags & wait
spr S4_sit & spr S5_mount & wait
