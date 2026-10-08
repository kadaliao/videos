#!/usr/bin/env bash
# 下载配乐与音效用到的外部采样（全部 CC0）到 ~/samples（可用 SAMPLES 环境变量改位置）。
#  - VSCO-2 Community Edition（Versilian Studios，CC0）：只稀疏检出用到的目录，约 1.6 GB
#  - Freesound CC0：古筝录音、雨、风雪、烧烤、水滴、印章、利物浦爱乐音乐厅脉冲响应
set -euo pipefail
S=${SAMPLES:-$HOME/samples}; mkdir -p "$S/freesound"
if [ ! -d "$S/VSCO-2-CE/.git" ]; then
  git clone -q --filter=blob:none --no-checkout --depth 1 https://github.com/sgossner/VSCO-2-CE.git "$S/VSCO-2-CE"
fi
cd "$S/VSCO-2-CE"
git sparse-checkout init --no-cone
git sparse-checkout set "Keys/Upright Piano/*" "Strings/Cello Section/susvib/*" "Strings/Viola Section/susvib/*" "Strings/Violin Section/susVib/*" \
  "Strings/Solo Contrabass/SusVib/*" "Strings/Harp/*" "Woodwinds/Flute/susvib/*" "Woodwinds/Flute/expvib/*" "Percussion/Timpani/*" \
  "VSCO 1 Percussion/varMetal/Gong/*" "VSCO 1 Percussion/drums/bass/*" "Readme.txt"
git checkout -q
cd "$S/freesound"
# 文件名 <- Freesound 页面（作者/sounds/编号），均为 CC0 1.0
while read -r name page; do
  [ -s "$name.mp3" ] && continue
  url=$(curl -fsSL -A "Mozilla/5.0" "https://freesound.org/people/$page/" | grep -oE 'https://cdn.freesound.org/previews/[0-9]+/[0-9_]+-hq\.mp3' | head -1)
  curl -fsSL -o "$name.mp3" "$url"; echo "$name <- $page"
done <<'EOF'
396868 Pufermufin/sounds/396868
847157 nanliu_music/sounds/847157
rain_city roofusj/sounds/217236
rain_light ragamuffin/sounds/197213
snow_wind itinerantmonk108/sounds/617560
sizzle bengomori/sounds/381715
drop paespedro/sounds/174718
stamp kermite607/sounds/362624
ir_liverpool johnnyguitar01/sounds/423866
EOF
ls -la "$S/freesound"
