// 09 拼贴剪贴 Collage Cut-out
// 牛皮纸底 + 报纸 + 网点"照片"（程序绘制的眼睛、灯泡，离屏网点化）+ 印刷红纸片；撕边、薄投影、胶带。
// 一拍二/三的步进动画：纸片带过冲拍下后锁死；t=2 揭开盖在照片上的纸片露出眼睛。标题为勒索信式逐字剪贴。
(function () {
  const { TAU } = S;
  const KRAFT = '#b88a58', CREAM = '#efe5cb', NEWS = '#e4dcc4', INK = '#16130f', RED = '#d8261c';
  const C = {};

  // ---------- 撕边 / 剪边多边形 ----------
  // w,h 以中心为原点；edges: 每条边 'tear' | 'cut'
  function tornRect(w, h, seed, edges = ['tear', 'tear', 'tear', 'tear'], amp = 6) {
    const r = S.rng(seed), face = [], fiber = [];
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    for (let e = 0; e < 4; e++) {
      const a = corners[e], b = corners[(e + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len; // 外法线
      const torn = edges[e] === 'tear', step = torn ? 7 : len, n = Math.max(1, Math.round(len / step));
      let walk = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n; let d = 0, f = 0;
        if (torn) { walk += (r() - 0.5) * amp * 0.9; walk *= 0.82; d = walk + (r() - 0.5) * amp * 0.6 + Math.sin(u * 9 + seed) * amp * 0.5; f = d + 2.5 + r() * 5; }
        else { d = (r() - 0.5) * 2; f = d; }
        const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        face.push([x + nx * d, y + ny * d]); fiber.push([x + nx * f, y + ny * f]);
      }
    }
    return { face, fiber };
  }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
  function shadowOn(ctx, k = 1) { ctx.shadowColor = `rgba(30,15,0,${0.42 * k})`; ctx.shadowBlur = 9; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 8; }
  function shadowOff(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0; }

  // 拍下：从大到小带过冲，然后锁死（输入为步进时间）
  function slap(ts, t0, dur = 0.25) {
    if (ts < t0) return null;
    const k = S.seg(ts, t0, t0 + dur);
    return { s: 1 + 0.35 * (1 - k) * (1 - k) - 0.06 * Math.sin(k * Math.PI) * (1 - k) * 2, k, a: 1 };
  }
  // 摆放一张纸片
  function place(ctx, x, y, rot, sl, fn) {
    if (!sl) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + (1 - sl.k) * (rot >= 0 ? 0.3 : -0.3)); ctx.scale(sl.s, sl.s);
    fn(ctx); ctx.restore();
  }
  function paperPiece(ctx, tr, fill, opts = {}) {
    ctx.save(); shadowOn(ctx, opts.shadow ?? 1);
    ctx.fillStyle = opts.fiber || '#f7f1e2'; poly(ctx, tr.fiber); ctx.fill();
    shadowOff(ctx);
    ctx.fillStyle = fill; poly(ctx, tr.face); ctx.fill();
    ctx.restore();
  }
  function tape(ctx, x, y, w, h, rot, seed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const p = []; const r = S.rng(seed);
    p.push([-w / 2, -h / 2], [w / 2, -h / 2]);
    for (let i = 0; i <= 6; i++) p.push([w / 2 + (i % 2 ? -5 : 2) + r() * 3, -h / 2 + h * i / 6]);
    p.push([-w / 2, h / 2]);
    for (let i = 6; i >= 0; i--) p.push([-w / 2 + (i % 2 ? 5 : -2) - r() * 3, -h / 2 + h * i / 6]);
    ctx.shadowColor = 'rgba(40,20,0,0.18)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(232,222,186,0.82)'; poly(ctx, p); ctx.fill(); shadowOff(ctx);
    ctx.save(); poly(ctx, p); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; for (let i = -w; i < w; i += 9) { ctx.beginPath(); ctx.moveTo(i, -h); ctx.lineTo(i + h * 0.4, h); ctx.stroke(); }
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(-w, h / 2 - 6, w * 2, 6);
    ctx.restore(); ctx.restore();
  }

  // ---------- 网点化 ----------
  function halftone(src, spacing, angle, ink, paper, maskFn) {
    const w = src.width, h = src.height, g = src.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, w, h).data;
    const out = document.createElement('canvas'); out.width = w; out.height = h; const o = out.getContext('2d');
    if (paper) { o.fillStyle = paper; o.fillRect(0, 0, w, h); }
    o.fillStyle = ink;
    const ca = Math.cos(angle), sa = Math.sin(angle), R = Math.hypot(w, h);
    for (let v = -R; v < R; v += spacing) for (let u = -R; u < R; u += spacing) {
      const x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca;
      if (x < -spacing || y < -spacing || x > w + spacing || y > h + spacing) continue;
      const xi = Math.min(w - 1, Math.max(0, x | 0)), yi = Math.min(h - 1, Math.max(0, y | 0)), i = (yi * w + xi) * 4;
      if (d[i + 3] < 20) continue;
      const dark = 1 - d[i] / 255, r = Math.sqrt(dark) * spacing * 0.68;
      if (r < 0.5) continue;
      o.beginPath(); o.arc(x, y, r, 0, TAU); o.fill();
    }
    return out;
  }
  function eyeGray() {
    const w = 540, h = 380, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    let gr = g.createRadialGradient(270, 200, 40, 270, 200, 380); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(1, '#6a6a6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // 眉
    g.strokeStyle = '#222'; g.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const u = i / 70, x = 90 + u * 360, y = 92 - Math.sin(u * Math.PI) * 38 + u * 10; g.lineWidth = 5 + Math.sin(u * Math.PI) * 6; g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + 18, y - 6 + (i % 3) * 3); g.stroke(); }
    // 眼皮褶
    g.strokeStyle = '#555'; g.lineWidth = 6; g.beginPath(); g.moveTo(110, 170); g.quadraticCurveTo(270, 70, 440, 160); g.stroke();
    // 杏仁形眼眶
    const lid = () => { g.beginPath(); g.moveTo(95, 215); g.quadraticCurveTo(270, 80, 450, 200); g.quadraticCurveTo(280, 320, 95, 215); g.closePath(); };
    lid(); gr = g.createRadialGradient(270, 210, 20, 270, 210, 190); gr.addColorStop(0, '#fafafa'); gr.addColorStop(1, '#a8a8a8'); g.fillStyle = gr; g.fill();
    g.save(); lid(); g.clip();
    gr = g.createRadialGradient(272, 200, 10, 272, 200, 92); gr.addColorStop(0, '#9a9a9a'); gr.addColorStop(0.6, '#6c6c6c'); gr.addColorStop(1, '#2a2a2a');
    g.fillStyle = gr; g.beginPath(); g.arc(272, 200, 90, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 2; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.beginPath(); g.moveTo(272 + Math.cos(a) * 42, 200 + Math.sin(a) * 42); g.lineTo(272 + Math.cos(a) * 86, 200 + Math.sin(a) * 86); g.stroke(); }
    g.fillStyle = '#050505'; g.beginPath(); g.arc(272, 200, 40, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(300, 172, 20, 0, TAU); g.fill(); g.beginPath(); g.arc(250, 228, 8, 0, TAU); g.fill();
    gr = g.createLinearGradient(0, 100, 0, 200); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, 200);
    g.restore();
    // 上睫毛
    g.strokeStyle = '#111'; g.lineWidth = 9; lid(); g.stroke();
    for (let i = 0; i < 16; i++) { const u = 0.08 + i / 16 * 0.86, x = 95 + u * 355, y = 215 - Math.sin(u * Math.PI) * 68 - u * 15; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (u - 0.4) * 30, y - 30, x + (u - 0.3) * 60, y - 46); g.stroke(); }
    return c;
  }
  function bulbPath(g, ox = 0, oy = 0, s = 1) {
    g.beginPath(); g.moveTo(ox + 112 * s, oy + 300 * s);
    g.bezierCurveTo(ox + 110 * s, oy + 250 * s, ox + 40 * s, oy + 210 * s, ox + 40 * s, oy + 140 * s);
    g.arc(ox + 150 * s, oy + 140 * s, 110 * s, Math.PI, 0);
    g.bezierCurveTo(ox + 260 * s, oy + 210 * s, ox + 190 * s, oy + 250 * s, ox + 188 * s, oy + 300 * s);
    g.lineTo(ox + 188 * s, oy + 380 * s); g.quadraticCurveTo(ox + 150 * s, oy + 420 * s, ox + 112 * s, oy + 380 * s); g.closePath();
  }
  function bulbGray() {
    const c = document.createElement('canvas'); c.width = 300; c.height = 430; const g = c.getContext('2d');
    bulbPath(g); g.fillStyle = '#000'; g.fill();
    g.save(); bulbPath(g); g.clip();
    let gr = g.createRadialGradient(115, 100, 10, 150, 150, 170); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#bdbdbd'); gr.addColorStop(1, '#3a3a3a');
    g.fillStyle = gr; g.fillRect(0, 0, 300, 300);
    g.strokeStyle = '#222'; g.lineWidth = 6; g.beginPath(); g.moveTo(125, 290); g.lineTo(130, 170); g.moveTo(175, 290); g.lineTo(170, 170); g.stroke();
    g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 8; i++) { const x = 130 + i * 5, y = 170 + (i % 2 ? -14 : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < 5; i++) { gr = g.createLinearGradient(100, 0, 200, 0); gr.addColorStop(0, '#2a2a2a'); gr.addColorStop(0.35, '#d0d0d0'); gr.addColorStop(1, '#1a1a1a'); g.fillStyle = gr; g.fillRect(100, 300 + i * 17, 100, 12); g.fillStyle = '#111'; g.fillRect(100, 312 + i * 17, 100, 5); }
    g.fillStyle = '#111'; g.fillRect(100, 385, 100, 50);
    g.restore();
    return c;
  }
  function kraftTex() {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d');
    const sw = 270, sh = 480, s = document.createElement('canvas'); s.width = sw; s.height = sh; const sg = s.getContext('2d'), im = sg.createImageData(sw, sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const n = S.fbm(x * 0.02, y * 0.012, 3.3, 3) * 0.5 + S.noise2(x * 0.15, y * 0.08) * 0.12, i = (y * sw + x) * 4;
      im.data[i] = 184 + n * 60; im.data[i + 1] = 138 + n * 50; im.data[i + 2] = 88 + n * 36; im.data[i + 3] = 255;
    }
    sg.putImageData(im, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, 1080, 1920);
    const r = S.rng(909); g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = r() * 1080, y = r() * 1920, a = r() * TAU, l = 6 + r() * 26;
      g.strokeStyle = r() < 0.5 ? `rgba(90,55,20,${0.08 + r() * 0.14})` : `rgba(240,210,160,${0.08 + r() * 0.14})`; g.lineWidth = 0.8 + r() * 1.4;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const vg = g.createRadialGradient(540, 940, 380, 540, 960, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,18,0,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, 1080, 1920);
    return c;
  }
  // 报纸：标题 + 栏线 + 小网点图
  function newsTex(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = NEWS; g.fillRect(0, 0, w, h);
    g.fillStyle = INK; g.font = S.F(92, 'PlayfairBI', 900); g.textAlign = 'center'; g.fillText('The Daily Cut', w / 2, 120);
    g.fillRect(40, 140, w - 80, 5); g.fillRect(40, 152, w - 80, 2);
    g.font = S.F(22, 'SpecialElite'); g.fillText('VOL. XXV  ·  NO. 09  ·  SCISSORS & GLUE EDITION  ·  PRICE 25¢', w / 2, 182);
    const r = S.rng(77), cols = 4, cw = (w - 80 - (cols - 1) * 22) / cols;
    for (let ci = 0; ci < cols; ci++) {
      const x0 = 40 + ci * (cw + 22); let y = 222;
      if (ci === 1) { g.font = S.F(40, 'BebasNeue'); g.textAlign = 'left'; g.fillText('MACHINE LEARNS TO', x0, y + 22); g.fillText('USE THE SCISSORS', x0, y + 62); y += 90; }
      while (y < h - 30) {
        const para = 3 + Math.floor(r() * 6);
        for (let k = 0; k < para && y < h - 30; k++) { const lw = k === para - 1 ? cw * (0.3 + r() * 0.5) : cw - r() * 8; g.fillStyle = `rgba(22,19,15,${0.5 + r() * 0.25})`; g.fillRect(x0, y, lw, 7); y += 16; }
        y += 12;
      }
      if (ci < cols - 1) { g.fillStyle = 'rgba(22,19,15,0.6)'; g.fillRect(x0 + cw + 10, 215, 1.5, h - 250); }
    }
    return c;
  }
  // 勒索信字块
  const SCRAP_STYLES = [
    { bg: RED, fg: CREAM, font: 'Bungee' }, { bg: INK, fg: CREAM, font: 'BebasNeue' }, { bg: CREAM, fg: INK, font: 'PlayfairBI', w: 900 },
    { bg: NEWS, fg: RED, font: 'ArchivoBlack' }, { bg: '#f3d9a0', fg: INK, font: 'SpecialElite' }, { bg: INK, fg: '#f3d9a0', font: 'RubikMonoOne' },
    { bg: CREAM, fg: RED, font: 'BebasNeue' }, { bg: RED, fg: INK, font: 'PlayfairBI', w: 900 },
  ];
  const ZH_STYLES = [
    { bg: CREAM, fg: INK, font: 'NotoSerifSC', w: 900 }, { bg: INK, fg: CREAM, font: 'NotoSansSC', w: 900 },
    { bg: NEWS, fg: RED, font: 'MaShanZheng' }, { bg: RED, fg: CREAM, font: 'ZCOOLQingKe' },
  ];
  function scrap(ctx, ch, st, size, seed, ts, t0) {
    const sl = slap(ts, t0, 0.17); if (!sl) return null;
    ctx.font = S.F(size, st.font, st.w || ''); const m = ctx.measureText(ch);
    const w = m.width + size * 0.34, h = size * 1.12;
    const key = ch + seed + size; let tr = C['sc' + key];
    if (!tr) { const r = S.rng(seed); tr = C['sc' + key] = tornRect(w, h, seed, [0, 1, 2, 3].map(() => r() < 0.45 ? 'tear' : 'cut'), 4); }
    return { sl, w, h, tr, draw(c) {
      paperPiece(c, tr, st.bg, { fiber: st.bg === INK || st.bg === RED ? '#f2ead6' : '#fbf7ec', shadow: 0.9 });
      c.fillStyle = st.fg; c.font = S.F(size, st.font, st.w || ''); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 0, size * 0.06);
    } };
  }
  // 平面多边形与半平面求交（Sutherland–Hodgman，单刀）
  function clipHalf(p, F, n, keepPos) {
    const out = [], s = q => ((q[0] - F[0]) * n[0] + (q[1] - F[1]) * n[1]) * (keepPos ? 1 : -1);
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], da = s(a), db = s(b);
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const u = da / (da - db); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
    }
    return out;
  }
  const reflect = (q, F, n) => { const d = (q[0] - F[0]) * n[0] + (q[1] - F[1]) * n[1]; return [q[0] - 2 * d * n[0], q[1] - 2 * d * n[1]]; };

  function init() {
    if (C.ready) return;
    C.kraft = kraftTex();
    C.news = newsTex(900, 860); C.newsTR = tornRect(900, 860, 31, ['tear', 'cut', 'tear', 'cut'], 8);
    C.eye = halftone(eyeGray(), 9, Math.PI / 4, INK, CREAM); C.eyeTR = tornRect(560, 400, 52, ['tear', 'cut', 'tear', 'tear'], 6);
    const bg = bulbGray(); C.bulb = halftone(bg, 8, Math.PI / 4, INK, null);
    // 灯泡剪影内铺纸色再叠网点
    const b2 = document.createElement('canvas'); b2.width = 340; b2.height = 470; const g = b2.getContext('2d');
    g.save(); g.translate(20, 20); bulbPath(g); g.restore(); g.fillStyle = CREAM; g.fill();
    g.save(); g.translate(20, 20); bulbPath(g); g.clip(); g.drawImage(C.bulb, 0, 0); g.restore();
    C.bulbCut = b2;
    C.flapTR = [[-250, -175], [250, -175], [250, 175], [-250, 175]];
    C.stripTR = tornRect(780, 100, 61, ['cut', 'tear', 'cut', 'tear'], 4);
    C.circle = (() => { const r = S.rng(5), p = []; for (let i = 0; i < 90; i++) { const a = i / 90 * TAU; p.push([Math.cos(a) * (200 + (r() - 0.5) * 5), Math.sin(a) * (200 + (r() - 0.5) * 5)]); } return { face: p, fiber: p.map(q => [q[0] * 1.012, q[1] * 1.012]) }; })();
    C.arrow = { face: [[-150, -26], [40, -30], [36, -72], [150, 2], [34, 74], [40, 30], [-150, 28]], fiber: [[-152, -28], [40, -32], [36, -75], [153, 2], [34, 77], [40, 32], [-152, 30]] };
    C.burst = (() => { const p = []; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = i % 2 ? 92 : 140; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return { face: p, fiber: p.map(q => [q[0] * 1.02, q[1] * 1.02]) }; })();
    C.labelTR = tornRect(250, 64, 81, ['cut', 'cut', 'tear', 'cut'], 3);
    C.label2TR = tornRect(230, 58, 82, ['tear', 'cut', 'cut', 'cut'], 3);
    C.ready = true;
  }

  function title(ctx, ts) {
    // 编号
    const num = [['0', 0, 0.0, 165, 300, -0.06, 170], ['9', 4, 0.08, 330, 296, 0.07, 170]];
    for (const [ch, si, t0, x, y, rot, size] of num) { const s = scrap(ctx, ch, SCRAP_STYLES[si], size, 100 + si, ts, t0); if (s) place(ctx, x, y, rot, s.sl, s.draw); }
    const zh = '拼贴剪贴';
    for (let i = 0; i < 4; i++) {
      const s = scrap(ctx, zh[i], ZH_STYLES[i], i === 2 ? 138 : 128, 200 + i, ts, 0.16 + i * 0.08);
      if (s) place(ctx, 488 + i * 142 + (i === 2 ? 6 : 0), 300 + (i % 2 ? -12 : 14), [0.05, -0.07, 0.04, -0.05][i], s.sl, s.draw);
    }
    const en = 'COLLAGE CUT-OUT', items = []; let x = 0;
    for (let i = 0; i < en.length; i++) {
      const ch = en[i]; if (ch === ' ') { x += 24; continue; }
      const st = SCRAP_STYLES[(i * 5 + 1) % SCRAP_STYLES.length], size = 58 + (i % 3) * 6;
      ctx.font = S.F(size, st.font, st.w || ''); const w = ctx.measureText(ch).width + size * 0.34;
      items.push({ ch, st, size, i, x: x + w / 2 }); x += w + 2;
    }
    const x0 = 540 - x / 2;
    for (const it of items) {
      const s = scrap(ctx, it.ch, it.st, it.size, 300 + it.i, ts, 0.42 + it.i * 0.025);
      if (s) place(ctx, x0 + it.x, 476 + Math.sin(it.i * 2.3) * 9, Math.sin(it.i * 1.7) * 0.1, s.sl, s.draw);
    }
  }

  registerScene({
    n: 9, key: 'collage', zh: '拼贴剪贴', en: 'Collage Cut-out',
    bg: KRAFT, accent: RED,
    init() { init(); },
    draw(ctx, t, S) {
      init();
      const ts = Math.floor(t * 12) / 12; // 一拍二点五（12fps 步进）
      const jit = (i) => (S.hash2(Math.floor(t * 12), i) - 0.5) * 1.2; // 步进造成的轻微抖动
      ctx.drawImage(C.kraft, 0, 0);
      // 底层：报纸
      place(ctx, 540, 1060, -0.025, { s: 1, k: 1 }, c => {
        paperPiece(c, C.newsTR, NEWS);
        c.save(); poly(c, C.newsTR.face); c.clip(); c.drawImage(C.news, -450, -430); S.grain(c, 0.12, 2, 'multiply', 1); c.restore();
      });
      // 红纸圆
      place(ctx, 790, 850, 0, slap(ts, -1), c => paperPiece(c, C.circle, RED));
      // 小剪报
      place(ctx, 210, 1475, -0.06, slap(ts, -1), c => { paperPiece(c, C.labelTR, CREAM); c.fillStyle = INK; c.font = S.F(30, 'SpecialElite'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Nº 09 / 25', 0, 2); });
      // 灯泡剪影（1.5 拍下）
      place(ctx, 805, 1190, 0.14, slap(ts, 1.5), c => {
        c.save(); c.shadowColor = 'rgba(30,15,0,0.45)'; c.shadowBlur = 10; c.shadowOffsetX = 6; c.shadowOffsetY = 9;
        c.translate(-170, -235); c.save(); c.translate(20, 20); bulbPath(c, -9, -9, 1.06); c.restore(); c.fillStyle = '#fbf7ec'; c.fill(); shadowOff(c);
        c.drawImage(C.bulbCut, 0, 0); c.restore();
      });
      // 眼睛照片 + 盖纸（t=2 揭开）
      place(ctx, 400 + jit(1), 940, 0.05, slap(ts, 0.5), c => {
        paperPiece(c, C.eyeTR, CREAM);
        c.save(); poly(c, C.eyeTR.face); c.clip(); c.drawImage(C.eye, -270, -190); c.restore();
        // 盖纸：从右下角翻起，翻到一半被整张扯走飞出画面
        const p = S.E.out3(S.seg(ts, 2.0, 2.34)), fly = S.E.in2(S.seg(ts, 2.34, 2.75));
        if (fly < 1) {
          const n = [Math.SQRT1_2, Math.SQRT1_2], d0 = 310, d1 = -40;
          const dist = d0 + (d1 - d0) * p, F = [n[0] * dist, n[1] * dist];
          const flat = clipHalf(C.flapTR, F, n, false), lifted = clipHalf(C.flapTR, F, n, true).map(q => reflect(q, F, n));
          c.save(); c.translate(-fly * 900, -fly * 700); c.rotate(-fly * 1.2);
          if (flat.length > 2) {
            c.save(); shadowOn(c, 0.6); poly(c, flat); c.fillStyle = '#e6d6ad'; c.fill(); shadowOff(c);
            poly(c, flat); c.clip();
            c.fillStyle = 'rgba(22,19,15,0.75)'; c.font = S.F(26, 'SpecialElite'); c.textAlign = 'left';
            ['FIG. 1 — THE OBSERVER', 'Do not open before', 'the downbeat.', ''].forEach((l, i) => c.fillText(l, -220, -120 + i * 34));
            c.fillStyle = RED; c.font = S.F(96, 'BebasNeue'); c.textAlign = 'center'; c.fillText('PEEL HERE', 0, 60);
            c.setLineDash([16, 10]); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-240, 100); c.lineTo(240, 100); c.stroke(); c.setLineDash([]);
            c.font = S.F(40, 'NotoSansSC', 900); c.fillStyle = INK; c.fillText('✂', -205, 114);
            c.restore();
          }
          if (lifted.length > 2 && p > 0) {
            c.save(); c.shadowColor = 'rgba(30,15,0,0.45)'; c.shadowBlur = 18; c.shadowOffsetX = 10; c.shadowOffsetY = 14;
            poly(c, lifted); c.fillStyle = '#d8c9a3'; c.fill(); shadowOff(c);
            const g = c.createLinearGradient(F[0], F[1], F[0] - n[0] * 200, F[1] - n[1] * 200); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.14)');
            poly(c, lifted); c.fillStyle = g; c.fill();
            c.restore();
          }
          c.restore();
        }
      });
      // 胶带
      if (ts >= 0.75) { tape(ctx, 150, 760, 150, 46, -0.6, 11); tape(ctx, 660, 1120, 140, 44, -0.5, 12); }
      if (ts >= 1.75) tape(ctx, 860, 950, 150, 46, 0.5, 13);
      // 黑纸条
      place(ctx, 520, 1395, -0.05, slap(ts, 1.0), c => {
        paperPiece(c, C.stripTR, INK, { fiber: '#efe6cf' });
        c.fillStyle = CREAM; c.font = S.F(50, 'SpecialElite'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CUT · PASTE · REPEAT', 0, 4);
      });
      // 红箭头（2.5）
      place(ctx, 770, 690, 2.55, slap(ts, 2.5), c => {
        paperPiece(c, C.arrow, INK, { fiber: '#efe6cf' });
      });
      // 红星贴（3.0）
      place(ctx, 205, 1225, -0.2, slap(ts, 3.0, 0.3), c => {
        paperPiece(c, C.burst, RED);
        c.fillStyle = CREAM; c.font = S.F(84, 'BebasNeue'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LOOK!', 0, 6);
      });
      if (ts >= 3.5) tape(ctx, 330, 1170, 120, 40, 0.9, 14);
      title(ctx, ts);
      // 整体纸面颗粒
      S.grain(ctx, 0.07, 9, 'multiply', 1);
    },
  });
})();
