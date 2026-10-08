#!/usr/bin/env bash
# 用 Gemini 3 Pro Image（aihubmix 中转，需要 AIHUBMIX_AP_KEY）依次生成全部画面，已存在的跳过。
# 提示词 = 风格前缀 art/style.txt + 场景描述 art/p/<名>.txt；除第一张外都以 A_day 为风格参考图，保证同一卷画的笔墨。
# 生成是随机的，重跑不会得到同样的画；成片用的是 art/jpg/ 里入库的版本。
cd "$(dirname "$0")/.."
gen() { local n=$1 ref=$2 asp=${3:-9:16}; [ -s art/$n.png ] && return; echo ">> $n"; (cat art/style.txt; echo; cat art/p/$n.txt) | python3 tools/paint.py art/$n.png - $asp 2K $ref; }
gen A_day
gen B_night art/A_day.png & gen C_dawn art/A_day.png & wait
gen D_rain art/A_day.png & gen F_market art/A_day.png & wait
gen E_snow art/D_rain.png & gen G_tower art/A_day.png & wait
gen H_bbq art/A_day.png & gen I_moon art/A_day.png & wait
gen J_rest art/A_day.png & gen K_road art/A_day.png & wait
gen R_rider "" 1:1
[ -s art/P_paper.png ] || python3 tools/paint.py art/P_paper.png art/p/P_paper.txt 9:16 2K
[ -s art/Q_drop.png ] || python3 tools/paint.py art/Q_drop.png art/p/Q_drop.txt 1:1 2K
python3 tools/prep_art.py
