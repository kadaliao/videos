// 片头 / 章节卡 / 片尾：都由 25 个场景的实时缩略图拼成。
(function () {
  const { W, H, clamp, lerp, seg, smooth, E, hash, layer, TAU } = S;
  const TW = W / 5, TH = H / 5;   // 5×5 宫格，每格恰好也是 9:16
  const BG = '#0b0b0f';

  // 把场景 n 在本地时间 t 的画面画到 (x,y,w,h)，可选圆角
  function tile(ctx, drawScene, n, t, x, y, w, h, r = 0, alpha = 1) {
    if (w < 2 || h < 2 || alpha <= 0) return;
    const c = layer('tile'), g = c.getContext('2d'); COMPOSE.resetCtx(g); g.clearRect(0, 0, W, H); drawScene(g, n, t);
    ctx.save(); ctx.globalAlpha = alpha;
    if (r > 0) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip(); }
    ctx.drawImage(c, x, y, w, h); ctx.restore();
  }
  function txt(ctx, s, x, y, font, color, align = 'center', ls = 0) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.letterSpacing = ls + 'px'; ctx.fillText(s, x, y); ctx.letterSpacing = '0px';
  }
  // 逐字弹出的大字
  function popText(ctx, s, x, y, size, family, weight, color, t0, t, stagger = .045, stroke = null) {
    ctx.font = S.F(size, family, weight); ctx.textBaseline = 'alphabetic';
    S.chars(ctx, s, x, 'center').forEach((c, i) => {
      const k = seg(t, t0 + i * stagger, t0 + i * stagger + .45); if (k <= 0) return;
      const sc = E.outBack(k, 2.2);
      ctx.save(); ctx.translate(c.cx, y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 3); ctx.textAlign = 'center';
      if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = stroke[1]; ctx.strokeStyle = stroke[0]; ctx.strokeText(c.ch, 0, 0); }
      ctx.fillStyle = color; ctx.fillText(c.ch, 0, 0); ctx.restore();
    });
  }
  const tileTime = (n, T) => 1.2 + ((T * .9 + n * .53) % 2.6);

  // ---------- 片头 0–4s ----------
  function intro(ctx, t, drawScene) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const z = E.inOutExpo(seg(t, 2.55, 4));        // 推进第一格
    const s = Math.pow(5, z), pad = lerp(7, 0, z), rad = lerp(22, 0, z);
    ctx.save(); ctx.scale(s, s);
    for (let k = 0; k < 25; k++) {
      const n = k + 1, i = k % 5, j = Math.floor(k / 5), d = (i + j) * .045, kk = seg(t, d, d + .5);
      if (kk <= 0) continue;
      const sc = n === 1 ? 1 : E.outBack(kk, 1.6), cx = (i + .5) * TW, cy = (j + .5) * TH, w = (TW - pad * 2) * sc, h = (TH - pad * 2) * sc;
      const tt = n === 1 ? lerp(tileTime(1, t), t - 4, smooth(2.4, 3.9, t)) : tileTime(n, t);
      if (s > 1.02 && n !== 1 && (i > 1 || j > 1)) continue;  // 推进时远处的格子已经出画
      tile(ctx, drawScene, n, tt, cx - w / 2, cy - h / 2, w, h, rad, n === 1 ? clamp(kk * 3) : 1);
    }
    ctx.restore();
    // 标题压暗层 + 文字
    const titleIn = seg(t, .25, .6), titleOut = E.in3(seg(t, 2.35, 2.85)), dim = .62 * E.out2(titleIn) * (1 - titleOut);
    ctx.fillStyle = `rgba(8,8,12,${dim})`; ctx.fillRect(0, 0, W, H);
    if (titleOut < 1) {
      ctx.save(); const sc = 1 + titleOut * .6; ctx.translate(W / 2, H * .47); ctx.scale(sc, sc); ctx.translate(-W / 2, -H * .47); ctx.globalAlpha = 1 - titleOut;
      const k1 = E.out3(seg(t, .3, .7));
      txt(ctx, '同一个 AI 模型', W / 2, 640 + (1 - k1) * 30, S.F(64, 'NotoSansSC', 900), `rgba(255,255,255,${k1})`, 'center', 8);
      popText(ctx, '25', W / 2, 1010, 400, 'ArchivoBlack', '', '#fff', .3, t, .08, ['#ff3d7f', 26]);
      popText(ctx, '种视频画风', W / 2, 1180, 140, 'NotoSansSC', 900, '#fff', .6, t, .06);
      const k3 = E.out3(seg(t, 1.3, 1.7));
      ctx.globalAlpha = (1 - titleOut) * k3;
      ctx.fillStyle = '#ffd23f'; S.rr(ctx, W / 2 - 330, 1250, 660, 84, 42); ctx.fill();
      txt(ctx, '每一帧都是代码画出来的', W / 2, 1308, S.F(46, 'NotoSansSC', 900), '#111', 'center', 4);
      ctx.restore();
    }
  }

  // ---------- 章节卡 4s ----------
  function chapter(ctx, t, drawScene) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    // 背景：缓慢移动的斜条
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-.35); ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (let x = -2000 + (t * 120) % 160; x < 2000; x += 160) ctx.fillRect(x, -1600, 70, 3200); ctx.restore();
    const k1 = E.out3(seg(t, .1, .5));
    txt(ctx, '以上 15 种风格', W / 2, 330 + (1 - k1) * 30, S.F(66, 'NotoSansSC', 900), `rgba(255,255,255,${k1})`, 'center', 6);
    txt(ctx, '参考自 @Vincent 的视频', W / 2, 410 + (1 - k1) * 30, S.F(42, 'NotoSansSCM', 500), `rgba(255,255,255,${.6 * k1})`, 'center', 4);
    // +10 砸下来
    const k2 = seg(t, .22, .5);
    if (k2 > 0) {
      const sc = lerp(3.2, 1, E.in3(k2)) * (1 + .08 * Math.exp(-10 * Math.max(0, t - .5)) * Math.sin(Math.max(0, t - .5) * 40));
      ctx.save(); ctx.translate(W / 2, 760); ctx.scale(sc, sc); ctx.rotate(-.05); ctx.globalAlpha = clamp(k2 * 4);
      ctx.font = S.F(330, 'ArchivoBlack'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.fillStyle = '#ff3d7f'; ctx.fillText('+10', 14, 16); ctx.lineWidth = 16; ctx.strokeStyle = '#fff'; ctx.strokeText('+10', 0, 0);
      ctx.fillStyle = '#ffd23f'; ctx.fillText('+10', 0, 0); ctx.restore();
      ctx.fillStyle = `rgba(255,255,255,${.6 * Math.exp(-(t - .5) * 10) * (t > .5 ? 1 : 0)})`; ctx.fillRect(0, 0, W, H);
    }
    popText(ctx, '我再补充 10 种', W / 2, 1010, 96, 'NotoSansSC', 900, '#fff', .8, t, .05);
    // 下方 2×5 预告格
    const tw = 176, th = tw * 16 / 9, gap = 14, x0 = (W - (5 * tw + 4 * gap)) / 2, y0 = 1110;
    for (let k = 0; k < 10; k++) {
      const n = 16 + k, i = k % 5, j = Math.floor(k / 5), d = 1.5 + k * .07, kk = seg(t, d, d + .45);
      if (kk <= 0) continue;
      const e = E.outBack(kk, 1.8), x = x0 + i * (tw + gap), y = y0 + j * (th + gap + 40);
      ctx.save(); ctx.translate(x + tw / 2, y + th / 2); ctx.scale(e, e); ctx.rotate((1 - e) * .3);
      tile(ctx, drawScene, n, tileTime(n, t), -tw / 2, -th / 2, tw, th, 14);
      ctx.restore();
      txt(ctx, TL.STYLES[n - 1].zh.replace(/ · .*/, ''), x + tw / 2, y + th + 34, S.F(24, 'NotoSansSCM', 500), `rgba(255,255,255,${clamp(kk * 2) * .85})`);
    }
  }

  // ---------- 片尾 12s ----------
  function outro(ctx, t, drawScene) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const z = 1 - E.inOutExpo(seg(t, .15, 1.6));      // 1 → 0：从全屏缩回右下角
    const s = Math.pow(5, z), pad = lerp(7, 0, z), rad = lerp(22, 0, z);
    const fade = E.in2(seg(t, 10.8, 12));
    ctx.save(); ctx.translate(W, H); ctx.scale(s, s); ctx.translate(-W, -H);
    for (let k = 24; k >= 0; k--) {
      const n = k + 1, i = k % 5, j = Math.floor(k / 5), dist = (4 - i) + (4 - j), d = .9 + dist * .07, kk = n === 25 ? 1 : seg(t, d, d + .55);
      if (kk <= 0) continue;
      if (s > 1.05 && n !== 25 && (i < 3 || j < 3)) continue;
      const cx = (i + .5) * TW, cy = (j + .5) * TH, flip = n === 25 ? 1 : Math.abs(Math.sin(E.outBack(kk, 1.2) * Math.PI / 2));
      const w = (TW - pad * 2) * flip, h = TH - pad * 2;
      // 依次高亮
      const hl = Math.exp(-Math.pow((t - (2.2 + k * .11)) / .09, 2));
      const tt = n === 25 ? 4 + t : tileTime(n, t);
      tile(ctx, drawScene, n, tt, cx - w / 2, cy - h / 2 - hl * 10, w, h, rad);
      if (hl > .02) { ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${hl})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2 - hl * 10, w, h, rad); ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
    // 标题
    const ti = E.out3(seg(t, 3.6, 4.0));
    if (ti > 0) {
      ctx.fillStyle = `rgba(8,8,12,${.72 * ti})`; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = ti;
      popText(ctx, '25', W / 2, 860, 380, 'ArchivoBlack', '', '#fff', 3.8, t, .08, ['#ff3d7f', 24]);
      popText(ctx, '种画风', W / 2, 1030, 130, 'NotoSansSC', 900, '#fff', 4.05, t, .07);
      const k3 = E.out3(seg(t, 4.5, 5.0)); ctx.globalAlpha = ti * k3;
      txt(ctx, '同一个模型 · 同一套管线', W / 2, 1160 + (1 - k3) * 20, S.F(52, 'NotoSansSC', 900), '#fff', 'center', 4);
      txt(ctx, '代码逐帧绘制 → 无头浏览器截帧 → FFmpeg 合成', W / 2, 1240 + (1 - k3) * 20, S.F(36, 'NotoSansSCM', 500), 'rgba(255,255,255,.7)', 'center', 2);
      const k4 = E.out3(seg(t, 5.0, 5.5)); ctx.globalAlpha = ti * k4;
      ctx.fillStyle = '#ffd23f'; S.rr(ctx, W / 2 - 300, 1330, 600, 80, 40); ctx.fill();
      txt(ctx, '你最喜欢第几种？', W / 2, 1385, S.F(46, 'NotoSansSC', 900), '#111', 'center', 4);
      ctx.restore();
    }
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  }

  window.FRAMING = { intro, chapter, outro };
})();
