#!/bin/bash
# 把若干场景各取 3 个时间点拼成一张对比图：tools/review.sh out.jpg 3 7 11 ...
out=$1; shift; cd "$(dirname "$0")/.."
for n in "$@"; do node render.mjs --scene $n --times 0.8,2.3,3.8 2>&1 | grep -iv "404\|willread" | tail -1; done
args=(); i=0; layout=()
for n in "$@"; do nn=$(printf %02d $n); for t in 0.80 2.30 3.80; do args+=(-i build/stills/s$nn/t$t.jpg); layout+=("$(( (i%6)*270 ))_$(( (i/6)*480 ))"); i=$((i+1)); done; done
f=""; for k in $(seq 0 $((i-1))); do f+="[$k]scale=270:480[v$k];"; done; for k in $(seq 0 $((i-1))); do f+="[v$k]"; done
ffmpeg -v error -y "${args[@]}" -filter_complex "${f}xstack=inputs=$i:layout=$(IFS='|'; echo "${layout[*]}"):fill=black" -frames:v 1 "$out"
