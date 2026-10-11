// 19 波普漫画 Pop-art Comic（Lichtenstein / 漫画书）
// 三格漫画：手指按下红色大按钮（1.0，冲击变焦）→ 金发女郎的眼睛"这是…AI？！"（1.5）→ "BOOM!" 爆炸星芒破格而出（2.0）。
// 本戴点网点、粗黑描边、三原色 + 黑白、对白气泡、速度线、标题为漫画旁白框。
(function () {
  const { TAU } = S;
  const YEL = '#ffe100', RED = '#e8212b', CYAN = '#00a6e0', BLK = '#111111', WHT = '#ffffff', PAPER = '#fdf6e3', SKIN = '#fff3e6', BLUE = '#1f4fbf';
  const PANELS = {
    A: { x: 70, y: 500, w: 940, h: 560, t0: -9 },
    B: { x: 70, y: 1082, w: 452, h: 458, t0: 0.5 },
    C: { x: 544, y: 1082, w: 466, h: 458, t0: 0.75 },
  };
  const pats = new Map();
  // 本戴点图案（缓存）：颜色、间距、半径
  function benday(ctx, color, sp, r, ox = 0, oy = 0, ang = 0.4) {
    const key = color + sp + r; let p = pats.get(key);
    if (!p) {
      const c = document.createElement('canvas'); c.width = c.height = sp * 2; const g = c.getContext('2d'); g.fillStyle = color;
      for (const [x, y] of [[0, 0], [sp, sp], [sp * 2, 0], [0, sp * 2], [sp * 2, sp * 2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      p = { c }; pats.set(key, p);
    }
    const pat = ctx.createPattern(p.c, 'repeat'); pat.setTransform(new DOMMatrix().translate(ox, oy).rotate(ang * 57.2958));
    return pat;
  }
  const shimmer = t => (S.beatIndex(t) % 2) * 3; // 每拍网点轻微错位

  function outline(ctx, w = 8) { ctx.lineWidth = w; ctx.strokeStyle = BLK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  function fillDots(ctx, base, dot, sp, r, t, ang) { ctx.fillStyle = base; ctx.fill(); ctx.fillStyle = benday(ctx, dot, sp, r, shimmer(t), shimmer(t), ang); ctx.fill(); }

  // ---------- 面板 ----------
  function panel(ctx, P, t, fn) {
    if (t < P.t0) return;
    const k = S.seg(t, P.t0, P.t0 + 0.18), s = 1 + 0.14 * (1 - S.E.outBack(k, 2.2));
    ctx.save(); ctx.translate(P.x + P.w / 2, P.y + P.h / 2); ctx.scale(s, s); ctx.rotate((1 - k) * 0.05); ctx.translate(-P.w / 2, -P.h / 2);
    ctx.fillStyle = BLK; ctx.fillRect(10, 12, P.w, P.h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, P.w, P.h); ctx.clip(); fn(ctx, P.w, P.h); ctx.restore();
    ctx.strokeStyle = BLK; ctx.lineWidth = 9; ctx.strokeRect(0, 0, P.w, P.h);
    if (k < 1) { ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.fillRect(0, 0, P.w, P.h); }
    ctx.restore();
  }
  function speedLines(ctx, cx, cy, n, r0, r1, seed, w = 1) {
    ctx.fillStyle = BLK;
    for (let i = 0; i < n; i++) {
      const a = (i + S.hash(i + seed) * 0.6) / n * TAU, d = 0.006 + S.hash(i * 3 + seed) * 0.014 * w, rr = r0 + S.hash(i * 7 + seed) * 120;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      ctx.lineTo(cx + Math.cos(a - d) * r1, cy + Math.sin(a - d) * r1); ctx.lineTo(cx + Math.cos(a + d) * r1, cy + Math.sin(a + d) * r1); ctx.closePath(); ctx.fill();
    }
  }
  function bubble(ctx, x, y, w, h, tx, ty, k) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const path = () => {
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
      ctx.moveTo(tx * 0.25 - 26, h * 0.32); ctx.quadraticCurveTo(tx * 0.6, ty * 0.6, tx, ty); ctx.quadraticCurveTo(tx * 0.4 + 10, ty * 0.4, tx * 0.25 + 30, h * 0.36);
    };
    ctx.save(); ctx.translate(8, 9); path(); ctx.fillStyle = BLK; ctx.fill(); ctx.restore();
    path(); ctx.fillStyle = WHT; ctx.fill(); outline(ctx, 7);
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2 - 3.5, h / 2 - 3.5, 0, 0, TAU); ctx.fillStyle = WHT; ctx.fill();
    ctx.restore();
  }
  function burstPath(ctx, R, n, seed, jag = 0.42) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + S.hash(i + seed) * 0.08, r = i % 2 ? R * (1 - jag + S.hash(i * 3 + seed) * 0.12) : R * (0.86 + S.hash(i * 5 + seed) * 0.22); ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.9); }
    ctx.closePath();
  }
  function comicText(ctx, txt, x, y, size, fill, ext = 10, font = 'Bangers', stroke = 12) {
    ctx.save(); ctx.font = S.F(size, font, font === 'NotoSansSC' ? 900 : ''); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.fillStyle = BLK; ctx.strokeStyle = BLK; ctx.lineWidth = stroke;
    for (let i = ext; i > 0; i -= 2) { ctx.strokeText(txt, x + i, y + i); ctx.fillText(txt, x + i, y + i); }
    ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y);
    ctx.restore();
  }

  // ---------- 手 ----------
  function hand(ctx, t) {
    // 指尖在原点，手指朝下
    ctx.lineJoin = 'round';
    // 袖子
    ctx.beginPath(); ctx.moveTo(-60, -420); ctx.lineTo(170, -440); ctx.lineTo(200, -900); ctx.lineTo(-90, -900); ctx.closePath(); fillDots(ctx, RED, '#a5101a', 16, 3.2, t, 0.3); outline(ctx, 10);
    ctx.beginPath(); ctx.moveTo(-70, -400); ctx.lineTo(175, -418); ctx.lineTo(180, -480); ctx.lineTo(-66, -470); ctx.closePath(); ctx.fillStyle = WHT; ctx.fill(); outline(ctx, 9);
    ctx.beginPath(); ctx.moveTo(40, -410); ctx.lineTo(42, -475); ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = BLK; ctx.beginPath(); ctx.arc(100, -445, 8, 0, TAU); ctx.fill();
    // 手掌 + 卷起的手指
    const palm = () => {
      ctx.beginPath(); ctx.moveTo(-34, -230); ctx.bezierCurveTo(-60, -280, -66, -360, -50, -405); ctx.lineTo(160, -415);
      ctx.bezierCurveTo(186, -360, 188, -300, 168, -250); ctx.bezierCurveTo(150, -205, 110, -190, 60, -196); ctx.lineTo(30, -230); ctx.closePath();
    };
    palm(); fillDots(ctx, SKIN, '#f05a5a', 13, 3.0, t, 0.5); outline(ctx, 10);
    // 弯曲手指褶线
    ctx.lineWidth = 7; ctx.strokeStyle = BLK;
    for (const [y0, x1] of [[-300, 168], [-250, 160]]) { ctx.beginPath(); ctx.moveTo(60, y0 + 30); ctx.quadraticCurveTo(110, y0 - 6, x1 + 4, y0); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(70, -205); ctx.quadraticCurveTo(100, -230, 150, -230); ctx.stroke();
    // 食指
    ctx.beginPath(); ctx.moveTo(-30, -250); ctx.lineTo(-28, -40); ctx.bezierCurveTo(-28, 6, 30, 6, 30, -40); ctx.lineTo(34, -230); ctx.closePath();
    fillDots(ctx, SKIN, '#f05a5a', 13, 3.0, t, 0.5); outline(ctx, 10);
    ctx.beginPath(); ctx.moveTo(-14, -150); ctx.quadraticCurveTo(2, -142, 18, -150); ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -120); ctx.quadraticCurveTo(2, -112, 18, -120); ctx.stroke();
    // 指甲
    ctx.beginPath(); ctx.moveTo(-16, -40); ctx.bezierCurveTo(-16, -6, 18, -6, 18, -40); ctx.lineTo(16, -58); ctx.quadraticCurveTo(0, -64, -14, -58); ctx.closePath(); ctx.fillStyle = WHT; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
    // 拇指
    ctx.beginPath(); ctx.moveTo(-48, -330); ctx.bezierCurveTo(-30, -300, 10, -290, 40, -300); ctx.bezierCurveTo(60, -306, 56, -332, 30, -334); ctx.bezierCurveTo(0, -336, -20, -350, -40, -372);
    fillDots(ctx, SKIN, '#f05a5a', 13, 3.0, t, 0.5); outline(ctx, 9);
  }
  function button(ctx, x, y, press, t) {
    ctx.save(); ctx.translate(x, y);
    // 底座
    ctx.beginPath(); ctx.moveTo(-210, 0); ctx.lineTo(210, 0); ctx.lineTo(250, 110); ctx.lineTo(-250, 110); ctx.closePath(); fillDots(ctx, YEL, '#e0a800', 14, 3.6, t, 0.4); outline(ctx, 10);
    ctx.beginPath(); ctx.rect(-250, 110, 500, 50); fillDots(ctx, '#f0b400', BLK, 12, 2.6, t, 0.4); outline(ctx, 10);
    // 圆顶（按下时压扁）
    const hgt = 130 * (1 - 0.55 * press);
    ctx.beginPath(); ctx.ellipse(0, 0, 175, 40, 0, 0, Math.PI); ctx.ellipse(0, 0, 175, hgt, 0, Math.PI, TAU); ctx.closePath();
    fillDots(ctx, RED, '#9e0f17', 14, 4.2, t, 0.4); outline(ctx, 10);
    ctx.beginPath(); ctx.ellipse(0, 4, 175, 40, 0, 0, Math.PI); ctx.lineWidth = 6; ctx.strokeStyle = BLK; ctx.stroke();
    // 高光（Lichtenstein 式白色反光块）
    ctx.beginPath(); ctx.ellipse(-70, -hgt * 0.55, 46, 20 * (1 - 0.3 * press), -0.5, 0, TAU); ctx.fillStyle = WHT; ctx.fill(); outline(ctx, 5);
    ctx.beginPath(); ctx.ellipse(-12, -hgt * 0.82, 16, 9, -0.3, 0, TAU); ctx.fillStyle = WHT; ctx.fill(); outline(ctx, 4);
    ctx.restore();
  }

  // ---------- 面板内容 ----------
  function panelA(ctx, w, h, t) {
    const press = t < 1.0 ? 0 : 1;
    const punch = t >= 1.0 ? 1 + 0.12 * Math.exp(-(t - 1.0) * 7) * Math.cos((t - 1.0) * 30) : 1;
    ctx.fillStyle = CYAN; ctx.fillRect(0, 0, w, h); ctx.fillStyle = benday(ctx, '#0a7fb8', 18, 5, shimmer(t), 0, 0.4); ctx.fillRect(0, 0, w, h);
    const bx = 370, by = 400;
    ctx.save(); ctx.translate(bx, by - 40); ctx.scale(punch, punch); ctx.translate(-bx, -(by - 40));
    // 冲击：黄色放射 + 速度线
    if (t >= 1.0) {
      const k = S.E.out3(S.seg(t, 1.0, 1.2));
      ctx.save(); ctx.translate(bx, by - 30); ctx.fillStyle = YEL; ctx.strokeStyle = BLK; burstPath(ctx, 300 * k + 15 * S.pulse(t, 8), 16, 7, 0.38); ctx.fill(); outline(ctx, 8); ctx.restore();
      speedLines(ctx, bx, by - 30, 46, 330, 1200, 3);
    } else speedLines(ctx, bx, by - 30, 30, 420, 1200, 5, 0.5);
    button(ctx, bx, by, press, t);
    // 手：从右上方伸下来，1.0 按到
    const k = S.E.in3(S.seg(t, 0.15, 1.0)), hx = S.lerp(980, bx + 20, k), hy = S.lerp(40, by - 120 + 40 * press, k) + (t >= 1.0 ? 18 : 0);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(S.lerp(0.95, 0.55, k)); ctx.scale(0.78, 0.78); hand(ctx, t); ctx.restore();
    // 小星芒文字
    if (t >= 1.0) { const kk = S.E.outBack(S.seg(t, 1.0, 1.2), 3); ctx.save(); ctx.translate(760, 470); ctx.rotate(0.12); ctx.scale(kk, kk); ctx.fillStyle = WHT; burstPath(ctx, 110, 12, 21, 0.3); ctx.fill(); outline(ctx, 7); comicText(ctx, 'CLICK!', 0, 22, 74, RED, 6); ctx.restore(); }
    ctx.restore();
    // 对白气泡（0.5）
    const kb = t >= 0.5 ? S.E.outBack(S.seg(t, 0.5, 0.72), 3) : 0;
    if (kb > 0) {
      bubble(ctx, 255, 215, 400, 180, 120, 150, kb);
      ctx.save(); ctx.translate(255, 215); ctx.scale(kb, kb); ctx.fillStyle = BLK; ctx.textAlign = 'center';
      ctx.font = S.F(64, 'NotoSansSC', 900); ctx.fillText('就是现在！', 0, 4); ctx.font = S.F(44, 'Bangers'); ctx.fillText('PRESS IT, BABY!', 0, 58); ctx.restore();
    }
    // 旁白框
    ctx.fillStyle = YEL; ctx.fillRect(0, 0, 330, 70); ctx.lineWidth = 7; ctx.strokeStyle = BLK; ctx.strokeRect(0, 0, 330, 70);
    ctx.fillStyle = BLK; ctx.font = S.F(40, 'Bangers'); ctx.textAlign = 'left'; ctx.fillText('ONE BUTTON LATER...', 18, 50);
  }
  function panelB(ctx, w, h, t) {
    const shock = t >= 1.25 ? S.E.outBack(S.seg(t, 1.25, 1.45), 3) : 0;
    ctx.fillStyle = SKIN; ctx.fillRect(0, 0, w, h); ctx.fillStyle = benday(ctx, '#f26d6d', 15, 3.8, shimmer(t), 0, 0.5); ctx.fillRect(0, 0, w, h);
    // 金发
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, 50); ctx.bezierCurveTo(w * 0.7, 30, w * 0.35, 90, 0, 160); ctx.closePath(); ctx.fillStyle = YEL; ctx.fill(); outline(ctx, 9);
    ctx.lineWidth = 6; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(w * (0.15 + i * 0.16), 0); ctx.bezierCurveTo(w * (0.1 + i * 0.14), 50, w * (0.05 + i * 0.12), 90, w * (0.02 + i * 0.1), 120 + i * 4 - i * i * 3); ctx.stroke(); }
    // 眉
    ctx.beginPath(); ctx.moveTo(70, 205 - shock * 18); ctx.quadraticCurveTo(220, 145 - shock * 30, 390, 190 - shock * 14); ctx.quadraticCurveTo(220, 168 - shock * 30, 70, 222 - shock * 18); ctx.closePath(); ctx.fillStyle = BLK; ctx.fill();
    // 眼
    const ey = 318, open = 1 + 0.25 * shock;
    const eyeP = () => { ctx.beginPath(); ctx.moveTo(60, ey); ctx.bezierCurveTo(150, ey - 120 * open, 320, ey - 120 * open, 400, ey - 10); ctx.bezierCurveTo(310, ey + 70 * open, 150, ey + 70 * open, 60, ey); ctx.closePath(); };
    eyeP(); ctx.fillStyle = WHT; ctx.fill();
    ctx.save(); eyeP(); ctx.clip();
    const ir = 70, ix = 236, iy = ey - 14;
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fillStyle = CYAN; ctx.fill(); ctx.fillStyle = benday(ctx, BLUE, 12, 3.6, 0, 0, 0.4); ctx.fill(); outline(ctx, 6);
    ctx.beginPath(); ctx.arc(ix, iy, 30 * (1 - 0.4 * shock), 0, TAU); ctx.fillStyle = BLK; ctx.fill();
    ctx.beginPath(); ctx.ellipse(ix + 28, iy - 30, 20, 13, -0.5, 0, TAU); ctx.fillStyle = WHT; ctx.fill();
    ctx.restore();
    eyeP(); outline(ctx, 10);
    // 睫毛
    ctx.lineWidth = 11; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const u = 0.1 + i * 0.13, x = 60 + u * 340, y = ey - Math.sin(u * Math.PI) * 88 * open - 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4 + u * 20, y - 34, x + 18 + u * 26, y - 52); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(60, ey); ctx.lineTo(28, ey - 14); ctx.stroke();
    // 眼泪（2.4 起滑下）
    const tk = S.E.inOut2(S.seg(t, 2.4, 3.6)), tx = 120 - tk * 12, ty = ey + 60 + tk * 120;
    if (t > 2.3) {
      const s = S.E.outBack(S.seg(t, 2.3, 2.5), 3);
      ctx.save(); ctx.translate(tx, ty); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.bezierCurveTo(20, -10, 30, 10, 26, 22); ctx.bezierCurveTo(20, 46, -20, 46, -26, 22); ctx.bezierCurveTo(-30, 10, -20, -10, 0, -46); ctx.closePath();
      ctx.fillStyle = '#bfe9ff'; ctx.fill(); outline(ctx, 6);
      ctx.beginPath(); ctx.ellipse(-8, 12, 7, 12, 0.3, 0, TAU); ctx.fillStyle = WHT; ctx.fill();
      ctx.restore();
    }
    // 对白（1.5）
    const kb = t >= 1.5 ? S.E.outBack(S.seg(t, 1.5, 1.7), 3) : 0;
    if (kb > 0) {
      bubble(ctx, 236, 395, 380, 120, 60, -70, kb);
      ctx.save(); ctx.translate(236, 395); ctx.scale(kb, kb); ctx.fillStyle = BLK; ctx.textAlign = 'center'; ctx.font = S.F(54, 'NotoSansSC', 900); ctx.fillText('这是…AI？！', 0, 18); ctx.restore();
    }
    ctx.fillStyle = YEL; ctx.fillRect(w - 230, 0, 230, 60); ctx.lineWidth = 7; ctx.strokeStyle = BLK; ctx.strokeRect(w - 230, 0, 230, 60);
    ctx.fillStyle = BLK; ctx.font = S.F(36, 'Bangers'); ctx.textAlign = 'center'; ctx.fillText('MEANWHILE...', w - 115, 44);
  }
  function panelC(ctx, w, h, t) {
    ctx.fillStyle = RED; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2 + 10); ctx.rotate(t * 0.15);
    ctx.fillStyle = '#ff5a3c'; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 700, a, a + TAU / 36); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = benday(ctx, '#b80f18', 16, 4, shimmer(t), 0, 0.4); ctx.fillRect(0, 0, w, h);
    if (t < 2.0) {
      // 引线 + 倒计时感
      const k = S.seg(t, 0.75, 2.0);
      ctx.save(); ctx.translate(w / 2, h / 2 + 30);
      ctx.beginPath(); ctx.arc(0, 30, 92, 0, TAU); ctx.fillStyle = BLK; ctx.fill(); ctx.fillStyle = benday(ctx, '#444', 10, 2.6, 0, 0, 0.4); ctx.fill(); outline(ctx, 6);
      ctx.beginPath(); ctx.ellipse(-30, 0, 22, 14, -0.6, 0, TAU); ctx.fillStyle = WHT; ctx.fill();
      ctx.fillStyle = BLK; ctx.fillRect(-26, -82, 52, 34); ctx.beginPath(); ctx.moveTo(0, -82); ctx.quadraticCurveTo(30, -130, 70 - k * 40, -150 + k * 30); ctx.lineWidth = 7; ctx.strokeStyle = BLK; ctx.stroke();
      const sx = 70 - k * 40, sy = -150 + k * 30, sp = 1 + 0.3 * Math.sin(t * 40);
      ctx.translate(sx, sy); ctx.scale(sp, sp); ctx.fillStyle = YEL; burstPath(ctx, 34, 8, 9, 0.5); ctx.fill(); outline(ctx, 4);
      ctx.restore();
    }
  }
  function boom(ctx, t) {
    if (t < 2.0) return;
    const k = S.seg(t, 2.0, 2.22), s = 0.9 * (0.2 + 0.8 * S.E.outBack(k, 2.5)) * (1 + 0.07 * S.pulse(t, 7));
    ctx.save(); ctx.translate(777, 1300); ctx.rotate(-0.1 + (1 - k) * 0.3); ctx.scale(s, s);
    ctx.save(); ctx.translate(14, 16); burstPath(ctx, 280, 15, 4, 0.4); ctx.fillStyle = BLK; ctx.fill(); ctx.restore();
    burstPath(ctx, 280, 15, 4, 0.4); ctx.fillStyle = YEL; ctx.fill(); outline(ctx, 11);
    ctx.save(); ctx.scale(0.66, 0.66); burstPath(ctx, 280, 12, 11, 0.32); ctx.fillStyle = WHT; ctx.fill(); ctx.restore();
    comicText(ctx, 'BOOM!', 0, 52, 170, RED, 12, 'Bangers', 14);
    ctx.restore();
    // 碎片
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + 0.3, kk = S.E.out3(S.seg(t, 2.0, 2.6)), r = 200 + kk * (180 + S.hash(i) * 120);
      const ds = 1 - S.seg(t, 2.35, 2.7); if (ds <= 0) continue;
      ctx.save(); ctx.translate(777 + Math.cos(a) * r * 1.1, 1300 + Math.sin(a) * r * 0.85); ctx.rotate(a + t * 3); ctx.scale(ds * 1.4, ds * 1.4); ctx.fillStyle = i % 2 ? YEL : WHT;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(22, 10); ctx.lineTo(-14, 14); ctx.closePath(); ctx.fill(); outline(ctx, 4); ctx.restore();
    }
  }
  function title(ctx, t) {
    const k = S.E.outBack(S.seg(t, -0.1, 0.25), 2), x = 70, y = 186, w = 940, h = 286;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-0.015 + (1 - k) * -0.08); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = BLK; ctx.fillRect(14, 16, w, h);
    ctx.fillStyle = YEL; ctx.fillRect(0, 0, w, h); ctx.fillStyle = benday(ctx, '#f2c200', 14, 3.4, 0, 0, 0.4); ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 9; ctx.strokeStyle = BLK; ctx.strokeRect(0, 0, w, h);
    // 编号徽章
    ctx.save(); ctx.translate(150, 146); ctx.rotate(-0.1);
    ctx.beginPath(); ctx.arc(0, 0, 118, 0, TAU); ctx.fillStyle = RED; ctx.fill(); ctx.fillStyle = benday(ctx, '#a5101a', 14, 3.6, 0, 0, 0.4); ctx.fill(); outline(ctx, 9);
    comicText(ctx, '19', 0, 64, 190, WHT, 9, 'Bangers', 12);
    ctx.restore();
    const k2 = S.E.outBack(S.seg(t, 0.12, 0.42), 2.5);
    ctx.save(); ctx.translate(600, 150); ctx.scale(k2, k2);
    comicText(ctx, '波普漫画', 0, 0, 132, BLK, 0, 'NotoSansSC', 0);
    ctx.restore();
    const k3 = S.E.outBack(S.seg(t, 0.25, 0.55), 2.5);
    ctx.save(); ctx.translate(600, 248); ctx.rotate(-0.02); ctx.scale(k3, k3);
    comicText(ctx, 'POP-ART COMIC!', 0, 0, 92, CYAN, 7, 'Bangers', 12);
    ctx.restore();
    ctx.restore();
  }

  registerScene({
    n: 19, key: 'popart', zh: '波普漫画', en: 'Pop-art Comic',
    bg: YEL, accent: RED,
    draw(ctx, t, S) {
      // 整页冲击变焦（2.0 爆炸、拍点轻推）
      const pz = 1 + (t >= 2.0 ? 0.05 * Math.exp(-(t - 2.0) * 6) : 0) + (t >= 1.0 && t < 1.6 ? 0.02 * Math.exp(-(t - 1.0) * 8) : 0);
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 1080, 1920);
      ctx.fillStyle = benday(ctx, 'rgba(232,33,43,0.12)', 22, 4, 0, 0, 0.4); ctx.fillRect(0, 0, 1080, 1920);
      ctx.save(); ctx.translate(540, 1100); ctx.scale(pz, pz); ctx.translate(-540, -1100);
      panel(ctx, PANELS.A, t, (c, w, h) => panelA(c, w, h, t));
      panel(ctx, PANELS.B, t, (c, w, h) => panelB(c, w, h, t));
      panel(ctx, PANELS.C, t, (c, w, h) => panelC(c, w, h, t));
      boom(ctx, t);
      ctx.restore();
      // 页脚：未完待续
      const kc = S.E.outBack(S.seg(t, 3.0, 3.2), 2.5);
      if (kc > 0) {
        ctx.save(); ctx.translate(560 + (1 - kc) * 600, 1620); ctx.rotate(-0.03);
        ctx.fillStyle = BLK; ctx.fillRect(-300 + 12, -44 + 12, 600, 88); ctx.fillStyle = YEL; ctx.fillRect(-300, -44, 600, 88); ctx.lineWidth = 8; ctx.strokeStyle = BLK; ctx.strokeRect(-300, -44, 600, 88);
        ctx.fillStyle = BLK; ctx.textAlign = 'center'; ctx.font = S.F(54, 'Bangers'); ctx.fillText('TO BE CONTINUED...', 0, 20); ctx.restore();
      }
      title(ctx, t);
      S.grain(ctx, 0.07, 19, 'multiply', 1);
    },
  });
})();
