// 17 瑞士动态排版 Swiss Kinetic Type —— 可见 12 栏网格、齐左、巨型 17 出血裁切；
// 词沿网格线遮罩滑入，拍点上缩放跳变 / 旋转 90° 定格，第 2 秒 17 变成"文字即图像"。
(function () {
  const PAPER = '#f3f2ee', BLK = '#111111', RED = '#e30613', SW = { willReadFrequently: true };
  const ML = 60, GUT = 20, CW = (1080 - ML * 2 - GUT * 11) / 12;
  const colX = i => ML + i * (CW + GUT);
  const colW = n => n * CW + (n - 1) * GUT;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const oE = k => k >= 1 ? 1 : k <= 0 ? 0 : 1 - Math.pow(2, -10 * k);
  const ioE = k => k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2;
  const P = (t, a, d) => oE(clamp((t - a) / d));

  // 遮罩滑入：文字只在自己的行框内可见；dir: 'up' 自下而上，'left' 自左向右
  function slide(g, text, x, y, size, k, dir = 'up', w = 1200, color = BLK, font) {
    if (k <= 0) return;
    g.save(); g.beginPath(); g.rect(x - 4, y - size * 0.95, w, size * 1.18); g.clip();
    const dx = dir === 'left' ? -(1 - k) * w * 0.6 : 0, dy = dir === 'up' ? (1 - k) * size * 1.15 : dir === 'down' ? -(1 - k) * size * 1.15 : 0;
    g.fillStyle = color; g.font = font; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillText(text, x + dx, y + dy);
    g.restore();
  }

  function grid(g, t) {
    const k = ioE(clamp((t + 0.4) / 0.2));
    g.fillStyle = 'rgba(227,6,19,0.035)';
    for (let i = 0; i < 12; i++) g.fillRect(colX(i), 0, CW, 1920 * k);
    g.strokeStyle = 'rgba(17,17,17,0.13)'; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 12; i++) { const x0 = colX(i) + 0.5, x1 = colX(i) + CW - 0.5; g.moveTo(x0, 0); g.lineTo(x0, 1920 * k); g.moveTo(x1, 1920); g.lineTo(x1, 1920 * (1 - k)); }
    g.stroke();
    g.strokeStyle = 'rgba(17,17,17,0.05)'; g.beginPath();
    for (let y = 20; y < 1920; y += 40) { g.moveTo(0, y + 0.5); g.lineTo(1080 * k, y + 0.5); }
    g.stroke();
    // 裁切标记
    g.strokeStyle = BLK; g.lineWidth = 2; g.beginPath();
    for (const [x, y, sx, sy] of [[ML, 150, -1, -1], [1080 - ML, 150, 1, -1], [ML, 1560, -1, 1], [1080 - ML, 1560, 1, 1]]) {
      g.moveTo(x, y + sy * 12); g.lineTo(x, y + sy * 40); g.moveTo(x + sx * 12, y); g.lineTo(x + sx * 40, y);
    }
    g.stroke();
  }
  function rule(g, y, k, h = 3, x = ML, w = 960) { if (k > 0) { g.fillStyle = BLK; g.fillRect(x, y, w * k, h); } }

  // 巨型 17：t<2 黑色实体；t≥2 拍点缩放跳变 + 红色"文字即图像"
  const N17 = { x: colX(4) - 6, base: 852, size: 820 };
  function big17(g, t, S) {
    // 拍点缩放跳变：0 → 1.0，2 → 1.12，3 → 1.26（被上下两条规线裁切）
    const jump = t < 2 ? 1 : t < 3 ? 1.12 : 1.26, tj = t < 2 ? 0 : t < 3 ? 2 : 3;
    const slam = 1 + (tj === 0 ? 0.22 : 0.07) * (1 - P(t, tj, 0.2));
    const sc = jump * slam, ax = N17.x, ay = 600;
    const font = `800 ${N17.size}px "InterXB"`;
    if (t < 0) {
      g.save(); g.strokeStyle = BLK; g.lineWidth = 2; g.font = font; g.textBaseline = 'alphabetic';
      g.setLineDash([14, 10]); g.lineDashOffset = t * 60; g.strokeText('17', N17.x, N17.base); g.restore(); return;
    }
    if (t < 2) {
      g.save(); g.beginPath(); g.rect(0, 228, 1080, 670); g.clip(); g.translate(ax, ay); g.scale(sc, sc); g.translate(-ax, -ay);
      g.fillStyle = BLK; g.font = font; g.textBaseline = 'alphabetic'; g.fillText('17', N17.x, N17.base);
      g.restore(); return;
    }
    const L = S.layer('s17-img', 1080, 1000), c = L.getContext('2d', SW);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 1080, 1000);
    c.translate(0, -100);
    c.save(); c.translate(ax, ay); c.scale(sc, sc); c.translate(-ax, -ay);
    c.fillStyle = RED; c.font = font; c.textBaseline = 'alphabetic'; c.fillText('17', N17.x, N17.base);
    c.restore();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = PAPER; c.font = '800 21px "InterXB"';
    const rowsTxt = ['GRID · TYPE · ORDER · 网格 · 秩序 · 留白 · ', 'RASTER · TYPOGRAFIE · ORDNUNG · 17 · ', '瑞士动态排版 · SWISS KINETIC TYPE · '];
    const rev = P(t, 2.0, 0.35);
    for (let r = 0; r < 32; r++) {
      const y = 140 + r * 28, txt = rowsTxt[r % 3].repeat(8), dir = r % 2 ? 1 : -1;
      const off = ((t * 120 * dir + r * 97) % 500) - 500;
      c.save(); c.beginPath(); c.rect(0, y - 22, 1080 * rev, 28); c.clip();
      c.fillText(txt, off, y); c.restore();
    }
    c.globalCompositeOperation = 'source-over';
    g.drawImage(L, 0, 128, 1080, 670, 0, 228, 1080, 670);
  }

  function stack(g, t) {
    const f = '900 150px "NotoSansSC"', x = ML;
    slide(g, '网格', x, 430, 150, P(t, 0.5, 0.32), 'left', colW(4) + 10, BLK, f);
    slide(g, '秩序', x, 610, 150, P(t, 1.0, 0.32), 'up', colW(4) + 10, BLK, f);
    // 留白：绕基线左端旋转 90° 定格
    const kr = clamp((t - 1.5) / 0.22);
    if (kr > 0) {
      g.save(); g.translate(x, 790); g.rotate(-Math.PI / 2 * (1 - ioE(kr)));
      g.fillStyle = RED; g.font = f; g.textBaseline = 'alphabetic'; g.fillText('留白', 0, 0); g.restore();
    }
    // 编号小标签
    g.font = '800 22px "InterXB"';
    [['01 / GRID', 0.55, 300], ['02 / ORDER', 1.05, 480], ['03 / SPACE', 1.55, 660]].forEach(([s, a, y]) => slide(g, s, x + 2, y, 22, P(t, a, 0.3), 'up', 300, RED, '800 22px "InterXB"'));
  }

  function words(g, t) { // 底部红色块：每拍切换一个词，宽度按栏跳变
    const seq = [[1.0, 'GRID', 4], [1.5, 'TYPE', 4], [2.0, 'ORDER', 5], [2.5, 'SPACE', 5], [3.0, 'FORM', 4], [3.5, 'SWISS', 5]];
    if (t < 0.9) return;
    let i = 0; for (let j = 0; j < seq.length; j++) if (t >= seq[j][0]) i = j;
    g.font = '800 120px "InterXB"';
    const fit = s => Math.ceil((g.measureText(s).width + 52) / (CW + GUT));
    const [t0, w] = seq[i], n = fit(w), prev = i > 0 ? [seq[i - 1][0], seq[i - 1][1], fit(seq[i - 1][1])] : null;
    const kIn = P(t, t0, 0.14);
    const curW = prev ? colW(prev[2]) + (colW(n) - colW(prev[2])) * kIn : colW(n) * P(t, 1.0, 0.25);
    const y = 1262, h = 236;
    g.fillStyle = RED; g.fillRect(ML, y, curW, h);
    g.save(); g.beginPath(); g.rect(ML, y, curW, h); g.clip();
    g.fillStyle = PAPER; g.font = '800 120px "InterXB"'; g.textBaseline = 'alphabetic';
    if (prev && kIn < 1) g.fillText(prev[1], ML + 22, y + 160 - kIn * h);
    g.fillText(w, ML + 22, y + 160 + (1 - kIn) * h * (prev ? 1 : 0));
    g.font = '800 22px "InterXB"'; g.fillText(String(i + 1).padStart(2, '0') + ' / 06', ML + 24, y + 214);
    g.restore();
  }

  function meta(g, t) {
    const f = '22px "Inter"', fb = '800 22px "InterXB"';
    rule(g, 168, P(t, -0.3, 0.5), 3);
    slide(g, '17 / 25', ML, 208, 22, P(t, 0.0, 0.3), 'up', 200, BLK, fb);
    slide(g, 'Internationaler', colX(3), 208, 22, P(t, 0.06, 0.3), 'up', 260, BLK, f);
    slide(g, 'Typografischer Stil', colX(6), 208, 22, P(t, 0.12, 0.3), 'up', 260, BLK, f);
    slide(g, 'Zürich — Basel', colX(9), 208, 22, P(t, 0.18, 0.3), 'up', 260, BLK, f);
    rule(g, 900, P(t, 0.1, 0.5), 3);
    // 标题
    const zf = '900 144px "NotoSansSC"';
    [...'瑞士动态排版'].forEach((ch, i) => slide(g, ch, ML + i * 144, 1062, 144, P(t, 0.04 + i * 0.045, 0.3), 'up', 150, BLK, zf));
    slide(g, 'Swiss Kinetic Type', ML, 1172, 84, P(t, 0.22, 0.4), 'left', 980, BLK, '800 84px "InterXB"');
    rule(g, 1212, P(t, 0.3, 0.5), 3);
    // 右下：齐左右不齐的小字段落
    const px = colX(7), lines = [
      ['Raster schafft Ordnung.', fb], ['Grid systems bring order', f], ['to the chaos of the page.', f], ['以网格建立秩序，', '500 24px "NotoSansSCM"'], ['以留白建立呼吸。', '500 24px "NotoSansSCM"'], ['— J. Müller-Brockmann, 1961', f],
    ];
    lines.forEach(([s, ff], i) => slide(g, s, px, 1290 + i * 36, 24, P(t, 0.6 + i * 0.06, 0.3), 'up', colW(5) + 30, BLK, ff));
    // 规格
    const spec = [['12', 'COL'], ['20', 'GTR'], ['60', 'MRG']];
    spec.forEach(([a, b], i) => {
      const x = px + i * (CW + GUT) * 1.7, k = P(t, 1.2 + i * 0.08, 0.3);
      slide(g, a, x, 1528, 44, k, 'up', 120, i === 0 ? RED : BLK, '800 44px "InterXB"');
      slide(g, b, x + 2, 1490, 16, k, 'up', 120, BLK, '800 16px "InterXB"');
    });
  }

  registerScene({
    n: 17, key: 'swiss', zh: '瑞士动态排版', en: 'Swiss Kinetic Type',
    bg: PAPER, accent: RED,
    draw(ctx, t, S) {
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, S.W, S.H);
      grid(ctx, t);
      big17(ctx, t, S);
      stack(ctx, t);
      meta(ctx, t);
      words(ctx, t);
      // 拍点节拍器：顶部细线上的红色方块每拍跳一栏
      if (t >= 0) { const b = Math.floor(t / 0.5); ctx.fillStyle = RED; ctx.fillRect(colX(b % 12), 160, CW, 11); }
    },
  });
})();
