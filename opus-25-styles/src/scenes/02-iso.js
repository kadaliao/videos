// 02 等轴 2.5D —— 薰衣草雾气里的一座漂浮黏土小街区：楼层逐格落下回弹，树木弹出，靛蓝小车绕环路行驶。
(function () {
  const CW = 58, CH = 29;                 // 等轴格：半宽 / 半高（2:1）
  const OX = 520, OY = 1170;              // 网格中心 (4,4) 的屏幕位置
  const N = 8;
  const FLOOR = 40;

  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const css = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  const WHITE = [255, 255, 255], SHADE = rgb('#6d5fb0'), INDIGO = '#2c2a8c';
  // 三面明暗：顶面最亮，左面中，右面暗（冷色阴影）
  function shades(hex) {
    const c = rgb(hex);
    return { top: css(mix(c, WHITE, 0.18)), left: css(mul(mix(c, SHADE, 0.12), 0.93)), right: css(mul(mix(c, SHADE, 0.28), 0.8)), base: c };
  }

  const P = (i, j, z = 0) => [OX + (i - j) * CW, OY + (i + j - N) * CH - z];

  // 圆角矩形足迹（网格坐标）的采样点
  function rrPts(i0, j0, w, d, r) {
    r = Math.min(r, w / 2, d / 2);
    const pts = [], cs = [[i0 + w - r, j0 + r, -Math.PI / 2], [i0 + w - r, j0 + d - r, 0], [i0 + r, j0 + d - r, Math.PI / 2], [i0 + r, j0 + r, Math.PI]];
    for (const [ci, cj, a0] of cs) for (let k = 0; k <= 5; k++) { const a = a0 + k / 5 * Math.PI / 2; pts.push([ci + Math.cos(a) * r, cj + Math.sin(a) * r]); }
    return pts;
  }
  function hull(p) {
    p = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let k = p.length - 1; k >= 0; k--) { const q = p[k]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); };

  // 黏土方块：圆角足迹拉伸，三面柔和明暗 + 顶边高光 + 底部 AO
  function block(ctx, i0, j0, w, d, z0, h, sh, r = 0.22, opt = {}) {
    const fp = rrPts(i0, j0, w, d, r);
    const bot = fp.map(q => P(q[0], q[1], z0)), top = fp.map(q => P(q[0], q[1], z0 + h));
    if (h > 0.5) {
      const hl = hull(bot.concat(top));
      const xL = P(i0, j0 + d)[0], xR = P(i0 + w, j0)[0], xF = P(i0 + w, j0 + d)[0];
      const g = ctx.createLinearGradient(xL, 0, xR, 0), f = (xF - xL) / (xR - xL), soft = Math.min(0.08, r * CW / (xR - xL));
      g.addColorStop(0, sh.left); g.addColorStop(Math.max(0, f - soft), sh.left); g.addColorStop(Math.min(1, f + soft), sh.right); g.addColorStop(1, sh.right);
      poly(ctx, hl); ctx.fillStyle = g; ctx.fill();
      // 底部 AO + 顶部反光带
      const yF = P(i0 + w, j0 + d, z0)[1];
      const g2 = ctx.createLinearGradient(0, yF - h - 2, 0, yF);
      g2.addColorStop(0, 'rgba(255,255,255,0.10)'); g2.addColorStop(0.25, 'rgba(255,255,255,0)'); g2.addColorStop(0.75, 'rgba(70,50,140,0)'); g2.addColorStop(1, 'rgba(70,50,140,0.16)');
      ctx.fillStyle = g2; ctx.fill();
    }
    poly(ctx, top); ctx.fillStyle = sh.top; ctx.fill();
    if (opt.edge !== false) { ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  // 在网格平面（高度 z）上用网格单位作画
  function onGround(ctx, z, fn) { ctx.save(); ctx.transform(CW, CH, -CW, CH, OX, OY - N * CH - z); fn(); ctx.restore(); }
  // 在立面上画：face 'L'（法线 +j，沿 i 方向）或 'R'（法线 +i，沿 -j 方向），原点为该面左下角
  function onFace(ctx, face, i, j, z, fn) {
    const [x, y] = P(i, j, z); ctx.save(); ctx.translate(x, y);
    if (face === 'L') ctx.transform(1, 0.5, 0, 1, 0, 0); else ctx.transform(1, -0.5, 0, 1, 0, 0);
    fn(); ctx.restore();
  }

  // ---------- 场景内容 ----------
  // 建筑：足迹、楼层数、颜色、首层落地拍
  const BUILD = [
    { i: 2, j: 2, w: 1, d: 1, n: 5, c: '#f4c8b8', b0: -1 },
    { i: 3, j: 2, w: 2, d: 1, n: 2, c: '#f7f2ec', b0: 1, roof: 'garden' },
    { i: 5, j: 2, w: 1, d: 2, n: 4, c: '#c3d6f4', b0: 0 },
    { i: 2, j: 3, w: 1, d: 2, n: 3, c: '#f5e3ad', b0: 2 },
    { i: 3, j: 3, w: 1, d: 1, n: 6, c: '#e9dcfb', b0: 1, roof: 'antenna' },
    { i: 2, j: 5, w: 1, d: 1, n: 1, c: '#f6c9da', b0: 4 },
    { i: 4, j: 5, w: 2, d: 1, n: 2, c: '#f7f2ec', b0: 3, roof: 'awning' },
  ];
  const TREES = [ // 在外圈草地与公园
    { i: 0.5, j: 2.2, s: 1, b: 0.5 }, { i: 0.55, j: 4.6, s: 0.85, b: 1.5 }, { i: 2.6, j: 0.55, s: 0.9, b: 1 }, { i: 5.2, j: 0.5, s: 1.05, b: 2 },
    { i: 7.45, j: 3.4, s: 0.95, b: 2.5 }, { i: 7.5, j: 6.0, s: 0.8, b: 3 }, { i: 3.3, j: 7.45, s: 0.9, b: 3.5 }, { i: 0.6, j: 7.3, s: 1.1, b: 1 },
    { i: 4.35, j: 4.35, s: 0.75, b: 2, cone: 1 }, { i: 5.5, j: 4.3, s: 0.7, b: 2.5, cone: 1 }, { i: 4.5, j: 3.5, s: 0.7, b: 3, cone: 1 },
    { i: 6.0, j: 7.5, s: 0.8, b: 0 }, { i: 7.4, j: 0.9, s: 0.85, b: 1.5, cone: 1 },
  ];

  // 小车沿环路中心线（1.5 与 6.5 围成的方框）行驶
  function carAt(t) {
    const L = 20, s = ((t + 1.2) * 2.6) % L, lane = 1.5;
    const segs = [[lane, lane, 1, 0], [6.5, lane, 0, 1], [6.5, 6.5, -1, 0], [lane, 6.5, 0, -1]];
    const k = Math.floor(s / 5), u = s - k * 5, [i0, j0, di, dj] = segs[k];
    return { i: i0 + di * u, j: j0 + dj * u, di, dj };
  }

  function carAt2(t) {
    const L = 20, s = ((2.6 - t) * 2.2 % L + L) % L, lane = 1.5;
    const segs = [[lane, lane, 1, 0], [6.5, lane, 0, 1], [6.5, 6.5, -1, 0], [lane, 6.5, 0, -1]];
    const k = Math.floor(s / 5), u = s - k * 5, [i0, j0, di, dj] = segs[k];
    return { i: i0 + di * u, j: j0 + dj * u, di: -di, dj: -dj };
  }
  function drawTree(ctx, tr, t) {
    const k = S.seg(t, tr.b * 0.5 - 0.15, tr.b * 0.5 + 0.35), e = tr.b * 0.5 - 0.15 <= -0.4 ? 1 : S.E.outBack(k, 2.6);
    if (e <= 0.001) return;
    const sway = Math.sin(t * 2.4 + tr.i * 3) * 0.6;
    const [x, y] = P(tr.i, tr.j, 0), s = tr.s * e;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // 树干
    ctx.fillStyle = '#e8d2c2'; S.rr(ctx, -6, -34, 12, 36, 6); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,160,0.18)'; S.rr(ctx, 0, -34, 6, 36, 3); ctx.fill();
    if (tr.cone) {
      for (let q = 0; q < 2; q++) {
        const yy = -44 - q * 30, ww = 40 - q * 9;
        const g = ctx.createLinearGradient(-ww, 0, ww, 0); g.addColorStop(0, '#d9f0de'); g.addColorStop(0.5, '#bfe3c8'); g.addColorStop(0.52, '#a3cdb3'); g.addColorStop(1, '#93c0a6');
        ctx.beginPath(); ctx.moveTo(sway * (q + 1), yy - 52); ctx.quadraticCurveTo(ww * 0.4, yy - 20, ww, yy + 12); ctx.quadraticCurveTo(0, yy + 24, -ww, yy + 12); ctx.quadraticCurveTo(-ww * 0.4, yy - 20, sway * (q + 1), yy - 52);
        ctx.fillStyle = g; ctx.fill();
      }
    } else {
      const g = ctx.createRadialGradient(-12 + sway, -84, 4, 0, -66, 48);
      g.addColorStop(0, '#f0fbef'); g.addColorStop(0.35, '#c7e8cd'); g.addColorStop(0.8, '#9fcdb0'); g.addColorStop(1, '#8cbca2');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sway, -68, 38, 0, S.TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-14 + sway, -86, 9, 5, -0.6, 0, S.TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawCar(ctx, t, c, col = INDIGO, cab = '#eef0ff') {
    const along = c.di !== 0;
    const L = 0.9, Wd = 0.5, hop = Math.abs(Math.sin(t * Math.PI * 4)) * 2;
    const w = along ? L : Wd, d = along ? Wd : L, i0 = c.i - w / 2, j0 = c.j - d / 2;
    // 车身 + 车舱
    block(ctx, i0, j0, w, d, 4 + hop, 20, shades(col), 0.18);
    const ci = along ? i0 + (c.di > 0 ? 0.14 : 0.32) : i0 + 0.07, cj = along ? j0 + 0.07 : j0 + (c.dj > 0 ? 0.14 : 0.32);
    block(ctx, ci, cj, along ? 0.44 : 0.36, along ? 0.36 : 0.44, 24 + hop, 16, shades(cab), 0.12);
    // 车灯
    const fi = c.i + c.di * L / 2, fj = c.j + c.dj * L / 2;
    const [hx, hy] = P(fi, fj, 12 + hop);
    ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, S.TAU); ctx.fill();
  }

  function drawBuilding(ctx, b, t) {
    const ins = 0.07;
    let z = 0;
    for (let f = 0; f < b.n; f++) {
      const land = (b.b0 + f) * 0.5;          // 以半拍为单位落地（全部在节拍上）
      const tl = land;
      if (t < tl - 0.26) break;
      const fall = S.seg(t, tl - 0.26, tl), drop = (1 - S.E.in2(fall)) * 230;
      const after = t - tl, sq = after > 0 ? Math.exp(-after * 9) * Math.sin(after * 30) * 0.22 : 0;
      const h = FLOOR * (1 - sq);
      const sh = shades(b.c);
      ctx.save(); ctx.globalAlpha = S.clamp(fall * 3);
      block(ctx, b.i + ins, b.j + ins, b.w - 2 * ins, b.d - 2 * ins, z + drop, h - 3, sh, 0.2);
      // 窗户
      const zz = z + drop;
      if (h > 20) {
        const ww = b.w - 2 * ins, dd = b.d - 2 * ins;
        const lit = (k) => S.hash2(b.i * 7 + b.j * 3 + f, k) > 0.62 + 0.3 * S.pulse(t + k * 0.13, 5) ? '#fff3cf' : 'rgba(95,80,170,0.55)';
        onFace(ctx, 'L', b.i + ins, b.j + ins + dd, zz, () => {
          const nW = Math.max(1, Math.round(ww * 2)), span = ww * CW;
          for (let k = 0; k < nW; k++) { ctx.fillStyle = lit(k); S.rr(ctx, span * (k + 0.5) / nW - 7, -h + 9, 14, 13, 4); ctx.fill(); }
        });
        onFace(ctx, 'R', b.i + ins + ww, b.j + ins + dd, zz, () => {
          const nW = Math.max(1, Math.round(dd * 2)), span = dd * CW;
          for (let k = 0; k < nW; k++) { ctx.fillStyle = lit(k + 5) === '#fff3cf' ? '#ffe9b5' : 'rgba(80,60,150,0.5)'; S.rr(ctx, span * (k + 0.5) / nW - 7, -h + 9, 14, 13, 4); ctx.fill(); }
        });
      }
      ctx.restore();
      z += h;
    }
    // 屋顶装饰
    const roofT = (b.b0 + b.n - 1) * 0.5 + 0.25;
    if (b.roof && t > roofT - 0.2) {
      const e = S.E.outBack(S.seg(t, roofT - 0.2, roofT + 0.2), 2.5);
      if (b.roof === 'antenna') {
        const [x, y] = P(b.i + 0.5, b.j + 0.5, z);
        ctx.strokeStyle = '#d9cdf3'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 55 * e); ctx.stroke();
        const glow = 0.5 + 0.5 * S.pulse(t, 6);
        ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.arc(x, y - 58 * e, 8 * e, 0, S.TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.5 * glow})`; ctx.beginPath(); ctx.arc(x - 2, y - 60 * e, 3 * e, 0, S.TAU); ctx.fill();
      } else if (b.roof === 'garden') {
        for (let q = 0; q < 2; q++) {
          const [x, y] = P(b.i + 0.55 + q * 0.9, b.j + 0.5, z);
          const g = ctx.createRadialGradient(x - 6, y - 22, 2, x, y - 14, 20); g.addColorStop(0, '#effbef'); g.addColorStop(1, '#9ccbad');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 14 * e, 17 * e, 0, S.TAU); ctx.fill();
        }
      } else if (b.roof === 'awning') {
        onGround(ctx, z, () => {
          for (let q = 0; q < 4; q++) { ctx.fillStyle = q % 2 ? '#f7f2ec' : '#f4b9c8'; ctx.fillRect(b.i + 0.15 + q * 0.42 * e, b.j + 0.2, 0.42 * e, 0.6); }
        });
      }
    }
    return z;
  }

  // 云朵（黏土团）
  function cloud(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const blobs = [[-50, 6, 34], [-12, -16, 46], [34, -2, 38], [64, 12, 24]];
    ctx.fillStyle = 'rgba(120,100,190,0.12)'; ctx.beginPath(); ctx.ellipse(8, 38, 92, 12, 0, 0, S.TAU); ctx.fill();
    for (const [bx, by, r] of blobs) {
      const g = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.45, r * 0.1, bx, by, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#f3effc'); g.addColorStop(1, '#d9d0f3');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, S.TAU); ctx.fill();
    }
    ctx.fillStyle = '#e4dcf6'; S.rr(ctx, -84, 10, 172, 22, 11); ctx.fill();
    ctx.restore();
  }

  // 等轴挤出文字（立在法线 +i 的立面上，向右上升）
  function isoText(ctx, text, x, y, size, font, opt) {
    ctx.save(); ctx.translate(x, y); ctx.transform(1, -0.5, 0, 1, 0, 0);
    ctx.font = S.F(size, font, opt.weight || ''); ctx.textBaseline = 'alphabetic';
    const cs = S.chars(ctx, text, 0, 'left', opt.sp || 0);
    const depth = opt.depth;
    cs.forEach((c, k) => {
      if (c.ch === ' ') return;
      const t0 = opt.t0 + k * opt.stagger, a = S.seg(opt.t, t0, t0 + 0.42);
      if (a <= 0) return;
      const dy = -(1 - S.E.outBounce(a)) * 260;
      ctx.save(); ctx.globalAlpha = S.clamp(a * 5);
      // 挤出：向 -i 方向（平面坐标 (-1,-1)）堆叠
      for (let q = depth; q >= 1; q--) {
        const kk = q / depth;
        ctx.fillStyle = q === depth ? opt.back : css(mix(rgb(opt.side), rgb(opt.back), kk));
        ctx.fillText(c.ch, c.x - q, dy - q);
      }
      ctx.fillStyle = opt.front; ctx.fillText(c.ch, c.x, dy);
      if (opt.hi) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.restore(); }
      ctx.restore();
    });
    ctx.restore();
  }

  registerScene({
    n: 2, key: 'iso', zh: '等轴 2.5D', en: 'Isometric 2.5D',
    bg: '#d6cdf2', accent: INDIGO,
    draw(ctx, t, S) {
      const { W, H, E, seg, clamp } = S;
      // 背景：薰衣草雾
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#b7aeea'); bg.addColorStop(0.45, '#d8cff4'); bg.addColorStop(1, '#efe6f6');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const hz = ctx.createRadialGradient(520, 1150, 60, 520, 1150, 780);
      hz.addColorStop(0, 'rgba(255,250,255,0.75)'); hz.addColorStop(1, 'rgba(255,250,255,0)');
      ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
      // 远处等轴网格（淡）
      { ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#8f80d6'; ctx.lineWidth = 1.5;
      const pan = t * 6;
      for (let k = -30; k <= 30; k++) {
        ctx.beginPath(); ctx.moveTo(-200, 1500 + k * 54 + pan * 0.5 - 1); ctx.lineTo(1300, 1500 + k * 54 + pan * 0.5 - 1 + 750); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-200, 1500 + k * 54 + 750); ctx.lineTo(1300, 1500 + k * 54); ctx.stroke();
      }
      ctx.restore(); }

      // 云（视差）
      cloud(ctx, 120 + t * 10, 960 - t * 2, 0.8);
      cloud(ctx, 960 - t * 7, 1640, 0.7);

      // 镜头：缓慢推进与平移
      const cam = 0.96 + 0.05 * E.inOut2(seg(t, -0.4, 4.4));
      ctx.save();
      ctx.translate(520, 1170); ctx.scale(cam, cam); ctx.translate(-520 - (t - 2) * 5, -1170 + (t - 2) * 3);

      // 岛的悬浮阴影
      ctx.save(); const sg = ctx.createRadialGradient(520, 1700, 10, 520, 1700, 380);
      sg.addColorStop(0, 'rgba(90,70,170,0.26)'); sg.addColorStop(1, 'rgba(90,70,170,0)');
      ctx.fillStyle = sg; ctx.translate(520, 1700); ctx.scale(1, 0.3); ctx.translate(-520, -1700); ctx.beginPath(); ctx.arc(520, 1700, 380, 0, S.TAU); ctx.fill(); ctx.restore();

      const bob = Math.sin(t * Math.PI) * 4;
      ctx.translate(0, bob);
      // 岛体：底部岩块 + 土层 + 草皮
      block(ctx, 1.2, 1.2, 5.6, 5.6, -150, 70, shades('#c9b7ea'), 1.4, { edge: false });
      block(ctx, 0.35, 0.35, 7.3, 7.3, -92, 60, shades('#ecd2c0'), 0.9, { edge: false });
      block(ctx, 0, 0, 8, 8, -32, 32, shades('#cfe9d4'), 0.7);
      // 地面细节
      onGround(ctx, 0, () => {
        // 环路
        ctx.fillStyle = '#c9c3e3'; S.rr(ctx, 1, 1, 6, 6, 0.6); ctx.fill();
        ctx.fillStyle = '#bdb6dc'; S.rr(ctx, 1.05, 1.05, 5.9, 5.9, 0.55); ctx.fill();
        // 中心线虚线
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.05; ctx.setLineDash([0.25, 0.22]); ctx.lineDashOffset = -t * 0.6;
        S.rr(ctx, 1.5, 1.5, 5, 5, 0.3); ctx.stroke(); ctx.setLineDash([]);
        // 斑马线
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let q = 0; q < 5; q++) ctx.fillRect(1.08 + q * 0.18, 4.1, 0.1, 0.8);
        for (let q = 0; q < 5; q++) ctx.fillRect(4.1, 6.08 + q * 0.18, 0.8, 0.1);
        // 草地上的小花点
        for (let q = 0; q < 46; q++) {
          const a = S.hash(q * 3.1), b = S.hash(q * 7.7);
          let ii = a * 8, jj = b * 8; if (ii > 0.85 && ii < 7.15 && jj > 0.85 && jj < 7.15) continue;
          ctx.fillStyle = ['#ffffff', '#f7c6d6', '#fff0b8', '#d8cdfa'][q % 4]; ctx.beginPath(); ctx.arc(ii, jj, 0.045, 0, S.TAU); ctx.fill();
        }
      });
      // 广场（略高）
      block(ctx, 2, 2, 4, 4, 0, 7, shades('#f7f1ea'), 0.35);
      onGround(ctx, 7, () => {
        ctx.strokeStyle = 'rgba(160,140,210,0.25)'; ctx.lineWidth = 0.02;
        for (let q = 1; q < 8; q++) { ctx.beginPath(); ctx.moveTo(2.1, 2 + q * 0.5); ctx.lineTo(5.9, 2 + q * 0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2 + q * 0.5, 2.1); ctx.lineTo(2 + q * 0.5, 5.9); ctx.stroke(); }
        // 公园草坪
        ctx.fillStyle = '#cfe9d4'; S.rr(ctx, 4.1, 3.1, 1.8, 1.8, 0.3); ctx.fill();
        // 水池
        const rip = (t * 0.7) % 1;
        ctx.fillStyle = '#bcd5f6'; ctx.beginPath(); ctx.arc(3.5, 4.5, 0.36, 0, S.TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - rip)})`; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.arc(3.5, 4.5, 0.08 + rip * 0.25, 0, S.TAU); ctx.stroke();
      });

      // 接触阴影层（低分辨率，模糊）
      // 柔和接触阴影：多层半透明叠加
      ctx.save(); ctx.fillStyle = 'rgba(85,60,160,0.07)';
      const shadowFoot = (i0, j0, w, d, h) => {
        const len = Math.min(1.8, h / 80);
        for (let q = 0; q < 4; q++) {
          const e = q * 0.07, l = len * (0.55 + q * 0.18);
          const pts = [[i0 - e, j0 - e], [i0 + w + e, j0 - e], [i0 + w + l * 0.85 + e, j0 + l * 0.2], [i0 + w + l * 0.85 + e, j0 + d + l * 0.2 + e], [i0 + l * 0.85, j0 + d + l * 0.2 + e], [i0 - e, j0 + d + e]];
          poly(ctx, hull(pts.map(v => P(v[0], v[1], 7)))); ctx.fill();
        }
      };
      BUILD.forEach(b => { let n = 0; for (let f = 0; f < b.n; f++) if (t >= (b.b0 + f) * 0.5 - 0.05) n++; if (n) shadowFoot(b.i, b.j, b.w, b.d, n * FLOOR); });
      for (const tr of TREES) {
        const e = tr.b * 0.5 - 0.15 <= -0.4 ? 1 : S.E.outBack(seg(t, tr.b * 0.5 - 0.15, tr.b * 0.5 + 0.35), 2.6); if (e <= 0.01) continue;
        const [x, y] = P(tr.i, tr.j, 0); for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.ellipse(x + 20 * tr.s * e, y + 3, (26 + q * 9) * tr.s * e, (12 + q * 4) * tr.s * e, 0, 0, S.TAU); ctx.fill(); }
      }
      for (const c of [carAt(t), carAt2(t)]) { const [x, y] = P(c.i, c.j, 0); for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.ellipse(x + 6, y + 4, 26 + q * 7, 13 + q * 3, 0, 0, S.TAU); ctx.fill(); } }
      ctx.restore();

      // 物体按深度排序绘制
      const items = [];
      BUILD.forEach(b => items.push({ d: b.i + b.j + (b.w + b.d) / 2, f: () => drawBuilding(ctx, b, t) }));
      TREES.forEach(tr => items.push({ d: tr.i + tr.j + 0.1, f: () => drawTree(ctx, tr, t) }));
      { const c = carAt(t); items.push({ d: c.i + c.j + 0.2, f: () => drawCar(ctx, t, c) }); const c2 = carAt2(t); items.push({ d: c2.i + c2.j + 0.2, f: () => drawCar(ctx, t + 0.13, c2, '#f7f2ec', '#c3d6f4') }); }
      // 路灯
      [[1.0, 3.0], [7.0, 5.0], [3.0, 7.0], [5.0, 1.0]].forEach(([i, j], q) => items.push({ d: i + j, f: () => {
        const [x, y] = P(i, j, 0); ctx.strokeStyle = '#efe9fb'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 62); ctx.stroke();
        const on = 0.6 + 0.4 * S.pulse(t + q * 0.25, 4);
        ctx.fillStyle = `rgba(255,244,205,${on})`; ctx.beginPath(); ctx.arc(x, y - 66, 8, 0, S.TAU); ctx.fill();
      } }));
      items.sort((a, b) => a.d - b.d).forEach(it => it.f());
      ctx.restore();

      // 热气球（远景点缀）
      {
        const bx = 900 + Math.sin(t * 0.8) * 8, by = 700 - t * 14;
        ctx.save(); ctx.translate(bx, by);
        const g = ctx.createRadialGradient(-16, -20, 4, 0, 0, 56);
        g.addColorStop(0, '#fff7fb'); g.addColorStop(0.6, '#f6c9da'); g.addColorStop(1, '#d9a6c9');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 54); ctx.bezierCurveTo(-60, 10, -52, -50, 0, -50); ctx.bezierCurveTo(52, -50, 60, 10, 0, 54); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-18, -26, 8, 14, 0.5, 0, S.TAU); ctx.fill();
        ctx.strokeStyle = '#b9a6d9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 54); ctx.lineTo(-8, 70); ctx.moveTo(10, 54); ctx.lineTo(8, 70); ctx.stroke();
        ctx.fillStyle = INDIGO; S.rr(ctx, -11, 68, 22, 16, 4); ctx.fill();
        ctx.restore();
      }

      // ---------- 标题：等轴挤出字 ----------
      const TX = 92, TY = 690;
      // 编号块：靛蓝黏土立方体，侧面印 02
      {
        const a = seg(t, -0.4, 0.05), e = E.outBounce(a), dy = -(1 - e) * 300;
        ctx.save(); ctx.translate(0, dy); ctx.globalAlpha = clamp(a * 4);
        const bx = TX + 6, by = TY - 210; // 方块左下前角
        const w = 150, hgt = 150, dep = 70;
        // 正面（法线 +i，向右上）
        ctx.save(); ctx.translate(bx, by); ctx.transform(1, -0.5, 0, 1, 0, 0);
        // 顶面与左侧面
        ctx.fillStyle = '#4b48b8';
        ctx.beginPath(); ctx.moveTo(0, -hgt); ctx.lineTo(w, -hgt); ctx.lineTo(w - dep, -hgt - dep); ctx.lineTo(-dep, -hgt - dep); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1d1b63';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -hgt); ctx.lineTo(-dep, -hgt - dep); ctx.lineTo(-dep, -dep); ctx.closePath(); ctx.fill();
        ctx.fillStyle = INDIGO; ctx.fillRect(0, -hgt, w, hgt);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -hgt); ctx.lineTo(w, -hgt); ctx.stroke();
        ctx.font = S.F(108, 'ArchivoBlack'); ctx.textAlign = 'center'; ctx.fillStyle = '#f6f1ff'; ctx.fillText('02', w / 2, -hgt / 2 + 38);
        ctx.restore();
        ctx.restore();
      }
      const ink = { front: '#fbf9ff', side: '#4541b8', back: '#1c1960', depth: 15, t, stagger: 0.07 };
      isoText(ctx, '等轴', TX + 190, TY - 34, 150, 'NotoSansSC', { ...ink, weight: 900, t0: -0.05 });
      isoText(ctx, '2.5D', TX + 500, TY - 190, 150, 'ArchivoBlack', { ...ink, t0: 0.1, sp: 2 });
      isoText(ctx, 'ISOMETRIC  2.5D', TX + 60, TY + 150, 54, 'ArchivoBlack', { front: INDIGO, side: '#8f86d8', back: '#6c62c0', depth: 6, t, stagger: 0.025, t0: 0.25, sp: 4 });
    },
  });
})();
