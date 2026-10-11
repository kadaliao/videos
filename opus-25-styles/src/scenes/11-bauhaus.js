// 11 几何构成 · 包豪斯 Bauhaus Construction —— 每拍先出十字准星，再展开/滑入/绕轴摆入一个几何块；
// 第 2 秒画面碎成方块翻面，重组为旋转 90° 换色的第二张构成，继续每拍加一块。
(function () {
  const PAPER = '#efe8d8', RED = '#d8281b', YEL = '#f2b705', BLUE = '#1b4b9b', BLK = '#151515', LINE = 'rgba(21,21,21,0.5)';
  const TAU = Math.PI * 2, SW = { willReadFrequently: true };
  const CX = 590, CY = 980;                // 构成区中心（720×720：x 230–950, y 620–1340）
  let paper = null;

  const sq = (t, a, d) => (t - a) / d;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const outBack = (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
  const outExpo = k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);
  const inOut3 = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

  // 十字准星 + 枢轴点 + 坐标注记
  function cross(g, x, y, t, tb, label) {
    const a = clamp(sq(t, tb - 0.22, 0.14)), fade = 1 - clamp(sq(t, tb + 0.45, 0.3));
    if (a <= 0) return;
    const L = 64 * outExpo(a);
    g.save(); g.globalAlpha = fade;
    g.strokeStyle = BLK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L); g.lineTo(x, y + L); g.stroke();
    g.beginPath(); g.arc(x, y, 18 * a, 0, TAU); g.stroke();
    g.font = '600 18px "JetBrainsMono", monospace'; g.fillStyle = BLK; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (label) g.fillText(label, x + 24, y - 24);
    g.restore();
    // 枢轴点常驻
    g.fillStyle = BLK; g.beginPath(); g.arc(x, y, 7 * a, 0, TAU); g.fill();
  }

  // ---------- 构成 A 的各块（返回是否已出现） ----------
  // pal: {r, y, b} 颜色映射，用于 B 段换色
  function compA(g, t, pal, guides = true) {
    // 构造辅助线
    if (guides) {
      g.save(); g.strokeStyle = guides === 'lines' ? 'rgba(21,21,21,0.3)' : LINE; g.lineWidth = 1.5;
      const gl = clamp(sq(t, -0.4, 0.5));
      g.beginPath();
      g.moveTo(230, 620); g.lineTo(230 + 720 * gl, 620 + 720 * gl);         // 45° 对角
      g.moveTo(640, 560); g.lineTo(640, 560 + 840 * gl);                     // 圆心竖线
      g.moveTo(200, 860); g.lineTo(200 + 790 * gl, 860);                     // 圆心横线
      g.moveTo(200, 1080); g.lineTo(200 + 790 * gl, 1080);
      g.stroke();
      g.setLineDash([6, 8]);
      const ca = clamp(sq(t, 0.18, 0.32));
      if (ca > 0) { g.beginPath(); g.arc(640, 860, 300, -Math.PI / 2, -Math.PI / 2 + TAU * ca); g.stroke(); }
      g.restore();
    }
    // 1. 红圆（0.5 拍：圆规画弧 → 展开）
    const k1 = clamp(sq(t, 0.5, 0.42));
    if (t > 0.3) {
      // 圆规弧线（展开前一刻）
      const arc = clamp(sq(t, 0.3, 0.2));
      g.strokeStyle = BLK; g.lineWidth = 3;
      if (k1 < 1) { g.beginPath(); g.arc(640, 860, 220, -Math.PI / 2, -Math.PI / 2 + TAU * arc); g.stroke(); }
      if (k1 > 0) { g.fillStyle = pal.r; g.beginPath(); g.arc(640, 860, 220 * outBack(k1, 2.2), 0, TAU); g.fill(); }
    }
    // 2. 蓝半圆（1.0 拍：绕左端枢轴摆入）
    const k2 = clamp(sq(t, 1.0, 0.45));
    if (k2 > 0) {
      const ang = -Math.PI * (1 - outBack(k2, 1.4));
      g.save(); g.translate(420, 1080); g.rotate(ang);
      g.fillStyle = pal.b; g.beginPath(); g.arc(220, 0, 220, 0, Math.PI); g.closePath(); g.fill();
      g.restore();
    }
    // 3. 黄三角（1.5 拍：从底边向上翻开）
    const k3 = clamp(sq(t, 1.5, 0.42));
    if (k3 > 0) {
      const h = 470 * outBack(k3, 2.0);
      g.fillStyle = pal.y; g.beginPath(); g.moveTo(250, 1340); g.lineTo(250, 1340 - h); g.lineTo(520, 1340); g.closePath(); g.fill();
    }
    // 4. 黑方块 + 细线（0 拍随黑柱一起）
    const k0 = clamp(sq(t, 0.0, 0.4));
    if (k0 > 0) {
      g.fillStyle = BLK;
      g.fillRect(230, 1340, 720 * outExpo(k0), 22);                                 // 底横梁
      const s = 104 * outBack(clamp(sq(t, 0.12, 0.35)), 2.5);
      g.fillRect(850 - s / 2 + 52, 640 - s / 2 + 52, s, s);                           // 右上黑方块
    }
    // 5. 小圆点阵（随 1.5 拍）
    const k5 = clamp(sq(t, 1.62, 0.3));
    if (k5 > 0) { g.fillStyle = BLK; for (let i = 0; i < 4; i++) { const r = 11 * outBack(clamp(k5 * 2 - i * 0.25), 3); g.beginPath(); g.arc(760 + i * 48, 1270, r, 0, TAU); g.fill(); } }
    // 准星
    if (guides === true) {
      cross(g, 640, 860, t, 0.5, 'C 640·860');
      cross(g, 420, 1080, t, 1.0, 'P 420·1080');
      cross(g, 250, 1340, t, 1.5, 'A 250·1340');
      cross(g, 902, 692, t, 0.1, '');
    }
  }

  // ---------- 构成 B：A 绕中心旋转 90° + 换色，再每拍加一块 ----------
  const PAL_A = { r: RED, y: YEL, b: BLUE }, PAL_B = { r: BLUE, y: RED, b: YEL };
  function compB(g, t) {
    g.save(); g.translate(CX, CY); g.rotate(Math.PI / 2); g.translate(-CX, -CY);
    compA(g, 9, PAL_B, 'lines');
    g.restore();
    // 新的构造线
    g.save(); g.strokeStyle = LINE; g.lineWidth = 1.5; g.beginPath();
    g.moveTo(200, 620); g.lineTo(990, 620); g.moveTo(230, 590); g.lineTo(230, 1400); g.moveTo(950, 590); g.lineTo(950, 1400);
    g.stroke(); g.restore();
    // 2.5：黑四分之一圆绕角点摆入
    const k1 = clamp(sq(t, 2.5, 0.42));
    if (k1 > 0) {
      g.save(); g.translate(950, 620); g.rotate(Math.PI / 2 * (1 - outBack(k1, 1.6)));
      g.fillStyle = BLK; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 250, Math.PI / 2, Math.PI); g.closePath(); g.fill();
      g.restore();
    }
    // 3.0：红方块沿网格滑入
    const k2 = clamp(sq(t, 3.0, 0.38));
    if (k2 > 0) { const x = 950 + (1 - outExpo(k2)) * 300; g.fillStyle = RED; g.fillRect(Math.min(x, 1100) - 180, 1160, 180, 180); }
    // 3.5：红色圆规弧环绕蓝圆展开
    const k3 = clamp(sq(t, 3.5, 0.45));
    if (k3 > 0) {
      g.strokeStyle = RED; g.lineWidth = 16; g.lineCap = 'butt';
      g.beginPath(); g.arc(710, 1030, 262, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 1.25 * outExpo(k3)); g.stroke();
      g.fillStyle = BLK; g.beginPath(); g.arc(710, 1030, 9, 0, TAU); g.fill();
    }
    cross(g, 950, 620, t, 2.5, 'P 950·620');
    cross(g, 860, 1250, t, 3.0, 'Q 860·1250');
    cross(g, 710, 1030, t, 3.5, 'O 710·1030');
  }

  // ---------- 文字 ----------
  function typeset(g, t) {
    // 左侧黑柱 + 旋转 90° 文字
    const kb = outExpo(clamp(sq(t, -0.4, 0.55)));
    const barH = 1400 * kb;
    g.fillStyle = BLK; g.fillRect(104, 160, 92, barH);
    g.save(); g.beginPath(); g.rect(104, 160, 92, barH); g.clip();
    g.translate(166, 1540); g.rotate(-Math.PI / 2);
    g.fillStyle = PAPER; g.font = '64px "BebasNeue"'; g.letterSpacing = '6px'; g.textBaseline = 'alphabetic';
    g.fillText('BAUHAUS CONSTRUCTION', 0, 0);
    g.fillStyle = YEL; g.fillRect(1010, -46, 50, 50);
    g.fillStyle = RED; g.beginPath(); g.arc(1110, -21, 25, 0, TAU); g.fill();
    g.letterSpacing = '0px'; g.restore();

    // 巨大编号 11（从基线下方遮罩升起）
    const k11 = outExpo(clamp(sq(t, 0.0, 0.5)));
    g.font = '330px "ArchivoBlack"'; g.textBaseline = 'alphabetic';
    const w11 = g.measureText('11').width, RX = Math.round(Math.max(226 + w11 + 22, 640));
    g.save(); g.beginPath(); g.rect(220, 160, w11 + 12, 420); g.clip();
    g.fillStyle = BLK; g.fillText('11', 226, 548 + (1 - k11) * 420);
    g.restore();
    // 右栏：几何 / 构成（方块扫出）
    const chars = [['几', RX, 336], ['何', RX + 128, 336], ['构', RX, 470], ['成', RX + 128, 470]];
    g.font = '900 124px "NotoSansSC"';
    chars.forEach(([c, x, y], i) => {
      const k = clamp(sq(t, 0.12 + i * 0.08, 0.3));
      if (k <= 0) return;
      const wipe = k < 0.5 ? outExpo(k * 2) : 1, rev = k >= 0.5 ? outExpo((k - 0.5) * 2) : 0;
      g.save(); g.beginPath(); g.rect(x, y - 116, 128, 136); g.clip();
      if (k >= 0.5) { g.fillStyle = BLK; g.fillText(c, x, y); }
      const col = [RED, BLUE, YEL, BLK][i];
      g.fillStyle = col; g.fillRect(x + 128 * rev, y - 116, 128 * (wipe - rev), 136);
      g.restore();
    });
    // 红色横条 + 小字
    const kr = outExpo(clamp(sq(t, 0.4, 0.4)));
    g.fillStyle = RED; g.fillRect(RX, 502, 254 * kr, 16);
    g.globalAlpha = clamp(sq(t, 0.5, 0.3));
    g.fillStyle = BLK; g.font = '30px "BebasNeue"'; g.letterSpacing = '3px';
    g.fillText('FORM · FUNCTION', RX + 2, 556); g.letterSpacing = '0px'; g.globalAlpha = 1;

    // 底部：包豪斯
    const kz = outExpo(clamp(sq(t, 0.25, 0.5)));
    g.save(); g.beginPath(); g.rect(226, 1384, 720, 170); g.clip();
    g.fillStyle = BLK; g.font = '900 150px "NotoSansSC"'; g.textBaseline = 'alphabetic';
    g.fillText('包豪斯', 226 - (1 - kz) * 500, 1534);
    g.restore();
    g.globalAlpha = clamp(sq(t, 0.45, 0.3));
    g.fillStyle = BLK; g.font = '40px "BebasNeue"'; g.letterSpacing = '4px';
    g.fillText('BAUHAUS', 714, 1436); g.fillStyle = RED; g.fillText('1919—1933', 714, 1480);
    g.fillStyle = BLK; g.font = '26px "BebasNeue"'; g.letterSpacing = '2px'; g.fillText('WEIMAR · DESSAU · BERLIN', 714, 1520);
    g.letterSpacing = '0px'; g.globalAlpha = 1;
  }

  function full(g, t, variant) {
    g.drawImage(paper, 0, 0);
    if (variant === 'A') compA(g, t, PAL_A, true); else compB(g, t);
    typeset(g, t);
  }

  registerScene({
    n: 11, key: 'bauhaus', zh: '几何构成 · 包豪斯', en: 'Bauhaus Construction',
    bg: PAPER, accent: RED,
    init(S) {
      paper = document.createElement('canvas'); paper.width = S.W; paper.height = S.H;
      const g = paper.getContext('2d', SW);
      g.fillStyle = PAPER; g.fillRect(0, 0, S.W, S.H);
      // 模数网格（90px）
      g.strokeStyle = 'rgba(120,100,70,0.14)'; g.lineWidth = 1;
      for (let x = 50; x < S.W; x += 90) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, S.H); g.stroke(); }
      for (let y = 20; y < S.H; y += 90) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(S.W, y + 0.5); g.stroke(); }
      // 纸纹：颗粒 + 纤维
      const im = g.getImageData(0, 0, S.W, S.H), d = im.data, r = S.rng(1919);
      for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9; }
      g.putImageData(im, 0, 0);
      g.strokeStyle = 'rgba(140,115,80,0.08)'; g.lineWidth = 1;
      for (let i = 0; i < 900; i++) { const x = r() * S.W, y = r() * S.H, a = r() * TAU, l = 6 + r() * 22; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      const vg = g.createRadialGradient(S.W / 2, S.H / 2, 500, S.W / 2, S.H / 2, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,70,40,0.12)');
      g.fillStyle = vg; g.fillRect(0, 0, S.W, S.H);
    },
    draw(ctx, t, S) {
      const F0 = 1.86, F1 = 2.36;
      if (t < F0) return full(ctx, t, 'A');
      if (t >= F1) return full(ctx, t, 'B');
      // 碎块翻面：A → B
      const A = S.layer('s11-A', S.W, S.H), B = S.layer('s11-B', S.W, S.H);
      const ga = A.getContext('2d', SW), gb = B.getContext('2d', SW);
      ga.setTransform(1, 0, 0, 1, 0, 0); gb.setTransform(1, 0, 0, 1, 0, 0);
      full(ga, Math.min(t, 1.98), 'A'); full(gb, t, 'B');
      ctx.fillStyle = '#b9ae96'; ctx.fillRect(0, 0, S.W, S.H);
      const T = 216, cols = 5, rows = Math.ceil(S.H / T);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const s0 = F0 + (i + j) * 0.022, k = clamp((t - s0) / 0.2);
        const x = i * T, y = j * T, cx = x + T / 2, cy = y + T / 2;
        const lift = Math.sin(k * Math.PI);
        const dx = (cx - S.W / 2) * 0.03 * lift, dy = (cy - S.H / 2) * 0.02 * lift;
        const sx = Math.cos(k * Math.PI), src = k < 0.5 ? A : B;
        ctx.save(); ctx.translate(cx + dx, cy + dy);  ctx.scale(Math.max(0.02, Math.abs(sx)) * (1 - lift * 0.06), 1 - lift * 0.06);
        ctx.drawImage(src, x, y, T, T, -T / 2, -T / 2, T, T);
        if (lift > 0.02) { ctx.fillStyle = `rgba(21,21,21,${lift * 0.2})`; ctx.fillRect(-T / 2, -T / 2, T, T); }
        ctx.restore();
      }
    },
  });
})();
