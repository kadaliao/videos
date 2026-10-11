// 公共工具：时间、缓动、确定性随机、噪声、离屏图层、文字。
// 所有场景都是 t 的纯函数：同一个 t 必须画出同一帧（逐帧并行渲染，帧之间不能有状态）。
(function () {
  const W = 1080, H = 1920, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a));           // t 在 [a,b] 内的 0..1 进度
  const smooth = (e0, e1, x) => { const k = clamp((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
  const fract = x => x - Math.floor(x);

  const E = {
    lin: k => k,
    in2: k => k * k, out2: k => 1 - (1 - k) * (1 - k), inOut2: k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
    in3: k => k * k * k, out3: k => 1 - Math.pow(1 - k, 3), inOut3: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
    out4: k => 1 - Math.pow(1 - k, 4), in4: k => k ** 4,
    inOut4: k => k < .5 ? 8 * k ** 4 : 1 - Math.pow(-2 * k + 2, 4) / 2,
    outExpo: k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k), inExpo: k => k <= 0 ? 0 : Math.pow(2, 10 * k - 10),
    inOutExpo: k => k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2,
    outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
    inBack: (k, s = 1.70158) => (s + 1) * k * k * k - s * k * k,
    outElastic: k => k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI) / 3) + 1,
    outBounce: k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; },
    sine: k => -(Math.cos(Math.PI * k) - 1) / 2,
  };
  // 弹簧：0 → 1，带过冲后静止。freq 越大越快，damp 越大越稳。
  const spring = (k, freq = 4.5, damp = 6) => k <= 0 ? 0 : 1 - Math.exp(-damp * k) * Math.cos(freq * 2 * Math.PI * k * 0.5);

  // 确定性随机
  const hash = (n) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
  const hash2 = (a, b) => hash(a * 57.31 + b * 113.97);
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let r = Math.imul(s ^ s >>> 15, 1 | s); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }

  // Perlin 噪声（2D / 3D），输出约 -1..1
  const P = new Uint8Array(512); { const r = rng(1337), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const g3 = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14) ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  function noise3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z), A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    return lerp(lerp(lerp(g3(P[AA], x, y, z), g3(P[BA], x - 1, y, z), u), lerp(g3(P[AB], x, y - 1, z), g3(P[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(g3(P[AA + 1], x, y, z - 1), g3(P[BA + 1], x - 1, y, z - 1), u), lerp(g3(P[AB + 1], x, y - 1, z - 1), g3(P[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
  const noise2 = (x, y) => noise3(x, y, 0.5);
  const fbm = (x, y, z = 0, oct = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2; a *= .5; } return s; };

  // 离屏图层：按 key 缓存，同一 key 复用同一块画布（每次取用前自行 clearRect）。
  const layers = new Map();
  function layer(key, w = W, h = H) {
    let c = layers.get(key);
    if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); layers.set(key, c); }
    // willReadFrequently 让画布留在 CPU 侧：无头 SwiftShader 下以它作 drawImage 源快约 100 倍
    return c;
  }
  // 预生成的颗粒噪声纹理（512×512，灰度，alpha 通道为强度），用来叠纸纹、胶片颗粒。
  let grainTex = null;
  function grainTexture() {
    if (grainTex) return grainTex;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d', { willReadFrequently: true }), im = g.createImageData(512, 512), r = rng(99);
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); return grainTex = c;
  }
  // 在 ctx 上铺一层颗粒（seed 每帧变化 = 动态颗粒；固定 = 纸纹）。mode 默认 overlay。
  function grain(ctx, amount = 0.08, seed = 0, mode = 'overlay', scale = 1) {
    const tex = grainTexture(); ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = mode;
    const ox = Math.floor(hash(seed) * 512), oy = Math.floor(hash(seed + 7.7) * 512);
    ctx.translate(-ox, -oy); ctx.scale(scale, scale);
    for (let y = 0; y < (H + 512) / scale; y += 512) for (let x = 0; x < (W + 512) / scale; x += 512) ctx.drawImage(tex, x, y);
    ctx.restore();
  }

  // 节拍：t 为场景本地时间（每段从 0 开始，场景起点恰好落在小节强拍上）。
  const beatPhase = t => fract(t / BEAT);                 // 0..1 在一拍内的位置
  const beatIndex = t => Math.floor(t / BEAT);
  const pulse = (t, decay = 8) => Math.exp(-decay * beatPhase(t) * BEAT);   // 每拍一次的衰减脉冲 1→0

  const F = (size, family = 'NotoSansSC', weight = '') => `${weight} ${size}px "${family}", "NotoSansSC", sans-serif`.trim();
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  // 逐字排版：返回每个字符的 {ch, x, w}，便于逐字动画。
  function chars(ctx, text, x, align = 'left', spacing = 0) {
    const ws = [...text].map(ch => ctx.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0) + spacing * (ws.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    return [...text].map((ch, i) => { const o = { ch, x: cx, w: ws[i], cx: cx + ws[i] / 2 }; cx += ws[i] + spacing; return o; });
  }
  const hex = (h, a = 1) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

  window.S = { W, H, BPM, BEAT, BAR, clamp, lerp, seg, smooth, fract, E, spring, hash, hash2, rng, noise2, noise3, fbm, layer, grain, grainTexture,
    beatPhase, beatIndex, pulse, F, rr, chars, hex, TAU: Math.PI * 2 };
  window.SCENES = {};
  // 注册一个风格场景。def: { n, key, zh, en, bg, accent, draw(ctx, t, S) }
  window.registerScene = def => { window.SCENES[def.n] = def; };
})();
