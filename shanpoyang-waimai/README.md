# 山坡羊 · 外卖骑手

![封面](cover.png)

竖屏 9:16 的水墨动态短片，58 秒，为网友的元曲小令《山坡羊·外卖骑手》而作：

> 黄衣黄帽，天黑天晓，寻常雨雪寻常道。过商超，望楼高，拿完预制拿烧烤。人间风月知多少。停，活不了；活，停不了。

全片只有墨色，唯一的颜色是骑手身上的藤黄；结尾两方朱印、朱笔圈点。画面是真正在动的水墨：每个镜头从一幅画出发、到下一幅画结束，骑手一路骑过去，把整首诗串成一条路。配乐是 100 BPM 的国风电子，诗句踩着鼓点一字一字洇出来。

| 文件 | 说明 |
|---|---|
| [`shanpoyang-waimai_1080p30.mp4`](shanpoyang-waimai_1080p30.mp4) | 第二版成片：1080×1920 · 30fps，-14 LUFS，诗句已烧录 |
| [`cover.png`](cover.png) | 竖版封面 |

第一版（2 分 08 秒，静态水墨画 + 镜头推移，古筝室内乐）在 git 历史里，源码仍在本目录：`index.html`、`music.py`、`timeline.json`。

## 分镜（第二版）

一小节 2.4 秒。每个镜头 = 一段图生视频，首帧和尾帧分别钉在相邻两幅画上。

| 时间 | 镜头 | 诗句 | 画面里的动作 | 音乐 |
|---|---|---|---|---|
| 0:00 | 片头 | 山坡羊 · 外卖骑手 | 一滴墨落下，题目砸出来，钤印；城市从墨里洇出 | 古筝刮奏、反向镲 |
| 0:02 | c01 | 黄衣黄帽 / 天黑 | 骑手沿山路疾驰，天被墨色淹没，月亮升起 | 鼓点、808、古筝 riff 进入 |
| 0:07 | c02 | 天晓 | 夜色像雾一样褪去，太阳从楼间升起，他没停 | |
| 0:11 | c03 | 寻常雨雪 | 镜头追着他拐进城市街道，雨落下来 | 跳弓大提琴加入 |
| 0:16 | c04 | 寻常道 | 雨变成大雪，他压低身子顶风，雪地上一道车辙 | |
| 0:20 | c05 | 过商超 | 冲出风雪，掠过夜里发光的超市橱窗 | 军鼓滚奏集结、上升音效 |
| 0:24 | c06 | 望楼高 | 停在楼脚抬头，镜头沿高楼一路仰摇进云里 | 第一次 drop：长笛 + 小提琴主旋律 |
| 0:29 | c07 | 拿完预制拿烧烤 | 从云里落进烧烤夜市，他抓起一手外卖袋 | |
| 0:34 | c08 | 人间风月知多少 | 烧烤的烟升起来化成云，云开处一轮满月，家家窗里在吃饭 | 旋律到最高点，长音弦乐 |
| 0:38 | c09 | — | 雨又下了，他停车，坐在湿漉漉的路边看手机 | 军鼓滚到三十二分音符，渐强 |
| 0:43 | 停 | 停，活不了； | **定格**，藤黄褪成灰 | **全曲断掉**，只剩一声古筝从 F 落回 D |
| 0:46 | c10 | 活，停不了 | 他站起来，跨上车，骑进长路尽头的雾里 | 第二次 drop |
| 0:50 | 手卷 | 全诗 | 收成一幅手卷，朱笔圈点末句，钤印 | 鼓退出，古筝独自弹着淡出；“叮咚”，新订单，小小的骑手又从卷底骑过 |

## 画面

- **画作**：13 幅水墨画由 Gemini 3 Pro Image（经 aihubmix）生成，提示词在 [`art/style.txt`](art/style.txt) 和 [`art/p/`](art/p/)，统一要求写意水墨、宣纸、留白、全图只许骑手身上出现藤黄；除第一张外都以“城市山水”为风格参考图。入库的是 [`art/jpg/`](art/jpg/)。
- **动态镜头**：10 段由 Seedance 2.0（经 OpenRouter，1080p 竖幅）图生视频，每段用相邻两幅画作首帧 / 尾帧，提示词在 [`clips/p/`](clips/p/)，脚本 [`tools/animate.py`](tools/animate.py) / [`tools/animate_all.sh`](tools/animate_all.sh)。成片用的视频在 [`clips/`](clips/)。**生成要花钱**（这 10 段约 22 美元），重跑也不会得到同样的镜头，所以入库保存。
- **合成**：[`film.html`](film.html) 按剪辑表 [`edit.json`](edit.json) 把每段视频整段拉伸到对应小节数、上字、做片头片尾和“停”的定格褪色；文字在鼓点上洇出，画面随底鼓轻推。字体为霞鹜文楷、马善政楷书（SIL OFL），子集化入库。

## 配乐

[`music2.py`](music2.py) 读同一张剪辑表，按小节编排：

- **真实采样**：古筝（从 Freesound 一段 CC0 录音里自动切出的单音与刮奏，定弦恰好是 D 羽调）、VSCO-2 CE（CC0）的跳弓弦乐、长音弦乐、长笛、低音提琴。
- **合成**：底鼓、拍手、镲、通鼓、808 低音、超级锯齿铺底、上升音效、冲击、反向镲——电子乐本来就是这样做的。
- **结构**：A 段古筝十六分音符 riff 当钩子 → 集结 → drop（跳弓弦乐 + 长笛和小提琴齐奏主旋律）→ 月亮段到最高点 → 军鼓一路滚到三十二分音符 → **“停”：所有声部连同混响一刀切断**，只剩一声古筝下滑音 → “活”：第二次 drop → 片尾古筝独自淡出，“叮咚”。
- 低音、铺底、弦乐、古筝跟着底鼓侧链“呼吸”；混响用利物浦爱乐音乐厅的脉冲响应（CC0）。
- 音效（Freesound CC0 实录）：城市雨声、风雪、烧烤滋滋声、水滴、印章；“叮咚”为合成。

| 素材 | 来源 | 授权 |
|---|---|---|
| 古筝录音 | [Pufermufin – LOVELY CHINESE GUZHENG PLUCKED](https://freesound.org/people/Pufermufin/sounds/396868/) | CC0 |
| 管弦乐采样 | [VSCO-2 CE](https://github.com/sgossner/VSCO-2-CE) | CC0 |
| 音乐厅脉冲响应 | [johnnyguitar01 – IR Liverpool Philharmonic Hall](https://freesound.org/people/johnnyguitar01/sounds/423866/) | CC0 |
| 城市雨声 / 小雨 | [roofusj](https://freesound.org/people/roofusj/sounds/217236/) / [ragamuffin](https://freesound.org/people/ragamuffin/sounds/197213/) | CC0 |
| 风雪 / 烧烤 / 水滴 / 印章 | [itinerantmonk108](https://freesound.org/people/itinerantmonk108/sounds/617560/) / [bengomori](https://freesound.org/people/bengomori/sounds/381715/) / [paespedro](https://freesound.org/people/paespedro/sounds/174718/) / [kermite607](https://freesound.org/people/kermite607/sounds/362624/) | CC0 |

采样不入库，`tools/fetch_samples.sh` 会下载（VSCO 只稀疏检出用到的目录）。

## 重新渲染（第二版）

依赖：Node 20+、Python 3、ffmpeg、uv（临时装 numpy / scipy）。

```bash
npm ci
tools/fetch_samples.sh                                               # 采样 → ~/samples（SAMPLES 可改位置）
uv run --with numpy --with scipy python tools/build_samples.py       # 切古筝、整理 VSCO → build/samples/
for c in clips/c*.mp4; do n=$(basename $c .mp4); mkdir -p build/v2/$n
  ffmpeg -i $c -vf scale=1080:1920 -q:v 3 build/v2/$n/%04d.jpg; ls build/v2/$n/*.jpg | wc -l > build/v2/$n/count.txt; done
uv run --with numpy --with scipy python music2.py                    # 配乐 → build/music2.wav
node render.mjs --page film.html --stills 6,44,52                    # 静帧预览 → build/stills/
node render.mjs --page film.html --out build/video2.mp4              # 逐帧渲染
python3 mix.py v2                                                    # 合成 + 响度归一 → out/shanpoyang-waimai_v2_1080p30.mp4
```

- 改节奏、镜头长短、字出现的时刻，只改 `edit.json`（单位：小节），画面和音乐一起移动。
- 重新生成某段动态镜头：删掉 `clips/cXX.mp4`，跑 `tools/animate_all.sh`（需要 `OPENROUTER_API_KEY`，会产生费用）。
- `tools/listen.py` 是混音时用的“试听”脚本：把音频交给 Gemini 听，按时间点指出平衡、错音和转场问题。
