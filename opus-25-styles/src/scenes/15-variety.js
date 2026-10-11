// 15 综艺花字 Variety-show Captions
// 旋转太阳芒背景 + 白边贴纸小人（惊讶 → 笑翻）+ 逐字弹出的胖圆花字（渐变填充、白/彩/深三层描边、硬投影）、
// "绝了！"砸下配一帧白闪、横幅带运动拖影甩入、"哈哈哈"反应字幕、手绘贴纸。
(function () {
  const { TAU } = S;
  const PINK = '#ff3d8b', YEL = '#ffd60a', CYAN = '#1ec8ff', LIME = '#8cff3a', ORG = '#ff8a1e', DARK = '#2b0f45', WHITE = '#ffffff', PURP = '#9b5cff';
  const BGS = [
    { a: '#2cc9ff', b: '#6fdcff' },
    { a: '#ff4f9a', b: '#ff86b9' },
    { a: '#3fd46a', b: '#7eea8c' },
    { a: '#9b5cff', b: '#b98aff' },
  ];
  const BG_T = [-9, 1.0, 2.0, 3.0];

  // ---------- 花字 ----------
  function candyGrad(ctx, size, c1, c2) {
    const g = ctx.createLinearGradient(0, -size * 0.75, 0, size * 0.15);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, c1); g.addColorStop(0.5, c1); g.addColorStop(0.56, c2); g.addColorStop(1, c2);
    return g;
  }
  // 单字：深色外描边 > 彩色描边 > 白描边 > 渐变填充，带硬投影
  function fancyChar(ctx, ch, x, y, size, font, c1, c2, mid, rot = 0, sc = 1, opts = {}) {
    if (sc <= 0.001) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.font = S.F(size, font, opts.weight || ''); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const k = size / 160, sw = opts.sw || 1;
    ctx.fillStyle = DARK; ctx.strokeStyle = DARK; ctx.lineWidth = 46 * k * sw;
    ctx.save(); ctx.translate(11 * k, 13 * k); ctx.strokeText(ch, 0, 0); ctx.fillText(ch, 0, 0); ctx.restore();
    ctx.strokeText(ch, 0, 0);
    ctx.strokeStyle = mid; ctx.lineWidth = 33 * k * sw; ctx.strokeText(ch, 0, 0);
    ctx.strokeStyle = WHITE; ctx.lineWidth = 17 * k * sw; ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = candyGrad(ctx, size, c1, c2); ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  const pop = (t, t0, d = 0.28) => t < t0 ? 0 : S.E.outBack(S.seg(t, t0, t0 + d), 2.8);

  // ---------- 背景 ----------
  function sunburst(ctx, B, t, cx, cy) {
    ctx.fillStyle = B.a; ctx.fillRect(0, 0, 1080, 1920);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.25);
    ctx.fillStyle = B.b; const n = 20;
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = a0 + TAU / n / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2400, a0, a1); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, 1000); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.45, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(43,15,69,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    // 斜条纹带（顶部 / 底部）
    for (const [y0, h] of [[0, 150], [1600, 320]]) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, y0, 1080, h); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      const off = (t * 120) % 80;
      for (let x = -400; x < 1500; x += 80) { ctx.beginPath(); ctx.moveTo(x + off, y0); ctx.lineTo(x + off + 40, y0); ctx.lineTo(x + off + 40 - h, y0 + h); ctx.lineTo(x + off - h, y0 + h); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    // 散点彩纸
    const r = S.rng(15);
    for (let i = 0; i < 26; i++) {
      const x = r() * 1080, y = r() * 1920, s = 8 + r() * 14, c = [WHITE, YEL, PINK, CYAN, LIME][i % 5], rot = r() * TAU + t * (r() - 0.5) * 3;
      ctx.save(); ctx.translate(x, y + Math.sin(t * 2 + i) * 10); ctx.rotate(rot); ctx.fillStyle = c; ctx.strokeStyle = DARK; ctx.lineWidth = 4;
      if (i % 3 === 0) { star4(ctx, 0, 0, s * 1.6); } else if (i % 3 === 1) { ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(-s, -s * 0.35, s * 2, s * 0.7); ctx.strokeRect(-s, -s * 0.35, s * 2, s * 0.7); }
      ctx.restore();
    }
  }
  function star4(ctx, x, y, r, fill = true) {
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
    if (fill) { ctx.fill(); ctx.stroke(); }
  }
  function starN(ctx, r1, r2, n, rot = 0) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + rot, rr = i % 2 ? r2 : r1; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }

  // 贴纸：白色描边 + 深色外描边 + 硬投影
  function sticker(ctx, pathFn, fill, white = 22, shadow = 14) {
    ctx.save(); ctx.lineJoin = 'round';
    ctx.save(); ctx.translate(shadow, shadow); pathFn(); ctx.strokeStyle = DARK; ctx.lineWidth = white * 2 + 12; ctx.stroke(); ctx.fillStyle = DARK; ctx.fill(); ctx.restore();
    pathFn(); ctx.strokeStyle = DARK; ctx.lineWidth = white * 2 + 12; ctx.stroke();
    ctx.strokeStyle = WHITE; ctx.lineWidth = white * 2; ctx.stroke();
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = DARK; ctx.stroke();
    ctx.restore();
  }

  // ---------- 小人 ----------
  function mascot(ctx, t, x, y, R) {
    const laugh = t >= 1.0;
    const shake = laugh ? Math.sin(t * 38) * 0.03 * (0.5 + S.pulse(t, 5)) : Math.sin(t * 3) * 0.02;
    const sq = laugh ? 1 + 0.06 * S.pulse(t, 7) : 1 + 0.03 * Math.sin(t * 6);
    ctx.save(); ctx.translate(x, y); ctx.rotate(shake); ctx.scale(1 / Math.sqrt(sq), sq);
    // 耳朵/呆毛
    sticker(ctx, () => { ctx.beginPath(); ctx.moveTo(-40, -R + 10); ctx.quadraticCurveTo(-60, -R - 120, 30, -R - 110); ctx.quadraticCurveTo(-10, -R - 60, 30, -R + 6); ctx.closePath(); }, ORG, 16, 12);
    sticker(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.94, 0, 0, TAU); }, YEL, 26, 16);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.94, 0, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(-R * 0.35, -R * 0.45, 10, 0, 0, R * 1.1); g.addColorStop(0, 'rgba(255,255,255,0.65)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,120,0,0.35)');
    ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = DARK; ctx.fillStyle = DARK;
    // 腮红
    ctx.fillStyle = 'rgba(255,61,139,0.55)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * R * 0.6, R * 0.12, 42, 24, 0, 0, TAU); ctx.fill(); }
    if (!laugh) {
      for (const s of [-1, 1]) {
        ctx.fillStyle = WHITE; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(s * 80, -55, 50, 62, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(s * 80 + 6, -48, 22, 0, TAU); ctx.fill();
        ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(s * 80 + 14, -58, 8, 0, TAU); ctx.fill();
        ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(s * 40, -140); ctx.quadraticCurveTo(s * 80, -158, s * 125, -130); ctx.stroke();
      }
      ctx.fillStyle = '#7a1030'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, 75, 30, 40, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 汗滴
      ctx.fillStyle = CYAN; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(R * 0.78, -R * 0.55); ctx.quadraticCurveTo(R * 0.95, -R * 0.25, R * 0.8, -R * 0.2); ctx.quadraticCurveTo(R * 0.62, -R * 0.25, R * 0.78, -R * 0.55); ctx.fill(); ctx.stroke();
    } else {
      ctx.lineWidth = 14;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 120, -90); ctx.lineTo(s * 60, -55); ctx.lineTo(s * 120, -20); ctx.stroke(); }
      // 大笑嘴
      ctx.beginPath(); ctx.moveTo(-120, 20); ctx.quadraticCurveTo(0, 30, 120, 20); ctx.quadraticCurveTo(110, 190, 0, 195); ctx.quadraticCurveTo(-110, 190, -120, 20); ctx.closePath();
      ctx.fillStyle = '#6a0d2a'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#ff7aa8'; ctx.beginPath(); ctx.ellipse(0, 175, 70, 50, 0, 0, TAU); ctx.fill(); ctx.fillStyle = WHITE; ctx.fillRect(-120, 12, 240, 34); ctx.restore();
      ctx.lineWidth = 9; ctx.stroke();
      // 眼泪喷射
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const ph = S.fract(t * 2.2 + i * 0.25), dx = s * (130 + ph * 170), dy = -40 - Math.sin(ph * Math.PI) * 90 + ph * 140;
        ctx.save(); ctx.globalAlpha = 1 - ph * 0.6; ctx.fillStyle = CYAN; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(dx, dy, 16 * (1 - ph * 0.4), 22 * (1 - ph * 0.4), s * 0.6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    }
    ctx.restore();
  }

  // 横幅（带运动拖影）
  function banner(ctx, x, y, w, h, rot, text, fill, tcol, font, size) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineJoin = 'round';
    // 燕尾
    for (const s of [-1, 1]) {
      ctx.fillStyle = s < 0 ? '#c0186a' : '#c0186a'; ctx.strokeStyle = DARK; ctx.lineWidth = 8;
      ctx.beginPath(); const ex = s * (w / 2 + 70), ix = s * (w / 2 - 20);
      ctx.moveTo(ix, -h / 2 + 22); ctx.lineTo(ex, -h / 2 + 22); ctx.lineTo(ex - s * 34, 22); ctx.lineTo(ex, h / 2 + 22); ctx.lineTo(ix, h / 2 + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = DARK; ctx.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
    ctx.fillStyle = fill; ctx.strokeStyle = DARK; ctx.lineWidth = 8; S.rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; S.rr(ctx, -w / 2 + 12, -h / 2 + 8, w - 24, h * 0.32, 10); ctx.fill();
    ctx.font = S.F(size, font); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 12; ctx.strokeStyle = DARK; ctx.strokeText(text, 0, 4); ctx.fillStyle = tcol; ctx.fillText(text, 0, 4);
    ctx.restore();
  }
  function swingBanner(ctx, t, t0, x, y, w, h, rot, text, fill, tcol, font, size, fromLeft = true) {
    if (t < t0) return;
    const at = tt => { const k = S.seg(tt, t0, t0 + 0.45); const e = S.E.outElastic(k); return { x: x + (1 - S.E.out3(Math.min(1, k * 2))) * (fromLeft ? -1100 : 1100), r: rot + (1 - e) * (fromLeft ? -0.6 : 0.6) }; };
    for (let g = 3; g >= 1; g--) {
      const p = at(t - g * 0.025); const cur = at(t);
      if (Math.abs(p.x - cur.x) < 4 && Math.abs(p.r - cur.r) < 0.01) continue;
      ctx.save(); ctx.globalAlpha = 0.18 * (4 - g) / 3; banner(ctx, p.x, y, w, h, p.r, text, fill, tcol, font, size); ctx.restore();
    }
    const c = at(t); banner(ctx, c.x, y, w, h, c.r, text, fill, tcol, font, size);
  }

  // 手绘贴纸
  function heartPath(ctx, s) { ctx.beginPath(); ctx.moveTo(0, s * 0.9); ctx.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.8, -s * 1.15, 0, -s * 0.45); ctx.bezierCurveTo(s * 0.8, -s * 1.15, s * 1.4, -s * 0.1, 0, s * 0.9); ctx.closePath(); }
  function boltPath(ctx, s) { ctx.beginPath(); [[0.15, -1], [-0.55, 0.12], [-0.05, 0.12], [-0.25, 1], [0.55, -0.2], [0.05, -0.2], [0.35, -1]].forEach(([x, y], i) => i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)); ctx.closePath(); }
  function miniLaugh(ctx, r) {
    sticker(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); }, YEL, 12, 8);
    ctx.strokeStyle = DARK; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.38, -r * 0.18, r * 0.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.fillStyle = '#6a0d2a'; ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.12); ctx.quadraticCurveTo(0, r * 0.2, r * 0.55, r * 0.12); ctx.quadraticCurveTo(0, r * 0.95, -r * 0.55, r * 0.12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CYAN; ctx.lineWidth = 4; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.82, r * 0.05, r * 0.16, r * 0.26, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
  }

  registerScene({
    n: 15, key: 'variety', zh: '综艺花字', en: 'Variety-show Captions',
    bg: '#2cc9ff', accent: PINK,
    draw(ctx, t, S) {
      let bi = 0; for (let i = 1; i < BG_T.length; i++) if (t >= BG_T[i]) bi = i;
      // 砸字震屏
      const hitShake = (t0) => t >= t0 && t < t0 + 0.2 ? (1 - (t - t0) / 0.2) : 0;
      const sh = Math.max(hitShake(1.0), hitShake(3.0) * 0.6), fi = Math.floor(t * 30);
      ctx.save(); ctx.translate((S.hash(fi) - 0.5) * 34 * sh, (S.hash(fi + 7) - 0.5) * 34 * sh);
      sunburst(ctx, BGS[bi], t, 540, 1020);
      // 换色时从中心扩散的圆
      if (bi > 0 && t - BG_T[bi] < 0.3) { const k = S.E.out3(S.seg(t, BG_T[bi], BG_T[bi] + 0.3)); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1080, 1920); ctx.arc(540, 1020, 2200 * k, 0, TAU, true); ctx.clip(); sunburst(ctx, BGS[bi - 1], t, 540, 1020); ctx.restore(); }

      // 小人
      const mk = t < 0 ? 1 : 1;
      mascot(ctx, t, 540, 1010, 230 * mk);
      // "?!" 在惊讶阶段
      if (t < 1.0) { const k = pop(t, -0.3); fancyChar(ctx, '?!', 830, 820, 150, 'Bungee', CYAN, '#1a7dff', PINK, 0.2 + Math.sin(t * 8) * 0.06, k); }
      // 贴纸
      const kh = pop(t, 1.5);
      if (kh > 0) { ctx.save(); ctx.translate(205, 790); ctx.rotate(-0.25 + Math.sin(t * 5) * 0.06); ctx.scale(kh * (1 + 0.08 * S.pulse(t, 8)), kh * (1 + 0.08 * S.pulse(t, 8))); sticker(ctx, () => heartPath(ctx, 70), PINK, 16, 10); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-30, -30, 16, 10, -0.6, 0, TAU); ctx.fill(); ctx.restore(); }
      const kl = pop(t, 2.5);
      if (kl > 0) { ctx.save(); ctx.translate(190, 1220); ctx.rotate(-0.2 + Math.sin(t * 9) * 0.1); ctx.scale(kl, kl); miniLaugh(ctx, 70); ctx.restore(); }
      const kb = pop(t, 3.0);
      if (kb > 0) { ctx.save(); ctx.translate(900, 1180); ctx.rotate(0.25); ctx.scale(kb, kb); sticker(ctx, () => boltPath(ctx, 90), YEL, 14, 10); ctx.restore(); }
      // 闪烁星
      [[860, 700, 0.5], [130, 1050, 1.0], [960, 980, 1.5], [300, 660, 2.0], [780, 1330, 2.5]].forEach(([x, y, tb], i) => {
        const k = pop(t, tb, 0.2); if (k <= 0) return; const p = 1 + 0.35 * S.pulse(t + i * 0.13, 6);
        ctx.save(); ctx.fillStyle = [WHITE, YEL, WHITE, LIME, WHITE][i]; ctx.strokeStyle = DARK; ctx.lineWidth = 6; ctx.lineJoin = 'round'; star4(ctx, x, y, 34 * k * p); ctx.restore();
      });

      // 哈哈哈（2.0 起逐字弹出，持续波动）
      const ha = '哈哈哈';
      for (let i = 0; i < 3; i++) {
        const k = pop(t, 2.0 + i * 0.1); if (k <= 0) continue;
        const bob = Math.sin(t * 10 + i * 1.3) * 12;
        fancyChar(ctx, ha[i], 640 + i * 118, 760 + i * 26 + bob, 118, 'ZCOOLKuaiLe', ['#ffb0d2', '#ffe08a', '#dcc4ff'][i], [PINK, ORG, PURP][i], [CYAN, PINK, YEL][i], 0.16 + Math.sin(t * 7 + i) * 0.08, k);
      }

      // "绝了！" 1.0 砸下
      if (t >= 0.82) {
        const k = S.seg(t, 0.82, 1.0), s = t < 1.0 ? 3.2 - 2.2 * S.E.in3(k) : 1 + 0.12 * Math.exp(-14 * (t - 1.0)) * Math.cos((t - 1.0) * 40) + 0.04 * S.pulse(t, 7);
        const a = t < 1.0 ? S.E.in2(k) : 1;
        ctx.save(); ctx.globalAlpha = a;
        const chs = ['绝', '了', '！'], xs = [370, 590, 770], c1 = ['#fff27a', '#fff27a', '#fff27a'], c2 = [ORG, '#ff4d2e', ORG];
        chs.forEach((ch, i) => fancyChar(ctx, ch, 540 + (xs[i] - 540) * s, 1395 + (i === 1 ? 18 : -8) * s, 205, 'ZCOOLKuaiLe', c1[i], c2[i], PINK, [-0.12, 0.06, 0.18][i], s));
        ctx.restore();
      }
      // 横幅：英文名（0.35 甩入）、名场面（3.0 甩入）
      swingBanner(ctx, t, 0.35, 540, 600, 760, 96, -0.04, 'Variety-show Captions', '#ff4f9a', WHITE, 'Bungee', 50);
      swingBanner(ctx, t, 3.0, 560, 1525, 420, 92, 0.05, '名场面 · MVP', DARK, YEL, 'ZCOOLQingKe', 60, false);

      // 标题：15 徽章 + 综艺花字
      const kb15 = pop(t, -0.4, 0.35);
      if (kb15 > 0) {
        ctx.save(); ctx.translate(160, 350); ctx.rotate(-0.12 + t * 0.15); ctx.scale(kb15 * 0.86, kb15 * 0.86);
        sticker(ctx, () => starN(ctx, 118, 92, 14), YEL, 12, 10); ctx.restore();
        fancyChar(ctx, '15', 158, 392, 108, 'ArchivoBlack', '#ffffff', '#ff4f9a', CYAN, -0.12, kb15, { sw: 0.55 });
      }
      const zh = '综艺花字', cols = [['#ffe56b', ORG, PINK], ['#a6f0ff', '#1a8dff', YEL], ['#ffb3d6', PINK, LIME], ['#d3ff8f', '#27c93f', ORG]];
      for (let i = 0; i < 4; i++) {
        const k = pop(t, 0.0 + i * 0.09, 0.3); if (k <= 0) continue;
        const bob = Math.sin(t * 6 + i * 1.4) * 6;
        fancyChar(ctx, zh[i], 362 + i * 170, 440 + [0, -26, 14, -14][i] + bob, 172, 'ZCOOLKuaiLe', cols[i][0], cols[i][1], cols[i][2], [-0.1, 0.07, -0.05, 0.1][i], k);
      }
      ctx.restore();
      // 单帧白闪
      if (t >= 1.0 && t < 1.1) { ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - (t - 1.0) / 0.1)})`; ctx.fillRect(0, 0, 1080, 1920); }
      if (t >= 3.0 && t < 3.07) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, 0, 1080, 1920); }
    },
  });
})();
