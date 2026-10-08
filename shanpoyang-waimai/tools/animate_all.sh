#!/usr/bin/env bash
# 生成全部串联镜头：每段以一幅画为首帧、下一幅为尾帧，骑手一路骑过去（Seedance 2.0，1080p 竖幅，需要 OPENROUTER_API_KEY）。已存在的跳过。
cd "$(dirname "$0")/.."
MODEL=${MODEL:-bytedance/seedance-2.0}
run() { local n=$1 a=$2 b=$3 d=$4; [ -s clips/$n.mp4 ] && return; python3 tools/animate.py clips/$n.mp4 clips/p/$n.txt --first art/jpg/$a.jpg --last art/jpg/$b.jpg --dur $d --res 1080p --model $MODEL > clips/$n.log 2>&1; echo "$n: $(tail -1 clips/$n.log)"; }
run c01 A_day B_night 6 & run c02 B_night C_dawn 5 & run c03 C_dawn D_rain 6 & run c04 D_rain E_snow 6 & run c05 E_snow F_market 5 &
run c06 F_market G_tower 6 & run c07 G_tower H_bbq 6 & run c08 H_bbq I_moon 6 & run c09 I_moon J_rest 6 & run c10 J_rest K_road 6 &
wait
