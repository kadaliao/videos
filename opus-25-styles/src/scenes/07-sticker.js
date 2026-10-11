// 07 贴纸风科普 Sticker Explainer —— "1 杯奶茶 ≈ 12 块方糖"：抠图贴纸 + 深色单位方块，方块从网格飞成柱状图。
(function () {
  const BG = '#e2e5ea', DOT = '#c3c8d1', INK = '#16171b', INK2 = '#2a2c33', ACC = '#ff5c0a', WHITE = '#ffffff', MUTE = '#7d838f';
  const TAU = Math.PI * 2;
  const SW = { willReadFrequently: true };   // 软件画布：作为 drawImage 源时快得多
  const st = {};                       // 预渲染贴纸
  let bgLayer = null;

  // ---------- 贴纸生成：原图 → 白边 → 模糊阴影 ----------
  function makeSticker(w, h, draw, border = 16) {
    const pad = border + 40, cw = Math.ceil(w + pad * 2), ch = Math.ceil(h + pad * 2);
    const art = document.createElement('canvas'); art.width = cw; art.height = ch;
    const g = art.getContext('2d', SW); g.translate(pad, pad); draw(g);
    const out = document.createElement('canvas'); out.width = cw; out.height = ch; const o = out.getContext('2d', SW);
    for (const rr of [border, border * 0.66, border * 0.33]) for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; o.drawImage(art, Math.cos(a) * rr, Math.sin(a) * rr); }
    o.globalCompositeOperation = 'source-in'; o.fillStyle = WHITE; o.fillRect(0, 0, cw, ch);
    o.globalCompositeOperation = 'source-over'; o.drawImage(art, 0, 0);
    // 白边内侧一圈极淡的灰（纸厚度感）
    const sh = document.createElement('canvas'); sh.width = cw; sh.height = ch; const s = sh.getContext('2d', SW);
    s.filter = 'blur(10px)'; s.drawImage(out, 0, 0); s.filter = 'none';
    s.globalCompositeOperation = 'source-in'; s.fillStyle = '#1b2233'; s.fillRect(0, 0, cw, ch);
    return { img: out, shadow: sh, w: cw, h: ch };
  }
  function drawSticker(ctx, s, x, y, sc = 1, rot = 0, lift = 0, alpha = 1) {
    if (sc <= 0.001 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = alpha * (0.32 - lift * 0.1);
    const so = 1 + lift * 0.05;
    ctx.drawImage(s.shadow, -s.w / 2 * sc * so + 8 + lift * 26, -s.h / 2 * sc * so + 14 + lift * 40, s.w * sc * so, s.h * sc * so);
    ctx.globalAlpha = alpha;
    ctx.drawImage(s.img, -s.w / 2 * sc, -s.h / 2 * sc, s.w * sc, s.h * sc);
    ctx.restore();
  }

  // ---------- 贴纸内容：程序化"照片" ----------
  function drawCup(g) { // 340 × 580
    const top = 186, bot = 548, tl = 24, tr = 316, bl = 66, br = 274;
    const body = () => { g.beginPath(); g.moveTo(tl, top); g.lineTo(tr, top); g.lineTo(br, bot - 10); g.quadraticCurveTo(br - 2, bot, br - 14, bot); g.lineTo(bl + 14, bot); g.quadraticCurveTo(bl + 2, bot, bl, bot - 10); g.closePath(); };
    // 吸管（盖子上方部分）
    g.save(); g.translate(208, 30); g.rotate(0.2);
    let gr = g.createLinearGradient(-18, 0, 18, 0); gr.addColorStop(0, '#d94a00'); gr.addColorStop(0.45, '#ff7a2e'); gr.addColorStop(1, '#c84300');
    g.fillStyle = gr; g.beginPath(); g.roundRect(-18, -20, 36, 300, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-9, -20, 5, 300);
    g.fillStyle = '#b53c00'; g.beginPath(); g.ellipse(0, -20, 18, 6, 0, 0, TAU); g.fill();
    g.restore();
    // 杯身：奶茶
    g.save(); body(); g.clip();
    gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, '#f1f1f1'); gr.addColorStop(0.08, '#e9e3da'); gr.addColorStop(0.1, '#d8b388'); gr.addColorStop(0.55, '#c99a66'); gr.addColorStop(1, '#a8743f');
    g.fillStyle = gr; g.fillRect(0, top, 340, bot - top);
    // 奶液流纹
    g.strokeStyle = 'rgba(255,240,220,0.35)'; g.lineWidth = 10;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(20, 250 + i * 50); g.bezierCurveTo(110, 220 + i * 50, 200, 290 + i * 50, 330, 240 + i * 52); g.stroke(); }
    // 珍珠
    const r = S.rng(7);
    for (let i = 0; i < 46; i++) {
      const x = 70 + r() * 200, y = 452 + r() * 90 - (i % 3) * 6, rad = 15 + r() * 3;
      const pg = g.createRadialGradient(x - 5, y - 6, 2, x, y, rad); pg.addColorStop(0, '#5a3a28'); pg.addColorStop(0.5, '#2a170e'); pg.addColorStop(1, '#140a05');
      g.fillStyle = pg; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x - 5, y - 6, 3.2, 0, TAU); g.fill();
    }
    // 吸管（杯内，透过液体略暗）
    g.save(); g.translate(208, 30); g.rotate(0.2); g.globalAlpha = 0.45; g.fillStyle = '#c84300'; g.fillRect(-18, 150, 36, 420); g.restore();
    // 杯套标签
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 300, 340, 104);
    g.fillStyle = INK; g.fillRect(0, 300, 340, 8); g.fillRect(0, 396, 340, 8);
    g.font = S.F(52, 'NotoSansSC', 900); g.textAlign = 'center'; g.fillText('全糖', 150, 372);
    g.fillStyle = ACC; g.beginPath(); g.arc(240, 352, 26, 0, TAU); g.fill();
    g.fillStyle = WHITE; g.font = S.F(22, 'InterXB', 800); g.fillText('100', 240, 360);
    // 塑料光泽 + 边缘暗
    gr = g.createLinearGradient(tl, 0, tr, 0); gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.12, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.42)'); gr.addColorStop(0.27, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.85, 'rgba(0,0,0,0.0)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = gr; g.fillRect(0, top, 340, bot - top);
    g.restore();
    // 杯口沿
    gr = g.createLinearGradient(0, 168, 0, 196); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#cfd3d8');
    g.fillStyle = gr; g.beginPath(); g.roundRect(8, 168, 324, 26, 10); g.fill();
    // 盖子穹顶（透明塑料）
    g.save(); g.beginPath(); g.ellipse(170, 172, 150, 108, 0, Math.PI, TAU); g.closePath(); g.clip();
    gr = g.createRadialGradient(120, 100, 10, 170, 172, 170); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(225,230,236,0.75)'); gr.addColorStop(1, 'rgba(190,198,208,0.85)');
    g.fillStyle = gr; g.fillRect(0, 60, 340, 120);
    g.restore();
    g.save(); g.translate(208, 30); g.rotate(0.2); g.globalAlpha = 0.5; g.fillStyle = '#ff7a2e'; g.fillRect(-18, 60, 36, 100); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; g.beginPath(); g.ellipse(170, 172, 128, 88, 0, Math.PI * 1.15, Math.PI * 1.45); g.stroke();
  }
  function drawCan(g) { // 190 × 320
    const w = 190;
    let gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#0d0e11'); gr.addColorStop(0.25, '#3b3e46'); gr.addColorStop(0.38, '#5d616b'); gr.addColorStop(0.5, '#2a2c32'); gr.addColorStop(1, '#0b0c0e');
    g.fillStyle = gr; g.beginPath(); g.roundRect(0, 26, w, 270, 18); g.fill();
    // 顶部铝圈
    gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9aa0a8'); gr.addColorStop(0.35, '#f4f6f8'); gr.addColorStop(0.7, '#b8bdc4'); gr.addColorStop(1, '#7c828b');
    g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, 28, w / 2 - 4, 22, 0, 0, TAU); g.fill();
    g.fillStyle = '#c9cdd3'; g.beginPath(); g.ellipse(w / 2, 26, w / 2 - 22, 14, 0, 0, TAU); g.fill();
    g.fillStyle = '#9ea4ac'; g.beginPath(); g.roundRect(w / 2 - 20, 16, 40, 16, 8); g.fill();
    g.fillStyle = gr; g.beginPath(); g.roundRect(6, 286, w - 12, 22, 10); g.fill();
    // 标签
    g.save(); g.beginPath(); g.roundRect(0, 26, w, 270, 18); g.clip();
    g.strokeStyle = WHITE; g.lineWidth = 12; g.beginPath(); g.moveTo(-10, 220); g.bezierCurveTo(60, 180, 120, 260, 210, 200); g.stroke();
    g.fillStyle = WHITE; g.font = S.F(54, 'InterXB', 800); g.textAlign = 'center'; g.fillText('COLA', w / 2, 150);
    g.font = S.F(18, 'InterXB', 800); g.fillText('330 ML · CLASSIC', w / 2, 180);
    gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0.28, 'rgba(255,255,255,0)'); gr.addColorStop(0.34, 'rgba(255,255,255,0.32)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, 320);
    g.restore();
  }
  function drawOrange(g) { // 230 × 240
    const cx = 115, cy = 135, r = 100;
    let gr = g.createRadialGradient(cx - 34, cy - 40, 8, cx, cy, r);
    gr.addColorStop(0, '#ffc46b'); gr.addColorStop(0.45, '#ff8a12'); gr.addColorStop(1, '#d95500');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    const rn = S.rng(11);
    for (let i = 0; i < 260; i++) { const a = rn() * TAU, d = Math.sqrt(rn()) * r * 0.95, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; g.fillStyle = rn() < 0.5 ? 'rgba(160,60,0,0.25)' : 'rgba(255,230,170,0.3)'; g.beginPath(); g.arc(x, y, 1.6 + rn() * 1.4, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(cx - 40, cy - 48, 22, 12, -0.6, 0, TAU); g.fill();
    g.fillStyle = '#5b3a14'; g.beginPath(); g.arc(cx + 4, cy - r + 6, 7, 0, TAU); g.fill();
    // 叶子
    g.save(); g.translate(cx + 10, cy - r + 2); g.rotate(-0.5);
    gr = g.createLinearGradient(0, -30, 80, 0); gr.addColorStop(0, '#5fbf3a'); gr.addColorStop(1, '#2d7a26');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(40, -46, 90, -10); g.quadraticCurveTo(44, 26, 0, 0); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(44, -10, 84, -10); g.stroke();
    g.restore();
  }
  function drawCube(g) { // 150 × 150：真实方糖
    const P = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
    P([[75, 6], [144, 40], [75, 74], [6, 40]], '#ffffff');
    P([[6, 40], [75, 74], [75, 148], [6, 112]], '#dde1e7');
    P([[144, 40], [75, 74], [75, 148], [144, 112]], '#c3c9d2');
    const r = S.rng(5);
    for (let i = 0; i < 220; i++) { const x = 8 + r() * 134, y = 8 + r() * 138; g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(120,130,145,0.25)'; g.fillRect(x, y, 2.2, 2.2); }
    g.globalCompositeOperation = 'destination-in'; P([[75, 6], [144, 40], [144, 112], [75, 148], [6, 112], [6, 40]], '#000'); g.globalCompositeOperation = 'source-over';
  }
  function drawEq(g) { g.fillStyle = ACC; g.beginPath(); g.roundRect(0, 0, 120, 34, 17); g.fill(); g.beginPath(); g.roundRect(0, 62, 120, 34, 17); g.fill(); }
  function drawTitleText(g) { g.fillStyle = INK; g.font = S.F(124, 'NotoSansSC', 900); g.textBaseline = 'top'; g.fillText('贴纸风科普', 0, 0); }

  // ---------- 单位方块 ----------
  const TS = 96, TG = 14;          // 网格方块
  const BS = 80, BGAP = 10;        // 柱状图方块
  function tile(ctx, x, y, s, lift = 0, accent = 0, flip = 1) {
    // x,y = 中心；lift 0..1；flip = 纵向缩放（翻面）
    ctx.save(); ctx.translate(x, y);
    const sc = 1 + lift * 0.12;
    // 阴影
    ctx.fillStyle = `rgba(20,26,40,${0.16 + lift * 0.06})`;
    ctx.beginPath(); ctx.roundRect(-s / 2 * sc + 3 + lift * 18, -s / 2 * sc * flip + 7 + lift * 30, s * sc, s * sc * flip, s * 0.2); ctx.fill();
    ctx.fillStyle = `rgba(20,26,40,${0.07 + lift * 0.05})`;
    ctx.beginPath(); ctx.roundRect(-s / 2 * sc + 6 + lift * 26, -s / 2 * sc * flip + 14 + lift * 44, s * sc, s * sc * flip, s * 0.22); ctx.fill();
    ctx.scale(sc, sc * flip);
    ctx.fillStyle = accent ? ACC : INK; ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.2); ctx.fill();
    ctx.fillStyle = accent ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)'; ctx.beginPath(); ctx.roundRect(-s / 2 + 4, -s / 2 + 4, s - 8, s * 0.36, [s * 0.16, s * 0.16, 4, 4]); ctx.fill();
    ctx.restore();
  }

  // 网格槽位（A 段）：3 列 × 4 行
  const GX = 612, GY = 770;
  const gridPos = i => ({ x: GX + (i % 3) * (TS + TG) + TS / 2, y: GY + Math.floor(i / 3) * (TS + TG) + TS / 2 });
  // 柱状图（B 段）
  const BASE = 1352, BARX = [262, 540, 818], VALS = [12, 9, 5];
  const barPos = (b, i) => ({ x: BARX[b] + (i % 2 === 0 ? -1 : 1) * (BS + BGAP) / 2, y: BASE - Math.floor(i / 2) * (BS + BGAP) - BS / 2 });
  const LINE_Y = BASE - 3 * (BS + BGAP) + BGAP / 2 - 1;

  const landA = i => 0.5 + i * 0.075;                 // A 段方块落位时刻
  const flyStart = i => 1.86 + i * 0.03, FLY = 0.42;  // 网格 → 柱 1
  const dropB = (b, i) => (b === 1 ? 2.36 : 2.62) + i * 0.045; // 柱 2、3 的方块落下（结束时刻）

  function landing(S, t, tl) { // 落地压扁回弹：返回 scale 修正
    const d = t - tl; if (d < 0) return 1; return 1 - 0.12 * Math.exp(-14 * d) * Math.cos(d * 34);
  }

  function drawTilesA(ctx, t, S) {
    for (let i = 0; i < 12; i++) {
      const p = gridPos(i), tl = landA(i), fs = flyStart(i);
      if (t >= fs) continue;           // 已经起飞（由 B 段负责）
      if (t < tl - 0.3) continue;
      if (t < tl) { const k = (t - (tl - 0.3)) / 0.3, e = S.E.in2(k); tile(ctx, p.x - 30 * (1 - e), p.y - 160 * (1 - e), TS, 1 - e); continue; }
      const sq = landing(S, t, tl);
      ctx.save(); ctx.translate(p.x, p.y + TS / 2); ctx.scale(2 - sq, sq); ctx.translate(-p.x, -p.y - TS / 2); tile(ctx, p.x, p.y, TS, 0); ctx.restore();
    }
  }
  function drawTilesB(ctx, t, S) {
    // 柱 1：来自网格的 12 块
    const flips = (b, i) => { // 超出建议线的方块在 3.5 后翻成强调色
      if (i < 6) return { a: 0, f: 1 };
      const t0 = 3.42 + (b * 6 + (i - 6)) * 0.035, k = S.seg(t, t0, t0 + 0.2);
      return { a: k >= 0.5 ? 1 : 0, f: k <= 0 || k >= 1 ? 1 : Math.max(0.06, Math.abs(Math.cos(k * Math.PI))) };
    };
    const order = [];
    for (let i = 0; i < 12; i++) order.push([0, i]);
    for (let i = 0; i < 9; i++) order.push([1, i]);
    for (let i = 0; i < 5; i++) order.push([2, i]);
    for (const [b, i] of order) {
      const q = barPos(b, i), fl = flips(b, i);
      if (b === 0) {
        const fs = flyStart(i); if (t < fs) continue;
        const k = S.seg(t, fs, fs + FLY), p = gridPos(i);
        if (k < 1) {
          const e = S.E.inOut3(k), lift = Math.sin(k * Math.PI);
          tile(ctx, S.lerp(p.x, q.x, e), S.lerp(p.y, q.y, e) - 120 * lift, S.lerp(TS, BS, e), lift); continue;
        }
        const sq = landing(S, t, fs + FLY);
        ctx.save(); ctx.translate(q.x, q.y + BS / 2); ctx.scale(2 - sq, sq); ctx.translate(-q.x, -q.y - BS / 2); tile(ctx, q.x, q.y, BS, 0, fl.a, fl.f); ctx.restore();
      } else {
        const tl = dropB(b, i); if (t < tl - 0.28) continue;
        if (t < tl) { const k = (t - tl + 0.28) / 0.28, e = S.E.in2(k); tile(ctx, q.x, q.y - 260 * (1 - e), BS, 1 - e); continue; }
        const sq = landing(S, t, tl);
        ctx.save(); ctx.translate(q.x, q.y + BS / 2); ctx.scale(2 - sq, sq); ctx.translate(-q.x, -q.y - BS / 2); tile(ctx, q.x, q.y, BS, 0, fl.a, fl.f); ctx.restore();
      }
    }
  }

  const pop = (S, t, t0, d = 0.38, s = 2.4) => t <= t0 ? 0 : t >= t0 + d ? 1 : S.E.outBack((t - t0) / d, s);

  // 带运动模糊的水平推移：把 fn 画到离屏层，再沿 x 叠加多次
  function whip(ctx, S, key, dx, vx, fn, y0 = 0, h = S.H) {
    const blur = Math.min(260, Math.abs(vx));
    if (blur < 4) { ctx.save(); ctx.translate(dx, 0); fn(ctx); ctx.restore(); return; }
    const c = S.layer('s07-' + key, S.W, h), g = c.getContext('2d', SW);
    g.setTransform(1, 0, 0, 1, 0, -y0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, y0, S.W, h); fn(g);
    const n = 7;
    ctx.save();
    for (let i = 0; i < n; i++) { ctx.globalAlpha = 1 / (i + 1) * 1.0; ctx.drawImage(c, dx + (i / (n - 1) - 0.5) * blur * Math.sign(vx), y0); }
    ctx.restore();
  }

  function header(ctx, S, text, x, y, sub) {
    ctx.fillStyle = INK; ctx.font = S.F(60, 'NotoSansSC', 900); ctx.textBaseline = 'alphabetic'; ctx.fillText(text, x, y);
    ctx.fillStyle = MUTE; ctx.font = S.F(26, 'InterXB', 800); ctx.letterSpacing = '3px'; ctx.fillText(sub, x + 2, y + 46); ctx.letterSpacing = '0px';
  }
  function chip(ctx, S, text, x, y, col = INK, fg = WHITE, size = 34) {
    ctx.font = S.F(size, 'NotoSansSC', 900); const w = ctx.measureText(text).width + size * 1.1, h = size * 1.7;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---------- A 段（0 – 2s）：奶茶贴纸 = 12 块 ----------
  function partA(g, t, S) {
    const k = pop(S, t, 0.0, 0.5, 1.8), wob = Math.sin(t * 3.1) * 0.025 + Math.sin(t * Math.PI * 2) * 0.008;
    drawSticker(g, st.cup, 296, 985, 0.98 * (0.4 + 0.6 * k) * (1 + 0.012 * S.pulse(t, 10)), -0.1 + (1 - k) * -0.5 + wob, 1 - S.E.out3(S.seg(t, 0, 0.45)), S.clamp(k * 3));
    drawSticker(g, st.eq, 548, 985, 0.62 * pop(S, t, 0.42, 0.35, 3), 0.06);
    // 计数
    let n = 0; for (let i = 0; i < 12; i++) if (t >= landA(i)) n++;
    const ck = pop(S, t, 0.5, 0.3, 2);
    if (ck > 0) {
      g.save(); g.translate(604, 1352); g.scale(ck, ck);
      g.fillStyle = ACC; g.font = S.F(140, 'InterXB', 800); g.textBaseline = 'alphabetic';
      const w = g.measureText('12').width; g.textAlign = 'right'; g.fillText(String(n), w, 0); g.textAlign = 'left';
      g.fillStyle = INK; g.font = S.F(58, 'NotoSansSC', 900); g.fillText('块方糖', w + 12, -12);
      g.restore();
    }
    // 图例：■ = 1 块方糖 (4 g)
    const lg = pop(S, t, 1.4, 0.35, 2.6);
    if (lg > 0) {
      g.save(); g.translate(630, 1462); g.scale(lg, lg);
      tile(g, 0, 0, 58, 0);
      g.fillStyle = INK; g.font = S.F(52, 'InterXB', 800); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('=', 70, 2);
      g.restore();
      drawSticker(g, st.cube, 800, 1458, 0.56 * lg, 0.14 + Math.sin(t * 4) * 0.04);
      g.save(); g.globalAlpha = S.clamp(lg); g.fillStyle = MUTE; g.font = S.F(34, 'InterXB', 800); g.textBaseline = 'middle'; g.fillText('4 g', 866, 1464); g.restore();
    }
    chip(g, S, '1 杯全糖奶茶', 296, 1350, INK, WHITE, 36);
    g.fillStyle = MUTE; g.font = S.F(28, 'InterXB', 800); g.fillText('≈ 48 g SUGAR', 214, 1426);
  }
  function headerA(g, t, S) { header(g, S, '一杯奶茶里有多少糖？', 82, 650, 'HOW MUCH SUGAR IS IN ONE CUP?'); }

  // ---------- B 段（2 – 4s）：柱状图 ----------
  function partB(g, t, S, dx = 0) {
    // 坐标轴
    const ax = S.E.outExpo(S.seg(t, 2.0, 2.4));
    g.fillStyle = INK; g.beginPath(); g.roundRect(80, BASE + 8, 860 * ax, 8, 4); g.fill();
    // 标签贴纸
    const icons = [[st.cupS, 0], [st.can, 1], [st.orange, 2]];
    const names = ['奶茶', '可乐', '橙汁'];
    for (const [s, b] of icons) {
      const t0 = 2.05 + b * 0.07, k = S.E.outExpo(S.seg(t, t0, t0 + 0.32)), x = BARX[b] + (1 - k) * 900;
      const rot = [-0.12, 0.1, -0.06][b] + Math.sin(t * 3 + b) * 0.02;
      const vx = (1 - S.E.outExpo(S.seg(t + 0.02, t0, t0 + 0.32))) * 900 - (1 - k) * 900;
      const blurN = Math.min(6, Math.abs(vx) / 8);
      for (let j = 0; j <= blurN; j++) drawSticker(g, s, x + j * 18, 1462, [0.44, 0.6, 0.66][b], rot, 0, j === 0 ? 1 : 0.18);
      if (k > 0.6) chip(g, S, names[b], BARX[b] + (1 - k) * 900 + 8, 1540, INK, WHITE, 30);
    }
    // 数值
    VALS.forEach((v, b) => {
      const last = b === 0 ? flyStart(11) + FLY : dropB(b, v - 1), k = pop(S, t, last, 0.35, 3);
      if (k <= 0) return;
      const topY = BASE - Math.ceil(v / 2) * (BS + BGAP) - 22;
      g.save(); g.translate(BARX[b], topY); g.scale(k, k);
      g.fillStyle = b === 0 ? ACC : INK; g.font = S.F(b === 0 ? 96 : 76, 'InterXB', 800); g.textAlign = 'center'; g.fillText(String(v), 0, 0);
      g.restore();
    });
    // 建议线
    const lk = S.E.outExpo(S.seg(t, 2.98, 3.4));
    if (lk > 0) {
      g.save(); g.strokeStyle = ACC; g.lineWidth = 6; g.setLineDash([18, 12]); g.lineDashOffset = -t * 40;
      g.beginPath(); g.moveTo(80, LINE_Y); g.lineTo(80 + 860 * lk, LINE_Y); g.stroke(); g.restore();
      const ck = pop(S, t, 3.12, 0.35, 2.4);
      if (ck > 0) {
        const lx = 790, ly = 846, lx2 = 680;
        g.save(); g.strokeStyle = ACC; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(lx2, ly + 30); g.lineTo(lx2, ly + 30 + (LINE_Y - ly - 30) * S.E.out3(S.seg(t, 3.12, 3.35))); g.stroke();
        g.fillStyle = ACC; g.beginPath(); g.arc(lx2, LINE_Y, 11 * S.E.outBack(S.seg(t, 3.25, 3.45)), 0, TAU); g.fill(); g.restore();
        g.save(); g.translate(lx, ly); g.scale(ck, ck); g.rotate(-0.05);
        g.fillStyle = 'rgba(20,26,40,0.18)'; g.beginPath(); g.roundRect(-150 + 6, -36 + 10, 300, 72, 36); g.fill();
        g.fillStyle = WHITE; g.beginPath(); g.roundRect(-160, -44, 320, 88, 44); g.fill();
        chip(g, S, '每日建议 ≤ 6 块', 0, 0, ACC, WHITE, 32); g.restore();
      }
    }
  }
  function headerB(g, t, S) { header(g, S, '一杯 ≈ 几块方糖？', 82, 650, 'SUGAR PER DRINK · 1 TILE = 4 g'); }

  // ---------- 标题 ----------
  function title(ctx, t, S) {
    const k0 = pop(S, t, -0.02, 0.4, 2.2);
    if (k0 > 0) {
      ctx.save(); ctx.translate(165, 300); ctx.rotate(-0.05 * (1 - k0) + 0.0); ctx.scale(k0, k0);
      tile(ctx, 0, 0, 180, 0.15 * S.pulse(t, 7));
      ctx.fillStyle = WHITE; ctx.font = S.F(108, 'InterXB', 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('07', 0, 6);
      ctx.restore();
    }
    const k1 = pop(S, t, 0.1, 0.45, 1.8);
    drawSticker(ctx, st.title, 600, 285, 1.0 * (0.5 + 0.5 * k1), -0.035 + (1 - k1) * 0.25, 1 - S.E.out3(S.seg(t, 0.1, 0.55)), S.clamp(k1 * 3));
    const k2 = pop(S, t, 0.28, 0.4, 2.6);
    if (k2 > 0) {
      ctx.save(); ctx.translate(560, 420); ctx.rotate(0.025); ctx.scale(k2, k2);
      ctx.font = S.F(40, 'InterXB', 800); ctx.letterSpacing = '4px'; const w = ctx.measureText('STICKER EXPLAINER').width + 56;
      ctx.fillStyle = 'rgba(20,26,40,0.18)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -34 + 10, w, 68, 34); ctx.fill();
      ctx.fillStyle = WHITE; ctx.beginPath(); ctx.roundRect(-w / 2 - 8, -42, w + 16, 84, 42); ctx.fill();
      ctx.fillStyle = ACC; ctx.beginPath(); ctx.roundRect(-w / 2, -34, w, 68, 34); ctx.fill();
      ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STICKER EXPLAINER', 2, 3);
      ctx.restore();
    }
  }

  registerScene({
    n: 7, key: 'sticker', zh: '贴纸风科普', en: 'Sticker Explainer',
    bg: BG, accent: ACC,
    init(S) {
      st.cup = makeSticker(340, 560, drawCup, 18);
      st.cupS = st.cup;
      st.can = makeSticker(190, 312, drawCan, 16);
      st.orange = makeSticker(230, 240, drawOrange, 16);
      st.cube = makeSticker(150, 150, drawCube, 14);
      st.eq = makeSticker(120, 96, drawEq, 14);
      st.title = makeSticker(640, 140, drawTitleText, 16);
      // 背景：冷灰 + 点阵
      bgLayer = document.createElement('canvas'); bgLayer.width = S.W; bgLayer.height = S.H;
      const g = bgLayer.getContext('2d', SW);
      const gr = g.createLinearGradient(0, 0, S.W * 0.4, S.H); gr.addColorStop(0, '#eceef2'); gr.addColorStop(1, '#dadee4');
      g.fillStyle = gr; g.fillRect(0, 0, S.W, S.H);
      g.fillStyle = DOT; for (let y = 18; y < S.H; y += 40) for (let x = 20; x < S.W; x += 40) { g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
    },
    draw(ctx, t, S) {
      ctx.drawImage(bgLayer, 0, 0);
      // 网格槽位（虚线）
      const slotA = 1 - S.seg(t, 1.9, 2.15);
      if (slotA > 0) {
        ctx.save(); ctx.globalAlpha = slotA; ctx.strokeStyle = '#a9afba'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        for (let i = 0; i < 12; i++) { const p = gridPos(i); ctx.beginPath(); ctx.roundRect(p.x - TS / 2 + 3, p.y - TS / 2 + 3, TS - 6, TS - 6, 18); ctx.stroke(); }
        ctx.restore();
      }
      // A → B：快速推移 + 运动模糊
      const w0 = 1.9, w1 = 2.16;
      const pk = S.seg(t, w0, w1), e = S.E.inExpo(pk), dxA = -1150 * e;
      const vxA = -1150 * (S.E.inExpo(S.seg(t + 0.017, w0, w1)) - e) * 6;
      if (t < w1) {
        whip(ctx, S, 'a', dxA, vxA, g => { partA(g, t, S); headerA(g, t, S); }, 560, 1000);
      }
      if (t >= w0 + 0.08) {
        const kb = S.seg(t, w0 + 0.08, w0 + 0.36), eb = S.E.outExpo(kb), dxB = 1150 * (1 - eb);
        const vxB = -1150 * (S.E.outExpo(S.seg(t + 0.017, w0 + 0.08, w0 + 0.36)) - eb) * 6;
        whip(ctx, S, 'h', dxB, vxB, g => headerB(g, t, S), 570, 150);
        partB(ctx, t, S);
      }
      drawTilesA(ctx, t, S);
      drawTilesB(ctx, t, S);
      title(ctx, t, S);
    },
  });
})();
