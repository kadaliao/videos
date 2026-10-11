# 场景编写约定

每种风格一个文件：`src/scenes/NN-key.js`（编号与 key 见 `src/timeline.js`）。文件不存在时会画占位卡。

```js
registerScene({
  n: 3, key: 'flat', zh: '扁平矢量', en: 'Flat Vector',
  bg: '#1f4fff',        // 主背景色（转场会用到）
  accent: '#ff5a4e',    // 主强调色（转场会用到）
  init: async (S) => {},            // 可选：一次性预计算（纹理、路径、WebGL 程序）
  draw(ctx, t, S) { ... },          // 画一帧
});
```

## 画布与时间

- `ctx` 是 1080×1920 的 Canvas 2D。整幅都要画满（先铺背景），不能依赖上一帧的内容。
- `t` 是场景本地时间（秒）。每段 4 秒 = 2 小节，120 BPM：拍点在 t = 0, 0.5, 1.0 …，小节强拍在 t = 0 和 t = 2。
- 进场转场期间 t 会从 -0.4 开始，出场转场会画到 t = 4.4。t ≤ 0 时画面必须已经有东西（至少背景 + 场景基本形），不能是空白；3.6–4.4 保持一个好看的完整画面。
- 场景还会被缩成 216×384 的小格出现在片头、章节卡和片尾宫格里，此时 t 在 1.2–3.8 之间循环取值。所以 1.2–3.8 之间每一帧都要是"完整好看"的。
- **纯函数**：同一个 t 必须画出同一帧（多个浏览器并行、乱序逐帧渲染）。不准用 `Math.random()`、`Date`、`performance.now()`，不准在帧之间累积状态。随机用 `S.hash(n)` / `S.hash2(a,b)` / `S.rng(seed)`（每帧重新建）。粒子之类要么写成 t 的解析函数，要么每帧从 t0 固定步长积分到 t。可以缓存与 t 无关的预计算结果（纹理、静态路径）。
- 不要对主 `ctx` 用 `getImageData` / `putImageData` / `setTransform` / `resetTransform`（场景可能被套在变换里画）。像素处理在自己的离屏层（`S.layer(key, w, h)`）里做，再 `drawImage` 回来。layer key 加上场景前缀（例如 `'s03-dots'`）避免和别的场景冲突。
- WebGL 可用（SwiftShader 软件渲染）：自己建 canvas，`getContext('webgl2', { preserveDrawingBuffer: true })`，分辨率不超过 540×960，渲染完 `ctx.drawImage(glCanvas, 0, 0, 1080, 1920)`。
- 性能：每帧尽量 < 250 ms（`--sheet` 会打印平均耗时）。渲染器用软件 2D 画布（`--disable-accelerated-2d-canvas`），离屏层之间 drawImage 很便宜。

## 安全区与标题

- 抖音界面会盖住底部约 380px 和右侧图标列。重要内容放在 x 70–940、y 180–1540 之内；背景、装饰可以出血到边。
- 每个场景都要用**本风格自己的字体语言**显示：两位编号（如 `03`）、中文风格名（`zh`）、英文名（`en`）。标题要大，缩成小格也能认出来。t ≈ 0–0.6 内入场，之后一直可见。
- 中文必须以字面量写在源码里（字体会按源码里出现的汉字子集化）。

## 可用字体（`ctx.font = S.F(size, family, weight)`）

中文：`NotoSansSC`（黑体 900）、`NotoSansSCM`（黑体 500）、`NotoSerifSC`（宋体 900）、`ZCOOLKuaiLe`（圆萌）、`ZCOOLQingKe`（黄油体，粗圆）、`MaShanZheng`（毛笔楷书）。
西文：`PressStart2P`、`VT323`、`BebasNeue`、`ArchivoBlack`、`SpaceGrotesk`(700)、`InterXB`(800)、`Inter`、`JetBrainsMono`、`Orbitron`(800)、`Monoton`、`Bangers`、`Caveat`(700)、`SpecialElite`、`PlayfairBI`（意大利黑体衬线）、`RubikMonoOne`、`Bungee`、`Pacifico`、`InstrumentSerif`（斜体）。
西文字体里没有的汉字会回落到 NotoSansSC。

## 工具（`S`，见 `src/core.js`）

`W, H, BEAT(0.5), BAR(2)`，`clamp, lerp, seg(t,a,b), smooth, fract`，缓动 `S.E.*`（`out3, inOut3, outBack(k,s), outElastic, outBounce, outExpo, inOutExpo, sine…`）、`spring(k)`，随机 `hash, hash2, rng`，噪声 `noise2, noise3, fbm`，`layer(key,w,h)`，`grain(ctx, amount, seed, mode, scale)`，`pulse(t, decay)`（每拍衰减脉冲）、`beatIndex(t)`，`F(size, family, weight)`，`rr(ctx,x,y,w,h,r)`（圆角路径）、`chars(ctx,text,x,align,spacing)`（逐字排版）、`hex('#rrggbb', a)`、`TAU`。

## 自查

```bash
node render.mjs --scene 3 --sheet                 # build/stills/s03/sheet.jpg：t = -0.2…4.0 每 0.3 秒一格
node render.mjs --scene 3 --times 0,1.3,2.6,3.9   # build/stills/s03/t*.jpg：原尺寸静帧
```
