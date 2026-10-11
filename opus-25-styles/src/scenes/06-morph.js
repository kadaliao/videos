// 06 形变动画 Shape Morph
// 一个居中的实心剪影（对角线折叠的浅色半边），轮廓在 圆 → 鸟 → (分裂) → 心 → 星 之间连续形变；
// 每次落在拍点上挤压回弹，新的背景色从剪影处绽开。形变用弧长重采样 + 逐点插值。
(function () {
  const { TAU } = S;
  const N = 240;
  const CX = 540, CY = 1010, R = 290;

  // ---------- 形状库（单位坐标，y 向下） ----------
  function catmull(ctrl, per = 10) {
    const out = [], n = ctrl.length;
    for (let i = 0; i < n; i++) {
      const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
      for (let k = 0; k < per; k++) {
        const u = k / per, u2 = u * u, u3 = u2 * u;
        out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
      }
    }
    return out;
  }
  const polar = (fn, n = 400) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU - Math.PI / 2; const r = fn(a); return [Math.cos(a) * r, Math.sin(a) * r]; });
  function normalize(pts, size = 1, dy = 0) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = 2 * size / Math.max(x1 - x0, y1 - y0);
    return pts.map(([x, y]) => [(x - cx) * s, (y - cy) * s + dy]);
  }
  function resample(pts) {
    // 保证顺时针（屏幕坐标下面积为正）
    let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
    if (A < 0) pts = pts.slice().reverse();
    const n = pts.length, cum = [0];
    for (let i = 1; i <= n; i++) { const p = pts[i - 1], q = pts[i % n]; cum.push(cum[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1])); }
    const L = cum[n], out = []; let j = 0;
    for (let k = 0; k < N; k++) {
      const d = k / N * L; while (cum[j + 1] < d) j++;
      const p = pts[j], q = pts[(j + 1) % n], u = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
      out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
    }
    // 起点对齐到正上方（角度最接近 -90°）
    let best = 0, bd = 1e9; for (let k = 0; k < N; k++) { const a = Math.atan2(out[k][1], out[k][0]); const d = Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))); if (d < bd && out[k][1] < 0) { bd = d; best = k; } }
    return out.slice(best).concat(out.slice(0, best));
  }
  const SHAPES = {};
  function build() {
    SHAPES.circle = resample(polar(() => 1));
    const bird = [[1.0, -0.13], [0.86, -0.3], [0.68, -0.33], [0.52, -0.2], [0.3, -0.2], [0.2, -0.55], [0.0, -0.88], [-0.32, -1.04], [-0.2, -0.7], [-0.16, -0.38], [-0.12, -0.16],
      [-0.48, -0.1], [-0.86, -0.3], [-1.02, -0.26], [-0.8, -0.03], [-1.0, 0.16], [-0.52, 0.14], [-0.15, 0.26], [0.25, 0.25], [0.55, 0.1], [0.8, -0.02], [0.9, -0.07]];
    SHAPES.bird = resample(normalize(catmull(bird, 14), 1.08, 0.05));
    const a = 0.6, b = 0.615;
    SHAPES.split = resample(normalize(polar(th => Math.sqrt(Math.max(0, a * a * Math.cos(2 * th) + Math.sqrt(Math.max(0, b ** 4 - a ** 4 * Math.sin(2 * th) ** 2)))), 800), 1.05));
    const heart = []; for (let i = 0; i < 400; i++) { const s = i / 400 * TAU; heart.push([16 * Math.sin(s) ** 3, -(13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s))]); }
    SHAPES.heart = resample(normalize(heart, 1.0));
    const star = []; for (let v = 0; v < 10; v++) { const a0 = -Math.PI / 2 + v * TAU / 10, a1 = a0 + TAU / 10, r0 = v % 2 ? 0.45 : 1, r1 = v % 2 ? 1 : 0.45; for (let k = 0; k < 40; k++) { const u = k / 40; star.push([Math.cos(a0) * r0 * (1 - u) + Math.cos(a1) * r1 * u, Math.sin(a0) * r0 * (1 - u) + Math.sin(a1) * r1 * u]); } }
    SHAPES.star = resample(normalize(star, 1.12, 0.06));
  }

  // ---------- 关键帧 ----------
  // [时间, 形状]：相邻两键之间形变；落点 land=true 时挤压回弹 + 背景绽开
  const KEYS = [
    { t: -9, s: 'circle' }, { t: 0.55, s: 'circle' }, { t: 1.0, s: 'bird', land: 1 }, { t: 1.36, s: 'bird' },
    { t: 1.7, s: 'split' }, { t: 2.0, s: 'heart', land: 2 }, { t: 2.55, s: 'heart' }, { t: 3.0, s: 'star', land: 3 }, { t: 99, s: 'star' },
  ];
  const THEMES = [
    { bg: '#2a3cff', fg: '#efe0c2', fold: '#ffffff', ink: '#fff3dd', shade: '#1622b0' },
    { bg: '#ff4a1f', fg: '#efe0c2', fold: '#ffffff', ink: '#fff3dd', shade: '#c42a0a' },
    { bg: '#f4ead6', fg: '#f0234c', fold: '#ff8aa0', ink: '#1a1418', shade: '#d9c9a8' },
    { bg: '#141218', fg: '#f5b400', fold: '#ffe58a', ink: '#ffc81e', shade: '#000000' },
  ];
  const LANDS = [0, 1.0, 2.0, 3.0];

  function shapeAt(t) {
    let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].t <= t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const k = a.s === b.s ? 0 : S.E.inOut3(S.seg(t, a.t, b.t));
    const A = SHAPES[a.s], B = SHAPES[b.s];
    const pts = new Array(N); for (let j = 0; j < N; j++) pts[j] = [A[j][0] + (B[j][0] - A[j][0]) * k, A[j][1] + (B[j][1] - A[j][1]) * k];
    return { pts, k, morphing: a.s !== b.s && t > a.t && t < b.t, mk: Math.sin(Math.PI * k) };
  }
  function landSquash(t) {
    let q = 0; for (const L of [1.0, 2.0, 3.0]) { const u = t - L; if (u >= 0 && u < 1) q += Math.exp(-7 * u) * Math.cos(TAU * 2.4 * u) * 0.26; }
    // 弱拍上的小呼吸
    q += 0.05 * S.pulse(t + 0.0, 10) * (t > 0 ? 1 : 0);
    return q;
  }
  function themeIdx(t) { let i = 0; for (let k = 1; k < LANDS.length; k++) if (t >= LANDS[k] - 0.02) i = k; return i; }

  function shapePath(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

  // 一层完整画面（背景 + 剪影 + 标题），供绽开时裁切叠加
  function drawState(ctx, th, t, geo, idx) {
    const T = THEMES[th];
    ctx.fillStyle = T.bg; ctx.fillRect(-40, -40, 1160, 2000);
    // 背景上的淡同心圆环（印刷感）
    ctx.save(); ctx.strokeStyle = S.hex(T.shade, th === 2 ? 0.35 : 0.28); ctx.lineWidth = 2;
    for (let r = 420; r < 1500; r += 70) { ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.stroke(); }
    ctx.restore();
    // 漂浮小几何（落拍时弹出）
    decor(ctx, T, t, th);
    // 投影
    ctx.save(); ctx.translate(24, 34); ctx.fillStyle = S.hex(T.shade, th === 3 ? 0.9 : 0.55); shapePath(ctx, geo); ctx.fill(); ctx.restore();
    // 剪影
    ctx.fillStyle = T.fg; shapePath(ctx, geo); ctx.fill();
    // 对角折叠：左上半边更浅 + 折痕阴影
    ctx.save(); shapePath(ctx, geo); ctx.clip();
    const ang = -Math.PI / 4 + Math.sin(t * 1.3) * 0.05, ux = Math.cos(ang), uy = Math.sin(ang);
    const fx = geo.cx, fy = geo.cy;
    const nx = uy, ny = -ux; // 指向折叠区（左上）的法线
    ctx.beginPath(); ctx.moveTo(fx - ux * 2000, fy - uy * 2000); ctx.lineTo(fx + ux * 2000, fy + uy * 2000); ctx.lineTo(fx + ux * 2000 + nx * 2000, fy + uy * 2000 + ny * 2000); ctx.lineTo(fx - ux * 2000 + nx * 2000, fy - uy * 2000 + ny * 2000); ctx.closePath();
    ctx.fillStyle = S.hex(T.fold, th === 2 ? 0.55 : th === 3 ? 0.5 : 0.62); ctx.fill();
    const g = ctx.createLinearGradient(fx, fy, fx + nx * 110, fy + ny * 110);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fill();
    // 另一侧折痕的细暗线
    ctx.beginPath(); ctx.moveTo(fx - ux * 2000, fy - uy * 2000); ctx.lineTo(fx + ux * 2000, fy + uy * 2000); ctx.lineTo(fx + ux * 2000 - nx * 2000, fy + uy * 2000 - ny * 2000); ctx.lineTo(fx - ux * 2000 - nx * 2000, fy - uy * 2000 - ny * 2000); ctx.closePath();
    const g2 = ctx.createLinearGradient(fx, fy, fx - nx * 50, fy - ny * 50);
    g2.addColorStop(0, 'rgba(0,0,0,0.14)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2; ctx.fill();
    ctx.restore();
    title(ctx, T, t);
    targets(ctx, T, t, idx);
  }

  function decor(ctx, T, t, th) {
    const items = [[170, 700, 0], [905, 760, 1], [150, 1270, 2], [930, 1230, 3], [110, 1010, 4], [975, 1010, 5], [880, 640, 6]];
    for (const [x, y, i] of items) {
      const L = LANDS[th], k = S.E.outBack(S.seg(t, L + 0.04 + i * 0.03, L + 0.34 + i * 0.03), 2.6);
      const s = (th === 0 ? 1 : k) * (1 + 0.12 * S.pulse(t, 8));
      if (s <= 0) continue;
      ctx.save(); ctx.translate(x + Math.sin(t * 1.7 + i) * 8, y + Math.cos(t * 1.3 + i) * 8); ctx.scale(s, s); ctx.rotate(t * (i % 2 ? 0.6 : -0.5) + i);
      ctx.fillStyle = i % 3 === 0 ? T.fg : S.hex(T.fg, 0.55); ctx.strokeStyle = T.fg; ctx.lineWidth = 7;
      const sh = (i + th) % 4;
      if (sh === 0) { ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill(); }
      else if (sh === 1) { ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke(); }
      else if (sh === 2) { ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(22, 16); ctx.lineTo(-22, 16); ctx.closePath(); ctx.fill(); }
      else { ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.moveTo(0, -22); ctx.lineTo(0, 22); ctx.stroke(); }
      ctx.restore();
    }
  }

  function title(ctx, T, t) {
    const k = S.E.outExpo(S.seg(t, -0.1, 0.5)), k2 = S.E.outExpo(S.seg(t, 0.1, 0.65));
    ctx.save(); ctx.fillStyle = T.ink; ctx.textBaseline = 'alphabetic';
    ctx.font = S.F(230, 'ArchivoBlack'); ctx.textAlign = 'left';
    ctx.save(); ctx.beginPath(); ctx.rect(60, 180, 400, 250); ctx.clip();
    ctx.fillText('06', 72, 405 + (1 - k) * 250); ctx.restore();
    ctx.font = S.F(78, 'ArchivoBlack');
    ctx.save(); ctx.beginPath(); ctx.rect(440, 220, 600, 190); ctx.clip();
    ctx.fillText('SHAPE', 450, 310 + (1 - k2) * 190); ctx.fillText('MORPH', 450, 400 + (1 - k2) * 190); ctx.restore();
    ctx.font = S.F(158, 'NotoSansSC', 900);
    ctx.save(); ctx.beginPath(); ctx.rect(60, 420, 960, 190); ctx.clip();
    ctx.fillText('形变动画', 68, 578 + (1 - k2) * 190); ctx.restore();
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  const ICONS = ['circle', 'bird', 'heart', 'star'], ICON_T = [0, 1.0, 2.0, 3.0];
  function targets(ctx, T, t, idx) {
    const y = 1440, x0 = 200, dx = 227, k = S.E.out3(S.seg(t, 0.2, 0.7));
    ctx.save(); ctx.globalAlpha = k;
    ctx.strokeStyle = S.hex(T.ink, 0.45); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + dx * 3, y); ctx.stroke();
    // 进度
    const prog = S.clamp((t - 0) / 3.0);
    ctx.strokeStyle = T.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + dx * 3 * S.E.inOut2(prog), y); ctx.stroke();
    ICONS.forEach((nm, i) => {
      const P = SHAPES[nm], on = i <= idx, cur = i === idx, s = cur ? 44 + 8 * S.pulse(t, 8) : 32;
      ctx.save(); ctx.translate(x0 + dx * i, y);
      ctx.fillStyle = T.bg; ctx.beginPath(); ctx.arc(0, 0, s + 14, 0, TAU); ctx.fill();
      ctx.beginPath(); P.forEach((p, j) => j ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)); ctx.closePath();
      if (on) { ctx.fillStyle = T.ink; ctx.fill(); } else { ctx.strokeStyle = S.hex(T.ink, 0.6); ctx.lineWidth = 4; ctx.stroke(); }
      ctx.restore();
    });
    ctx.font = S.F(26, 'SpaceGrotesk', 700); ctx.fillStyle = S.hex(T.ink, 0.85); ctx.textAlign = 'center'; ctx.letterSpacing = '4px';
    ['CIRCLE', 'BIRD', 'HEART', 'STAR'].forEach((s, i) => ctx.fillText(s, x0 + dx * i, y + 96));
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  registerScene({
    n: 6, key: 'morph', zh: '形变动画', en: 'Shape Morph',
    bg: '#2a3cff', accent: '#ff4a1f',
    init() { build(); },
    draw(ctx, t, S) {
      if (!SHAPES.circle) build();
      const sh = shapeAt(t), q = landSquash(t);
      // 形变中拉长、落点挤压
      const sx = (1 + q) * (1 - 0.1 * sh.mk), sy = (1 - q) * (1 + 0.16 * sh.mk);
      const rot = (t > 2.55 ? S.E.inOut3(S.seg(t, 2.55, 3.0)) * TAU / 5 : 0) + (t > 3 ? Math.sin((t - 3) * 2) * 0.04 : 0) + (sh.morphing ? Math.sin(Math.PI * sh.k) * 0.12 : 0);
      const lift = -60 * sh.mk;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const geo = sh.pts.map(([x, y]) => { const X = x * R * sx, Y = y * R * sy; return [CX + X * cr - Y * sr, CY + lift + X * sr + Y * cr + (1 - sy) * R * 0.9]; });
      geo.cx = CX; geo.cy = CY + lift;
      const th = themeIdx(t);
      // 新背景从剪影处绽开：先画旧主题整幅，再在扩张圆内画新主题
      const L = LANDS[th], bk = th === 0 ? 1 : S.seg(t, L - 0.02, L + 0.5);
      if (bk < 1) {
        drawState(ctx, th - 1, t, geo, th - 1);
        const r = 2300 * S.E.out3(bk);
        ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.clip();
        drawState(ctx, th, t, geo, th); ctx.restore();
        // 绽开边缘的细环
        ctx.save(); ctx.strokeStyle = S.hex(THEMES[th].fg, 0.6 * (1 - bk)); ctx.lineWidth = 18 * (1 - bk); ctx.beginPath(); ctx.arc(CX, CY, r + 30, 0, TAU); ctx.stroke(); ctx.restore();
      } else drawState(ctx, th, t, geo, th);
      // 纸纹
      S.grain(ctx, 0.1, 3, 'multiply', 1);
      S.grain(ctx, 0.08, 4, 'overlay', 2);
    },
  });
})();
