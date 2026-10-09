# 山坡羊 · 外卖骑手

![封面](cover.png)

竖屏 9:16 的水墨动画短片，58 秒，为网友的元曲小令《山坡羊·外卖骑手》而作：

> 黄衣黄帽，天黑天晓，寻常雨雪寻常道。过商超，望楼高，拿完预制拿烧烤。人间风月知多少。停，活不了；活，停不了。

整部片子是一幅一直在展开的长卷：几幅横卷全景接成一条路，在雾里一幅融进下一幅；骑手在路上一直骑，镜头跟着他平移、仰俯、推拉。全片只有墨色，唯一的颜色是骑手身上的藤黄；结尾两方朱印、朱笔圈点。配乐是 100 BPM 的国风电子，诗句踩着鼓点一字一字洇出来。**所有运动都由 JS（Canvas 2D）按时间逐帧绘制，没有使用任何视频生成模型。**

| 文件 | 说明 |
|---|---|
| [`shanpoyang-waimai_1080p30.mp4`](shanpoyang-waimai_1080p30.mp4) | 成片（第三版）：1080×1920 · 30fps，43 MB，-14 LUFS，诗句已烧录 |
| [`cover.png`](cover.png) | 竖版封面 |

## 分镜

一小节 2.4 秒，时间轴写在 [`edit.json`](edit.json)，画面和配乐都读它。

| 时间 | 诗句 | 画面（全部代码驱动） | 音乐 |
|---|---|---|---|
| 0:00 | 山坡羊 · 外卖骑手 | 一滴墨落下，题目砸出来，钤印；长卷从墨里洇出 | 古筝刮奏、反向镲 |
| 0:02 | 黄衣黄帽 / 天黑 | 骑手沿城市山水疾驰；天被墨色淹没，月亮升起，楼里一扇扇窗亮起来、闪着 | 鼓点、808、古筝 riff |
| 0:07 | 天晓 | 夜色褪去，淡淡的日头升起又隐去 | |
| 0:11 | 寻常雨雪 | 雾里一转，进了雨街：雨在下，路面有骑手的倒影 | 跳弓大提琴加入 |
| 0:16 | 寻常道 | 雪夜：雪片飘落，身后一道车辙 | |
| 0:20 | 过商超 | 掠过发光的超市橱窗，刹车，车头一沉，停下 | 军鼓滚奏集结 |
| 0:24 | 望楼高 | 他抬头；镜头沿高楼一路仰摇进云里 | 第一次 drop：长笛 + 小提琴主旋律 |
| 0:29 | 拿完预制拿烧烤 | 从烟云里落下到烧烤夜市；他骑进来停在摊前，外卖袋一个、两个挂上车把，最后一袋插着烤串摞上箱子，再骑走 | |
| 0:34 | 人间风月知多少 | 镜头随烟升起，云开处一轮满月，家家窗里在吃饭；再落回路上，他提着一车袋子骑过 | 旋律到最高点，长音弦乐 |
| 0:38 | — | 下起雨，他慢下来、停下，坐在路边看手机 | 军鼓一路滚到三十二分音符 |
| 0:43 | 停，活不了； | **定格**：雨停在半空，藤黄褪成灰 | **全曲连混响一刀切断**，只剩一声古筝从 F 落回 D |
| 0:46 | 活，停不了 | 雨夜里他重新上路，越骑越快，速度线掠过，没入长路尽头的雾 | 第二次 drop |
| 0:50 | 全诗 | 收成一幅手卷，朱笔圈点末句，钤印 | 古筝独自淡出；“叮咚”，新订单，小小的骑手又从卷底骑过 |

## 画面

- **素材**（静态画，Gemini 3 Pro Image 经 aihubmix 生成）：6 幅 21:9 横卷全景（城市山水、雨街、雪夜、超市、烧烤夜市、月夜楼群，[`art3/jpg/`](art3/jpg/)）、一张骑行像（[`art3/png/S1_ride.png`](art3/png/S1_ride.png)），以及第一版的三幅竖幅画（高楼、路边、长路，[`art/jpg/`](art/jpg/)）作插入镜头。提示词在 [`art3/p/`](art3/p/)、[`art/p/`](art/p/)。
- **骑行像**：[`tools/prep3.py`](tools/prep3.py) 先做平场校正，再从白底反解出带透明度的墨色，骑手可以叠在夜景上而不被压黑；前轮单独切出来按里程转动。
- **[`film3.html`](film3.html)** 里用代码画出的东西：长卷平移与仰俯推拉、全景之间的雾中交融、骑手的颠簸 / 刹车前倾 / 高速墨影拖尾 / 地上影子 / 雨夜倒影 / 雪地车辙、外卖袋一个个挂上车并随车晃动、昼夜墨色洗染与闪烁的窗、月亮与日头、雨、雪、烧烤烟、雾、速度线、“停”的定格褪色、竖排诗句的洇墨效果、印章与圈点、鼓点上的轻推。
- 字体：霞鹜文楷、马善政楷书（SIL OFL），子集化入库。

## 配乐

[`music2.py`](music2.py) 读同一张剪辑表逐小节编排：古筝（Freesound CC0 录音里自动切出的单音与刮奏，定弦恰好是 D 羽调）、VSCO-2 CE（CC0）的跳弓弦乐 / 长音弦乐 / 长笛 / 低音提琴为真实采样；底鼓、拍手、镲、808 低音、超级锯齿铺底、上升音效、冲击为合成。低音、铺底、弦乐、古筝跟着底鼓侧链“呼吸”；混响用利物浦爱乐音乐厅的脉冲响应（CC0）。音效为 Freesound CC0 实录（雨、风雪、烧烤、水滴、印章），“叮咚”为合成。

| 素材 | 来源 | 授权 |
|---|---|---|
| 古筝录音 | [Pufermufin – LOVELY CHINESE GUZHENG PLUCKED](https://freesound.org/people/Pufermufin/sounds/396868/) | CC0 |
| 管弦乐采样 | [VSCO-2 CE](https://github.com/sgossner/VSCO-2-CE) | CC0 |
| 音乐厅脉冲响应 | [johnnyguitar01 – IR Liverpool Philharmonic Hall](https://freesound.org/people/johnnyguitar01/sounds/423866/) | CC0 |
| 城市雨声 / 小雨 | [roofusj](https://freesound.org/people/roofusj/sounds/217236/) / [ragamuffin](https://freesound.org/people/ragamuffin/sounds/197213/) | CC0 |
| 风雪 / 烧烤 / 水滴 / 印章 | [itinerantmonk108](https://freesound.org/people/itinerantmonk108/sounds/617560/) / [bengomori](https://freesound.org/people/bengomori/sounds/381715/) / [paespedro](https://freesound.org/people/paespedro/sounds/174718/) / [kermite607](https://freesound.org/people/kermite607/sounds/362624/) | CC0 |

## 重新渲染

依赖：Node 20+、Python 3、ffmpeg、uv（临时装 numpy / scipy）。

```bash
npm ci
tools/fetch_samples.sh                                               # 采样 → ~/samples（SAMPLES 可改位置）
uv run --with numpy --with scipy python tools/build_samples.py       # 切古筝、整理 VSCO → build/samples/
uv run --with numpy --with scipy python music2.py                    # 配乐 → build/music2.wav
node render.mjs --page film3.html --stills 6,32,44                   # 静帧预览 → build/stills/
node render.mjs --page film3.html --out build/video3.mp4             # 逐帧渲染
python3 mix.py v3                                                    # 合成 + 响度归一 → out/shanpoyang-waimai_v3_1080p30.mp4
```

- 改节奏、段落长短、字出现的时刻，改 `edit.json`（单位：小节）；镜头和骑手的运动关键帧在 `film3.html` 的 `VEL_A` / `CAM_B` / `RID_B` / `CAM_C` / `RID_C`。
- 重画素材：`tools/paint3.sh`（需要 `AIHUBMIX_AP_KEY`），然后 `python3 tools/prep3.py`。
- `tools/listen.py`：混音时把音频交给 Gemini 听，按时间点指出平衡、错音和转场问题。

## 历史版本

- 第一版（2:08，静态水墨画 + 镜头推移，古筝室内乐）：`index.html`、`music.py`、`timeline.json`。
- 第二版（0:58，图生视频串联镜头）：`film.html`、`clips/`、`tools/animate*.py|sh`。按要求改为纯 JS 绘制后不再使用，留作记录。
