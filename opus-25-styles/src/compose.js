// 合成：按剪辑表找出当前段，必要时把前后两段各画进离屏层，再用转场合成到舞台。
(function () {
  const { W, H, clamp, lerp, seg, smooth, E, hash, hash2, layer, fbm, noise3, TAU } = S;
  const meta = n => TL.STYLES[n - 1];
  const sceneDef = n => window.SCENES[n];
  const accentOf = s => s.kind === 'scene' ? (sceneDef(s.n)?.accent || '#ff5a4e') : s.kind === 'chapter' ? '#ffd23f' : '#ffffff';
  const bgOf = s => s.kind === 'scene' ? (sceneDef(s.n)?.bg || '#111') : '#0b0b0f';

  function resetCtx(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.shadowOffsetX = ctx.shadowOffsetY = 0; ctx.imageSmoothingEnabled = true;
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.setLineDash([]); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '0px'; ctx.lineWidth = 1;
  }

  // 占位：场景还没写好时画一张卡片，保证管线能先跑通。
  function placeholder(ctx, n, t) {
    const m = meta(n); ctx.fillStyle = `hsl(${n * 37},45%,22%)`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = S.F(240, 'NotoSansSC', 900); ctx.fillText(String(n).padStart(2, '0'), W / 2, 820);
    ctx.font = S.F(90, 'NotoSansSC', 900); ctx.fillText(m.zh, W / 2, 1000); ctx.font = S.F(48, 'Inter'); ctx.fillText(m.en, W / 2, 1080);
    ctx.fillRect(140, 1200, 800 * clamp(t / 4), 10);
  }

  function drawScene(ctx, n, t) {
    const d = sceneDef(n); resetCtx(ctx); ctx.save();
    try { d ? d.draw(ctx, t, S) : placeholder(ctx, n, t); } catch (e) { console.error(`scene ${n} @${t.toFixed(2)}: ${e.stack}`); }
    ctx.restore(); resetCtx(ctx);
  }
  function drawSeg(ctx, s, T) {
    const t = T - s.start;
    if (s.kind === 'scene') drawScene(ctx, s.n, t);
    else { resetCtx(ctx); ctx.save(); FRAMING[s.kind](ctx, t, drawScene); ctx.restore(); resetCtx(ctx); }
  }
  // 把一段画进离屏层
  function segTo(key, s, T) { const c = layer(key), g = c.getContext('2d'); resetCtx(g); g.clearRect(0, 0, W, H); drawSeg(g, s, T); return c; }

  // ---------- 转场 ----------
  // 每个转场：(o, A, B, p, info)。o 为舞台 ctx，A 出、B 入（均为整幅画布），p 0..1。
  function blit(o, c, alpha = 1) { o.globalAlpha = alpha; o.drawImage(c, 0, 0); o.globalAlpha = 1; }
  function scaled(o, c, s, cx = W / 2, cy = H / 2, rot = 0, alpha = 1) {
    o.save(); o.globalAlpha = alpha; o.translate(cx, cy); o.rotate(rot); o.scale(s, s); o.drawImage(c, -cx, -cy); o.restore();
  }
  function channels(src, key) { // 把画布拆成 R/G/B 三张图（相加即原图）
    return ['#ff0000', '#00ff00', '#0000ff'].map((col, i) => {
      const c = layer(key + i), g = c.getContext('2d'); resetCtx(g); g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, W, H); return c;
    });
  }
  function pixelate(o, src, bs) {
    if (bs <= 1.5) return o.drawImage(src, 0, 0);
    const w = Math.max(1, Math.round(W / bs)), h = Math.max(1, Math.round(H / bs)), c = layer('pix', w, h), g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.clearRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
    o.imageSmoothingEnabled = false; o.drawImage(c, 0, 0, W, H); o.imageSmoothingEnabled = true;
  }
  // 低分辨率阈值遮罩：field(x,y)∈[0,1]，显示 field < thr 的部分。返回放大后的软边遮罩画布。
  const fieldCache = new Map();
  function fieldMask(key, fn, thr, soft = 0.04, fringe = null) {
    const w = 180, h = 320;
    let f = fieldCache.get(key);
    if (!f) { f = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[y * w + x] = fn(x / w, y / h); fieldCache.set(key, f); }
    const c = layer('fm-' + key, w, h), g = c.getContext('2d'), im = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = f[i], a = 1 - smooth(thr - soft, thr, v);
      im.data[i * 4 + 3] = a * 255;
      if (fringe) { const fr = Math.max(0, 1 - Math.abs(v - (thr + fringe.w * .5)) / fringe.w); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 0; im.data[i * 4 + 3] = Math.max(a, fr * fringe.a) * 255; }
    }
    g.putImageData(im, 0, 0); return c;
  }
  function masked(o, src, mask, key) { // 用遮罩的 alpha 截取 src 画到 o 上
    const c = layer(key), g = c.getContext('2d'); resetCtx(g); g.clearRect(0, 0, W, H); g.drawImage(mask, 0, 0, W, H);
    g.globalCompositeOperation = 'source-in'; g.drawImage(src, 0, 0); o.drawImage(c, 0, 0);
  }

  const T = {
    cut(o, A, B, p) { blit(o, p < .5 ? A : B); },

    drop(o, A, B, p, I) { // 等轴：方块一格一格从上方落下，带一点回弹
      blit(o, A); const cols = 6, rows = 10, cw = W / cols, ch = H / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = ((i + (rows - 1 - j)) / (cols + rows - 2)) * .5, k = seg(p, d, d + .5); if (k <= 0) continue;
        const e = E.outBack(k, 1.4), y = j * ch - (1 - e) * 360;
        o.globalAlpha = clamp(k * 3); o.drawImage(B, i * cw, j * ch, cw, ch, i * cw, y, cw + .5, ch + .5);
        o.fillStyle = `rgba(30,20,80,${.25 * (1 - k)})`; o.fillRect(i * cw, y, cw, ch);
      }
      o.globalAlpha = 1;
    },

    iris(o, A, B, p, I) { // 扁平：一颗珊瑚红圆点胀满全屏，再从中心开出下一幕
      const R = Math.hypot(W, H) / 2 + 40, col = I.accentB;
      if (p < .5) { blit(o, A); const k = E.inOut3(p / .5); o.fillStyle = col; o.beginPath(); o.arc(W / 2, H / 2, R * k, 0, TAU); o.fill(); }
      else { o.fillStyle = col; o.fillRect(0, 0, W, H); const k = E.out3((p - .5) / .5); o.save(); o.beginPath(); o.arc(W / 2, H / 2, R * k, 0, TAU); o.clip(); blit(o, B); o.restore(); }
    },

    linewipe(o, A, B, p, I) { // 线条：一根发光金线自上而下扫过
      const e = E.inOut3(p), y = lerp(-200, H + 200, e), tilt = 160;
      blit(o, A); o.save(); o.beginPath(); o.moveTo(0, -10); o.lineTo(W, -10); o.lineTo(W, y + tilt / 2); o.lineTo(0, y - tilt / 2); o.closePath(); o.clip(); blit(o, B); o.restore();
      o.save(); o.strokeStyle = '#ffe9b8'; o.shadowColor = '#e8b25a'; o.shadowBlur = 40; o.lineWidth = 6; o.beginPath(); o.moveTo(0, y - tilt / 2); o.lineTo(W, y + tilt / 2); o.stroke();
      o.lineWidth = 2; o.strokeStyle = '#fff'; o.stroke(); o.restore();
    },

    zoom(o, A, B, p) { // 3D：穿过镜头，前景冲出，下一幕从深处推近
      const e = E.inOutExpo(p);
      o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
      if (e < 1) { o.filter = `blur(${e * 30}px)`; scaled(o, A, 1 + e * 1.4, W / 2, H / 2, 0, 1 - e); o.filter = 'none'; }
      if (e > 0) { o.filter = `blur(${(1 - e) * 24}px)`; scaled(o, B, .55 + .45 * e, W / 2, H / 2, 0, clamp(e * 1.6)); o.filter = 'none'; }
      o.fillStyle = `rgba(255,255,255,${.5 * Math.exp(-Math.pow((p - .5) / .08, 2))})`; o.fillRect(0, 0, W, H);
    },

    blob(o, A, B, p, I) { // 形变：一团抖动的色块从中心胀开
      blit(o, A); const e = E.inOut3(p), R = Math.hypot(W, H) / 2 * 1.25;
      const path = r => { o.beginPath(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU, rr = r * (1 + .18 * noise3(Math.cos(a) * 1.3, Math.sin(a) * 1.3, p * 3)); i ? o.lineTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr) : o.moveTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); } o.closePath(); };
      path(R * E.out3(clamp(p * 1.25))); o.fillStyle = I.bgB; o.fill();
      o.save(); path(R * E.in2(p) * 1.05); o.clip(); blit(o, B); o.restore();
    },

    whip(o, A, B, p) { // 贴纸：快速上推，带运动模糊
      const e = E.inOutExpo(p), off = e * H, sp = Math.sin(Math.PI * p), n = 1 + Math.round(sp * 7);
      o.fillStyle = '#ddd'; o.fillRect(0, 0, W, H);
      for (let k = 0; k < n; k++) {
        const dy = (k / Math.max(1, n - 1) - .5) * sp * 220;
        o.globalAlpha = 1 / n * (n > 1 ? 1.15 : 1);
        o.drawImage(A, 0, -off + dy); o.drawImage(B, 0, H - off + dy);
      }
      o.globalAlpha = 1;
    },

    glitch(o, A, B, p) { // HUD：切片错位 + 通道分离
      const src = p < .5 ? A : B, amp = Math.sin(Math.PI * p), step = Math.floor(p * 18);
      const ch = channels(src, 'gl'), dx = amp * 36 * (hash(step) > .5 ? 1 : -1);
      o.fillStyle = '#000'; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'lighter';
      o.drawImage(ch[0], dx, 0); o.drawImage(ch[1], 0, 0); o.drawImage(ch[2], -dx, 0); o.globalCompositeOperation = 'source-over';
      const n = 16; for (let i = 0; i < n; i++) {
        if (hash2(i, step) > .35 + .5 * (1 - amp)) continue;
        const y = hash2(i, step + 3) * H, h = 10 + hash2(i, step + 5) * 140, ox = (hash2(i, step + 9) - .5) * 260 * amp;
        o.drawImage(src, 0, y, W, h, ox, y, W, h);
        if (hash2(i, step + 11) > .7) { o.fillStyle = `rgba(0,240,255,${.35 * amp})`; o.fillRect(0, y, W, 3); }
      }
    },

    tear(o, A, B, p) { // 拼贴：撕纸边缘斜向扫过
      const e = E.inOut3(p), x0 = lerp(-500, W + 300, e), slope = .28;
      const pts = []; for (let y = -40; y <= H + 40; y += 22) pts.push([x0 + (y - H / 2) * slope + (hash(y * .37 + 3) - .5) * 34, y]);
      blit(o, A);
      o.save(); o.beginPath(); o.moveTo(-10, -40); pts.forEach(([x, y]) => o.lineTo(x, y)); o.lineTo(-10, H + 40); o.closePath(); o.clip(); blit(o, B); o.restore();
      o.save(); o.shadowColor = 'rgba(0,0,0,.4)'; o.shadowBlur = 18; o.shadowOffsetX = 8; o.fillStyle = '#f4ecd8';
      o.beginPath(); pts.forEach(([x, y], i) => i ? o.lineTo(x, y) : o.moveTo(x, y));
      for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = pts[i]; o.lineTo(x + 18 + hash(y * .91) * 16, y); }
      o.closePath(); o.fill(); o.restore();
    },

    defocus(o, A, B, p) { // 玻璃：失焦交叠 + 光晕
      const a = E.inOut2(p);
      o.filter = `blur(${Math.sin(Math.PI * Math.min(p, .5)) * 40}px) brightness(${1 + .4 * Math.sin(Math.PI * p)})`; blit(o, A);
      o.filter = `blur(${(1 - p) * 40}px) brightness(${1 + .4 * Math.sin(Math.PI * p)})`; blit(o, B, a); o.filter = 'none';
      const g = o.createRadialGradient(W * .8, H * .25, 0, W * .8, H * .25, 1000); g.addColorStop(0, `rgba(140,170,255,${.45 * Math.sin(Math.PI * p)})`); g.addColorStop(1, 'rgba(120,80,255,0)');
      o.globalCompositeOperation = 'screen'; o.fillStyle = g; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over';
    },

    flip(o, A, B, p) { // 包豪斯：画面碎成方块逐块翻面
      o.fillStyle = '#111'; o.fillRect(0, 0, W, H); const cols = 4, rows = 7, cw = W / cols, ch = H / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = hash2(i, j) * .4, k = E.inOut3(seg(p, d, d + .6)), sx = Math.abs(Math.cos(k * Math.PI)), src = k < .5 ? A : B;
        o.save(); o.translate((i + .5) * cw, (j + .5) * ch); o.scale(Math.max(.001, sx), 1);
        o.drawImage(src, i * cw, j * ch, cw, ch, -cw / 2, -ch / 2, cw, ch);
        o.fillStyle = `rgba(0,0,0,${.5 * (1 - sx)})`; o.fillRect(-cw / 2, -ch / 2, cw, ch); o.restore();
      }
    },

    crt(o, A, B, p) { // Synthwave：老电视关机成一条线，再开机
      o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
      if (p < .5) {
        const k = p / .5, sy = Math.max(.004, 1 - E.in3(clamp(k * 1.4))), sx = 1 - E.in4(seg(k, .6, 1)) * .98;
        o.save(); o.translate(W / 2, H / 2); o.scale(sx, sy); o.filter = `brightness(${1 + k * 3})`; o.drawImage(A, -W / 2, -H / 2); o.restore(); o.filter = 'none';
      } else {
        const k = (p - .5) / .5, sy = Math.max(.004, E.outExpo(seg(k, .1, 1))), sx = E.out3(clamp(k * 3));
        o.save(); o.translate(W / 2, H / 2); o.scale(sx, sy); o.filter = `brightness(${1 + (1 - k) * 2.5})`; o.drawImage(B, -W / 2, -H / 2); o.restore(); o.filter = 'none';
      }
      o.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 6) o.fillRect(0, y, W, 2);
    },

    mosaic(o, A, B, p) { // 像素：马赛克变粗再变细
      const bs = p < .5 ? lerp(1, 90, E.in3(p / .5)) : lerp(90, 1, E.out3((p - .5) / .5));
      pixelate(o, p < .5 ? A : B, Math.round(bs / 6) * 6 || 1);
    },

    wave(o, A, B, p, I) { // 液态：两层液面从下往上漫过
      blit(o, A);
      const surf = (k, ph) => { o.beginPath(); o.moveTo(0, H + 10); for (let x = 0; x <= W; x += 20) { const y = lerp(H + 200, -260, k) + Math.sin(x * .007 + ph) * 70 * Math.sin(Math.PI * k) + Math.sin(x * .017 - ph * 1.7) * 30; o.lineTo(x, y); } o.lineTo(W, H + 10); o.closePath(); };
      const k1 = E.inOut3(clamp(p * 1.2)), k2 = E.inOut3(seg(p, .15, 1));
      surf(k1, p * 9); o.fillStyle = I.accentB; o.fill();
      o.save(); surf(k2, p * 9 + 2); o.clip(); blit(o, B); o.restore();
      surf(k2, p * 9 + 2); o.strokeStyle = 'rgba(255,255,255,.7)'; o.lineWidth = 6; o.stroke();
    },

    band(o, A, B, p) { // 综艺花字：彩色斜条刷过
      const cols = ['#ff3d7f', '#ffd23f', '#3ddcff', '#7c4dff'], ang = -.35, L = 3200, bw = 520;
      blit(o, A);
      const lead = lerp(-1700, 2400, E.inOut2(p)); // 条带前沿位置（沿垂直于条带方向）
      const cut = lead - cols.length * bw * .62;   // 最后一条之后露出 B
      const clipBand = (a, b) => { o.save(); o.translate(W / 2, H / 2); o.rotate(ang); o.beginPath(); o.rect(-L, a, 2 * L, b - a); o.restore(); };
      o.save(); clipBand(-4000, cut); o.clip(); blit(o, B); o.restore();
      cols.forEach((c, i) => { const y1 = lead - i * bw * .62, y0 = y1 - bw * .62; if (y1 < cut) return; o.save(); clipBand(Math.max(y0, cut), y1); o.fillStyle = c; o.fill(); o.restore(); });
    },

    shutter(o, A, B, p) { // 章节卡：上下两半裂开
      const e = E.inOutExpo(p); scaled(o, B, 1.15 - .15 * e);
      o.save(); o.translate(0, -e * H * .55); o.rotate(-e * .08); o.drawImage(A, 0, 0, W, H / 2, 0, 0, W, H / 2); o.restore();
      o.save(); o.translate(0, e * H * .55); o.rotate(e * .06); o.drawImage(A, 0, H / 2, W, H / 2, 0, H / 2, W, H / 2); o.restore();
      o.fillStyle = `rgba(255,255,255,${.8 * Math.sin(Math.PI * clamp(p * 4))})`; o.fillRect(0, H / 2 - 3, W, 6);
    },

    ink(o, A, B, p) { // 水墨：墨在宣纸上洇开
      blit(o, A);
      const m = fieldMask('ink', (x, y) => clamp(Math.hypot(x - .45, (y - .52) * .58) * 1.15 + .3 * fbm(x * 4, y * 7, 1, 5)), lerp(-.1, 1.15, E.inOut2(p)), .05, { w: .08, a: .85 });
      masked(o, B, m, 'inkB');
    },

    slats(o, A, B, p) { // 瑞士：红色百叶依次落下又收起
      const n = 6, sw = W / n; blit(o, A);
      for (let i = 0; i < n; i++) {
        const d = i * .06, k1 = E.inOut3(seg(p, d, d + .45)), k2 = E.inOut3(seg(p, d + .45, d + .7));
        const top = k2 * H, bot = k1 * H;
        if (k2 > 0) o.drawImage(B, i * sw, 0, sw, top, i * sw, 0, sw, top);
        o.fillStyle = i % 2 ? '#e30613' : '#111'; o.fillRect(i * sw, top, sw + 1, Math.max(0, bot - top));
      }
    },

    scan(o, A, B, p) { // 蓝图：扫描线带网格自上而下
      const y = lerp(-100, H + 100, E.inOut2(p)); blit(o, A);
      o.save(); o.beginPath(); o.rect(0, 0, W, y); o.clip(); blit(o, B); o.restore();
      o.save(); o.beginPath(); o.rect(0, y - 260, W, 260); o.clip(); o.fillStyle = 'rgba(16,64,160,.55)'; o.fillRect(0, y - 260, W, 260);
      o.strokeStyle = 'rgba(200,230,255,.5)'; o.lineWidth = 1.5; for (let x = 0; x <= W; x += 60) { o.beginPath(); o.moveTo(x, y - 260); o.lineTo(x, y); o.stroke(); }
      for (let yy = Math.floor((y - 260) / 60) * 60; yy < y; yy += 60) { o.beginPath(); o.moveTo(0, yy); o.lineTo(W, yy); o.stroke(); } o.restore();
      o.save(); o.shadowColor = '#9fe0ff'; o.shadowBlur = 30; o.fillStyle = '#eaf8ff'; o.fillRect(0, y - 3, W, 6); o.restore();
    },

    halftone(o, A, B, p) { // 波普：网点从角落长大
      blit(o, A); const s = 54, cols = Math.ceil(W / s) + 1, rows = Math.ceil(H / s) + 1;
      o.save(); o.beginPath();
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = (i / cols * .35 + j / rows * .65) * .55, r = s * .78 * E.inOut2(seg(p, d, d + .45));
        if (r > .5) { const x = i * s + (j % 2) * s / 2, y = j * s; o.moveTo(x + r, y); o.arc(x, y, r, 0, TAU); }
      }
      o.clip(); blit(o, B); o.restore();
    },

    misreg(o, A, B, p) { // Riso：粉、蓝两色版错位刷过
      blit(o, A); const e = E.inOut3(p), x1 = lerp(-W * 1.1, W * 1.6, e), x2 = x1 - 260;
      o.save(); o.beginPath(); o.rect(0, 0, Math.max(0, x2 - 120), H); o.clip(); blit(o, B); o.restore();
      o.globalCompositeOperation = 'multiply';
      o.fillStyle = '#ff48b0'; o.fillRect(x1 - 700, 0, 700, H);
      o.fillStyle = '#0078bf'; o.fillRect(x2 - 620, 40, 620, H);
      o.globalCompositeOperation = 'source-over'; S.grain(o, .12, Math.floor(p * 20));
    },

    layers(o, A, B, p) { // 纸雕：几层剪纸山峦升起，翻过之后露出下一幕
      const cols = ['#f7d9a8', '#f08a5d', '#b83b5e', '#6a2c70'];
      const edge = (base, ph, amp) => x => base + Math.sin(x * .006 + ph) * amp + Math.sin(x * .015 + ph * 2.1) * amp * .4;
      const k = E.inOut3(p), N = cols.length;
      // 最后一层的下沿之下露出 B
      const lastTop = lerp(H + 100, -H * 1.6, clamp(k * 1.05 - .05)), bandH = H * 1.25;
      blit(o, A);
      const bottomOf = (top, i) => edge(top + bandH, i * 1.7 + 3, 50);
      o.save(); o.beginPath(); o.moveTo(0, H + 10); for (let x = 0; x <= W; x += 24) o.lineTo(x, bottomOf(lastTop, N - 1)(x)); o.lineTo(W, H + 10); o.closePath(); o.clip(); blit(o, B); o.restore();
      for (let i = 0; i < N; i++) {
        const top = lastTop + (N - 1 - i) * -140, et = edge(top, i * 1.3, 60), eb = bottomOf(top, i);
        o.save(); o.shadowColor = 'rgba(40,10,30,.45)'; o.shadowBlur = 30; o.shadowOffsetY = -10; o.fillStyle = cols[i];
        o.beginPath(); for (let x = 0; x <= W; x += 24) x ? o.lineTo(x, et(x)) : o.moveTo(x, et(x)); for (let x = W; x >= 0; x -= 24) o.lineTo(x, eb(x)); o.closePath(); o.fill(); o.restore();
      }
    },

    flicker(o, A, B, p) { // 霓虹：灯管闪灭，再闪亮
      o.fillStyle = '#050208'; o.fillRect(0, 0, W, H); const f = Math.floor(p * 22);
      if (p < .5) { const on = [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0][f] ?? 0; if (on) blit(o, A, .9); }
      else { const on = [0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1][f - 11] ?? 1; if (on) blit(o, B, f >= 20 ? 1 : .85); }
    },

    rows(o, A, B, p) { // ASCII：一行一行打印出来
      const lh = 64, n = Math.ceil(H / lh), r = Math.floor(E.inOut2(p) * (n + 1)); blit(o, A, 1);
      o.fillStyle = 'rgba(0,0,0,.35)'; o.fillRect(0, r * lh, W, H);
      if (r > 0) o.drawImage(B, 0, 0, W, r * lh, 0, 0, W, r * lh);
      const cx = (hash(r) * .7 + .1) * W; o.fillStyle = '#33ff66'; o.fillRect(cx, r * lh + 8, 36, lh - 16);
    },

    irisblack(o, A, B, p) { // 默片：经典光圈收拢再打开
      const R = Math.hypot(W, H) / 2 + 20, cx = W / 2, cy = H * .48;
      o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
      const k = p < .5 ? 1 - E.inOut3(p / .5) : E.inOut3((p - .5) / .5);
      o.save(); o.beginPath(); o.arc(cx, cy, R * k, 0, TAU); o.clip(); blit(o, p < .5 ? A : B); o.restore();
      o.strokeStyle = 'rgba(0,0,0,.6)'; o.lineWidth = 40; o.filter = 'blur(12px)'; o.beginPath(); o.arc(cx, cy, R * k, 0, TAU); o.stroke(); o.filter = 'none';
    },

    dissolve(o, A, B, p) { // 粒子：画面碎成方块随风飘散
      const bs = 30, cols = Math.ceil(W / bs), rows = Math.ceil(H / bs);
      o.fillStyle = '#000'; o.fillRect(0, 0, W, H); blit(o, B, E.in2(seg(p, .3, 1)));
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = clamp(.55 * (1 - j / rows) * .6 + .45 * (.5 + .5 * noise3(i * .12, j * .12, 4)) * .8), k = seg(p, d * .6, d * .6 + .45);
        if (k >= 1) continue;
        const e = E.in2(k), x = i * bs + noise3(i * .1, j * .1, 9) * 600 * e + 200 * e, y = j * bs - 900 * e * (0.6 + hash2(i, j)), sz = bs * (1 - e);
        if (k <= 0) { o.drawImage(A, i * bs, j * bs, bs, bs, i * bs, j * bs, bs, bs); continue; }
        o.globalAlpha = 1 - e; o.drawImage(A, i * bs, j * bs, bs, bs, x, y, sz, sz);
      }
      o.globalAlpha = 1;
    },
  };

  // ---------- 主渲染 ----------
  const segs = TL.segs;
  function transitionAt(T) {
    for (let i = 1; i < segs.length; i++) {
      const s = segs[i], d = TL.transDur(s.trans), b = s.start;
      if (s.trans !== 'cut' && T >= b - d / 2 && T < b + d / 2) return { a: segs[i - 1], b: s, p: (T - (b - d / 2)) / d, type: s.trans };
    }
    return null;
  }
  function segAt(T) { for (let i = segs.length - 1; i >= 0; i--) if (T >= segs[i].start) return segs[i]; return segs[0]; }

  function renderAt(ctx, T) {
    resetCtx(ctx);
    const tr = transitionAt(T);
    if (tr) {
      const A = segTo('A', tr.a, T), B = segTo('B', tr.b, T);
      ctx.save(); T_[tr.type](ctx, A, B, clamp(tr.p), { accentA: accentOf(tr.a), accentB: accentOf(tr.b), bgB: bgOf(tr.b) }); ctx.restore(); resetCtx(ctx);
    } else drawSeg(ctx, segAt(T), T);
  }
  const T_ = T;
  window.COMPOSE = { renderAt, drawScene, segTo, transitions: T, resetCtx };
})();
