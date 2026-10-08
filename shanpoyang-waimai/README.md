# 山坡羊 · 外卖骑手

![封面](cover.png)

竖屏 9:16 的水墨短片，2 分 08 秒，为网友的元曲小令《山坡羊·外卖骑手》而作：

> 黄衣黄帽，天黑天晓，寻常雨雪寻常道。过商超，望楼高，拿完预制拿烧烤。人间风月知多少。停，活不了；活，停不了。

全片只有墨色，唯一的颜色是骑手身上的藤黄（中国画里的传统黄色颜料），结尾加两方朱印和朱笔圈点。没有旁白，诗句以竖排一字一字洇出来。

| 文件 | 说明 |
|---|---|
| [`shanpoyang-waimai_1080p30.mp4`](shanpoyang-waimai_1080p30.mp4) | 1080×1920 · 30fps，56 MB，-16 LUFS，诗句已烧录 |
| [`cover.png`](cover.png) | 竖版封面 |

## 分镜

| 时间 | 小节 | 诗句 | 画面 | 音乐 |
|---|---|---|---|---|
| 0:00 | 0–4 | 题目 | 一滴墨落在宣纸上洇开，“山坡羊”三字写出，钤“网友”印 | 远处一声极轻的锣，古琴泛音，古筝按滑 |
| 0:13 | 4–8 | 黄衣黄帽 | 城市画成山水：高楼如峰，没入云雾，路上一点藤黄 | 一段古筝刮奏，八分音符固定音型开始转动 |
| 0:27 | 8–12 | 天黑天晓 | 同一幅画入夜（墨色压暗，月亮留白），再到黎明 | 弦乐进入，夜里只留低声部 |
| 0:40 | 12–16 | 寻常雨雪寻常道 | 雨街（画面里的雨在下）→ 雪夜（雪片飘落） | 钢琴落在雨里，竖琴像雪 |
| 0:53 | 16–20 | 过商超，望楼高 | 夜里发光的超市橱窗；从楼脚的骑手一路仰摇到云里 | 长笛（低音区，代箫）唱出主题 |
| 1:07 | 20–24 | 拿完预制拿烧烤 | 烧烤摊，烟雾升腾，骑手两手提满外卖袋 | 极轻的大鼓推动，第二把古筝叠上 |
| 1:20 | 24–27¾ | 人间风月知多少 | 一轮满月，楼里每扇亮着的窗后是一家人在吃饭 | 高潮：弦乐、长笛、古筝八度，定音鼓滚奏渐强 |
| 1:32 | 27¾–28 | — | 雨夜，骑手一个人坐在路边看手机 | 继续渐强…… |
| 1:33 | 28 | 停，活不了； | **一切冻结**：雨停在半空，镜头不动，藤黄褪成灰 | **戛然而止**，终止和弦没来；一声古筝下滑音像叹息 |
| 1:40 | 30 | 活，停不了 | 雨重新落下，黄色回来 | 固定音型独自重新开始 |
| 1:43 | 31–33 | — | 一条长路没入雾里，骑手越来越小 | 古琴泛音再现主题，音型渐弱但不停 |
| 1:50 | 33–38 | 全诗 | 收成一幅手卷：题目、作者、五行诗，朱笔圈点末句，钤印 | 余音；最后一声“叮咚”（新订单），小小的骑手又从卷底骑过 |

## 画面

- 13 幅水墨画由 Gemini 3 Pro Image（经 aihubmix 中转）生成，2K 竖幅。提示词在 [`art/style.txt`](art/style.txt)（统一风格：写意水墨、宣纸、留白，**全图只许骑手身上出现藤黄**）和 [`art/p/`](art/p/)；除第一张外都以“城市山水”那张为风格参考图，让整卷画出自同一支笔。入库的是 [`art/jpg/`](art/jpg/)。
- 镜头运动、墨晕转场（低频噪声遮罩）、会动的雨与雪、烧烤烟、薄雾、竖排文字的洇墨效果、印章、圈点都在 [`index.html`](index.html) 里用 Canvas 2D 绘制，画面只由时间 t 决定。
- “停”的两小节里画面时钟冻结：雨滴停在半空，镜头不动，同时用灰度图覆盖，把骑手的黄色抽走；“活”字出现时一切恢复。
- 字体：霞鹜文楷（SIL OFL）、马善政楷书（SIL OFL），只保留片中用到的字，子集化后入库。

## 配乐

全部在 [`music.py`](music.py) 里按 [`timeline.json`](timeline.json) 的小节逐拍编排，和画面共用同一条时间轴（72 BPM，一小节 = 10/3 秒）。D 羽调式（D F G A C），刚好就是那段古筝录音的定弦。

- **古筝**（真实录音）：从一段 24 分钟的 CC0 古筝录音里，用谱通量检测起音、谐波积谱测音高，自动切出 G2–D5 的 14 个单音和一段刮奏。按音、吟揉、下滑用变速重采样做在真实采样上。贯穿全曲的八分音符固定音型就是“停不了”的车轮。
- **VSCO-2 Community Edition**（Versilian Studios，CC0）：大提琴 / 中提琴 / 小提琴组长音揉弦、低音提琴、长笛（低音区，代箫）、立式钢琴、竖琴、定音鼓滚奏、锣、大鼓。每条采样的音高都从音频里实测校准。
- **古琴泛音**：正弦合成叠一层很轻的竖琴拨弦作起音。
- **混响**：利物浦爱乐音乐厅的脉冲响应（CC0）卷积，加一条平滑的合成长尾。
- **“停”**：第 28 小节所有乐器的干声一刀切断，正好截掉高潮期待的那个终止和弦；音乐厅余响自然散尽，然后只剩一声古筝从 F 慢慢落回 D。第 30 小节固定音型独自重新开始，不再解决，渐弱到底。
- **音效**（Freesound，CC0 真实录音）：城市雨声、小雨、风雪、烧烤滋滋声、水滴、印章；“叮咚”提示音为合成。

| 素材 | 来源 | 授权 |
|---|---|---|
| 古筝录音 | [Pufermufin – LOVELY CHINESE GUZHENG PLUCKED](https://freesound.org/people/Pufermufin/sounds/396868/) | CC0 |
| 管弦乐采样 | [VSCO-2 CE](https://github.com/sgossner/VSCO-2-CE) | CC0 |
| 音乐厅脉冲响应 | [johnnyguitar01 – IR Liverpool Philharmonic Hall](https://freesound.org/people/johnnyguitar01/sounds/423866/) | CC0 |
| 城市雨声 / 小雨 | [roofusj](https://freesound.org/people/roofusj/sounds/217236/) / [ragamuffin](https://freesound.org/people/ragamuffin/sounds/197213/) | CC0 |
| 风雪 / 烧烤 / 水滴 / 印章 | [itinerantmonk108](https://freesound.org/people/itinerantmonk108/sounds/617560/) / [bengomori](https://freesound.org/people/bengomori/sounds/381715/) / [paespedro](https://freesound.org/people/paespedro/sounds/174718/) / [kermite607](https://freesound.org/people/kermite607/sounds/362624/) | CC0 |

采样不入库，`tools/fetch_samples.sh` 会从上面的地址下载（VSCO 只稀疏检出用到的目录，约 1.6 GB）。

## 重新渲染

依赖：Node 20+、Python 3、ffmpeg、uv（临时装 numpy / scipy）。

```bash
npm ci                                                        # Playwright；渲染用系统里的 Chromium
tools/fetch_samples.sh                                        # 采样 → ~/samples（SAMPLES 可改位置）
uv run --with numpy --with scipy python tools/build_samples.py   # 切古筝、整理 VSCO，实测音高 → build/samples/
uv run --with numpy --with scipy python music.py              # 配乐 + 音效 → build/music.wav
node render.mjs --stills 20,94,120                            # 静帧预览 → build/stills/
node render.mjs                                               # 逐帧渲染 → build/video.mp4
python3 mix.py                                                # 合成 + 响度归一 → out/shanpoyang-waimai_1080p30.mp4
node render.mjs --cover                                       # 封面 → out/cover.png
```

- 用静态服务器打开 `index.html`（如 `npx serve .`），能边听 `build/music.wav` 边拖动预览。
- 改节奏或段落位置只改 `timeline.json`，画面和音乐会一起移动。
- 重画某幅画：删掉 `art/<名>.png`，跑 `tools/paint_all.sh`（需要 `AIHUBMIX_AP_KEY`）。生成有随机性，不会得到同一张。
- `tools/listen.py` 是混音时用的“试听”脚本：把音频交给 Gemini 听，按时间点给出平衡、错音和转场问题。
