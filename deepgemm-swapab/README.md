# 顶级显卡 87.5% 在空转？DeepSeek 把矩阵倒过来乘

![封面](cover.png)

竖屏 9:16 的 AI 硬核科普短片，1 分 54 秒。讲 DeepGEMM 的 swapAB：小批量解码时，Blackwell 的矩阵单元按 128 行发车，一次却只来 16 个 token；用转置公式 Cᵀ = Bᵀ·Aᵀ 让权重坐满 128 行、token 换到可伸缩的方向。画面、字幕和音效全部由代码生成，旁白用 Gemini 3.8 Flash TTS（aihubmix，音色 Charon），没有使用原文配图或生成图片。

根据新智物种的文章改编：[《英伟达顶级芯片被曝闲置87%算力！DeepSeek把矩阵倒过来乘，直接封神》](https://mp.weixin.qq.com/s/JEbRPGyTj0OAf81QCVF1OA)。

| 文件 | 说明 |
|---|---|
| [`deepgemm-swapab_1080p30.mp4`](deepgemm-swapab_1080p30.mp4) | 1080×1920 · 30fps，19 MB，-16 LUFS，字幕已烧录 |
| [`subtitles.srt`](subtitles.srt) | 外挂字幕，59 条，时间轴与画面内字幕一致 |
| [`cover.png`](cover.png) | 竖版封面 |

## 内容

- **开场**：GPU 的 128 条通道只有 16 条在干活，87.5% 空转 → “把矩阵倒过来乘”，A、B 换位
- **GEMM**：输入数据 A × 模型权重 B = 结果 C
- **大巴比喻**：Blackwell 矩阵单元是固定 128 座的大巴；在线聊天一次只来 16 个 token，112 个座位空着
- **swapAB**：Cᵀ = Bᵀ·Aᵀ；常规排法利用率 12.5%，交换后 128 行由权重坐满、token 放到 N=16 方向；算完用硬件转置指令顺路写回显存
- **效果**：B300 上解码阶段矩阵乘最高 1.53 倍；DeepGEMM 核心约 300 行、JIT、H800 上 1550 TFLOPS；DeepGEMM-Ascend 开源，矩阵乘达到硬件极限的 99.8%
- **尾声**：大模型贵不贵，也看底层代码有多懂硬件

## 重新渲染

依赖：Node 20+、Python 3、ffmpeg、whisper（逐字对齐）、uv（混音时临时装 numpy）。

```bash
npm ci && npx playwright install chromium
python3 voice.py                   # 逐段配音 → 时间轴 build/timeline.js、旁白 audio/vo.wav、out/subtitles.srt
node render.mjs --stills 5,40      # 静帧预览 → build/stills/
node render.mjs                    # 6 路并行逐帧渲染（M 系列约 20 秒）→ build/video.mp4
uv run --with numpy python mix.py  # 程序化音效 + 配乐（旁白响起时避让）+ 响度归一 → out/deepgemm-swapab.mp4
node render.mjs --cover            # 封面 → out/cover.png
```

- 旁白在 `script/script.json`：`text` 给 TTS 念，`subs` 是字幕断行（拼起来要和 `text` 去掉标点后逐字一致），`gap` 是段前停顿，`style` 选 `styles` 里的风格描述。
- `audio/vo/` 是配音缓存（wav + whisper 词级时间 + Qwen Omni 听验结果），键是文本、风格和音色的哈希。只有改过的段落才会重新调用 TTS，需要 `AIHUBMIX_API_KEY`，听验需要 `OPENROUTER_API_KEY`（`--no-listen` 跳过）。只改 `subs` 不会重新合成。
- 画面在 `index.html`，只由时间 t 决定。动作用 `at('段id', '关键词')` 对齐到旁白念到该词的时刻。直接用静态服务器打开 `index.html` 就能边听旁白边预览。
- 配乐是 Mixkit「Focus on Yourself」（Eugenio Mininni，[Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree)，可商用、免署名）。这个授权不允许单独再分发曲目，所以文件不入库，`mix.py` 第一次运行时从 Mixkit 官方地址下载到 `audio/bgm/`。

## 数字与口径

- DeepGEMM 在 H800 上最高 1550 TFLOPS：[DeepGEMM README](https://github.com/deepseek-ai/DeepGEMM)，2025-04-18 更新
- DeepGEMM-Ascend 2026-09-30 首发，API 与 DeepGEMM 完全兼容：[DeepGEMM-Ascend README](https://github.com/deepseek-ai/DeepGEMM-Ascend)
- B300 上解码矩阵乘最高 1.53 倍：原文引用的独立开发者实测，片中标注为“文章引用的实测”
- 昇腾上矩阵乘达到硬件极限的 99.8%：原文引用的团队成员推文，片中标注为“团队自测”
- 87.5% 指 16 个 token 的小批量解码中，128 行矩阵乘指令有 112 行空转这一步，不是整张卡闲置；口播说的是“有一步计算，八成以上的通道都在空转”
- DeepGEMM“核心逻辑约 300 行”：DeepSeek 2025 年开源周发布时的说法

后两项数字没有找到可核对的原始数据，按原文转述并在片中注明来源。
