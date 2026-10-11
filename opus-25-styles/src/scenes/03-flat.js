// 03 扁平矢量 Flat Vector —— 珊瑚红小圆点在一个几何小世界里按拍弹跳，最后膨胀成整屏擦除，进入第二个世界（星球）。
(function () {
  const C = {
    blue: '#1f4fff', blueD: '#1640e0', blueDD: '#1236c4', blueL: '#3a66ff',
    coral: '#ff5a4e', coralD: '#e2463b', mint: '#3fe0b2', mintD: '#22c094', yellow: '#ffd23f', yellowD: '#f5b400',
    cream: '#fff3dc', creamD: '#f3e1c0', navy: '#0c1a4d', navyL: '#1b2c6e',
  };
  const R = 46, R2 = 58;                                   // 主角圆点半径
  const P1 = { x: 250, y: 880 }, P2 = { x: 760, y: 1060 }, P3 = { x: 300, y: 1318 }, C0 = { x: 540, y: 1150 };
  const PL = { x: 540, y: 1210, r: 300 };         // 世界二：星球
  const SW0 = 1.86, SW1 = 2.16, LAG = 0.08;       // 膨胀擦除

  // ---------- 小工具 ----------
  const circle = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); };
  const pill = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, w), h, h / 2); ctx.fill(); };
  const rect = (ctx, x, y, w, h, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); };
  // 弹出：0→1 带过冲
  const pop = (S, t, t0, d = 0.4, s = 2.2) => t <= t0 ? 0 : t >= t0 + d ? 1 : S.E.outBack((t - t0) / d, s);
  // 碰撞后平台下沉（阻尼振荡）
  const dip = (t, tl, amp = 20) => { const d = t - tl; return d < 0 ? 0 : amp * Math.exp(-7 * d) * Math.sin(d * 26 + 0.9) / Math.sin(0.9) * 0.9; };
  function dotArray(ctx, x, y, cols, rows, gap, r, col, t = 0, wave = 0, phase = 0) {
    ctx.fillStyle = col;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = wave ? 1 + wave * Math.sin(t * 7 - (i + j) * 0.7 + phase) : 1;
      ctx.beginPath(); ctx.arc(x + i * gap, y + j * gap, r * Math.max(0, k), 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- 主角：世界一 ----------
  function heroPos(t) {
    // 返回 {x, y(圆心), surf(若在接触), land(上次着地时刻)}
    if (t < 0.5) { const k = Math.max(0, t) / 0.5; return { x: P1.x, y: -90 + (P1.y - R + 90) * k * k, air: true }; }
    const arc = (t, ta, tb, a, b, h) => { const u = (t - ta) / (tb - ta); return { x: S.lerp(a.x, b.x, u), y: S.lerp(a.y - R, b.y - R, u) - 4 * h * u * (1 - u), air: true }; };
    if (t < 0.62) return { x: P1.x, contact: P1, land: 0.5, k: (t - 0.5) / 0.12 };
    if (t < 1.0) return arc(t, 0.62, 1.0, P1, P2, 250);
    if (t < 1.12) return { x: P2.x, contact: P2, land: 1.0, k: (t - 1.0) / 0.12 };
    if (t < 1.5) return arc(t, 1.12, 1.5, P2, P3, 170);
    if (t < 1.6) return { x: P3.x, contact: P3, land: 1.5, k: (t - 1.5) / 0.1 };
    if (t < SW0) { const u = S.E.out2((t - 1.6) / (SW0 - 1.6)); return { x: S.lerp(P3.x, C0.x, (t - 1.6) / (SW0 - 1.6)), y: S.lerp(P3.y - R, C0.y, u), air: true }; }
    return { x: C0.x, y: C0.y, hold: true };
  }
  const surfY = (p, t) => p.y + dip(t, p === P1 ? 0.5 : p === P2 ? 1.0 : 1.5);

  function drawBlob(ctx, x, y, r, sx, sy, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sx, sy);
    circle(ctx, 0, 0, r, col);
    ctx.restore();
  }
  function drawHeroA(ctx, t, S) {
    if (t < 0.01) return;
    const p = heroPos(t);
    if (p.contact) { // 接触：压扁 → 回弹
      const sy = 1 - 0.42 * Math.cos(p.k * Math.PI / 2) ** 2 + 0.12 * Math.sin(p.k * Math.PI);
      const sx = 1 / Math.pow(sy, 0.85), sf = surfY(p.contact, t);
      drawBlob(ctx, p.x, sf - R * sy, R, sx, sy, 0, C.coral);
      return;
    }
    if (p.hold) { // 预备收缩 → 膨胀
      const k = S.seg(t, SW0, SW1);
      const pre = 1 - 0.18 * Math.sin(S.seg(t, SW0 - 0.04, SW0 + 0.05) * Math.PI);
      const r = R * pre + 1400 * S.E.in3(k);
      // 领先的黄色圆环 + 放射短线
      if (k > 0) {
        const r2 = r + 26 + 90 * Math.sin(Math.min(1, k * 1.4) * Math.PI / 2);
        ctx.strokeStyle = C.yellow; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(p.x, p.y, r2, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = C.mint; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(p.x, p.y, r2 + 44 + 60 * k, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = C.cream; ctx.lineCap = 'round'; ctx.lineWidth = 14 * (1 - k) + 3;
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.1, q0 = r2 + 80 + 140 * k, q1 = q0 + 60 * (1 - k) + 14; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * q0, p.y + Math.sin(a) * q0); ctx.lineTo(p.x + Math.cos(a) * q1, p.y + Math.sin(a) * q1); ctx.stroke(); }
      }
      circle(ctx, p.x, p.y, r, C.coral);
      return;
    }
    const e = 0.008, a = heroPos(t - e), b = heroPos(t + e);
    const vx = ((b.x ?? p.x) - (a.x ?? p.x)) / (2 * e), vy = ((b.y ?? p.y) - (a.y ?? p.y)) / (2 * e);
    const sp = Math.hypot(vx, vy), st = 1 + Math.min(0.5, sp / 5200);
    drawBlob(ctx, p.x, p.y, R, 1 / Math.sqrt(st), st, Math.atan2(vy, vx) - Math.PI / 2, C.coral);
  }

  // 碰撞特效：放射短线 + 涟漪
  function impact(ctx, S, t, tl, x, y, col, ringCol, n = 9, spread = 1) {
    const d = t - tl; if (d < 0 || d > 0.6) return;
    const k = d / 0.6, e = S.E.outExpo(Math.min(1, d / 0.35));
    ctx.save(); ctx.lineCap = 'round';
    // 涟漪（扁椭圆）
    for (let i = 0; i < 2; i++) {
      const kk = S.clamp((d - i * 0.08) / 0.5); if (kk <= 0) continue;
      ctx.strokeStyle = ringCol; ctx.globalAlpha = 1 - kk; ctx.lineWidth = 10 * (1 - kk) + 2;
      ctx.beginPath(); ctx.ellipse(x, y, 40 + 190 * S.E.out3(kk) * spread, (12 + 50 * S.E.out3(kk)) * spread, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 放射短线（上半圈）
    ctx.strokeStyle = col; ctx.lineWidth = 12 * (1 - k) + 2;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI + (i + 0.5) / n * Math.PI;
      const r0 = (70 + 80 * e) * spread, r1 = r0 + 46 * (1 - k) * spread;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y - 10 + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y - 10 + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 世界一：蓝色几何小世界 ----------
  function world1(ctx, t, S) {
    ctx.fillStyle = C.blue; ctx.fillRect(0, 0, S.W, S.H);
    // 远景：深浅蓝圆形层
    circle(ctx, 980, 980, 360, C.blueD);
    circle(ctx, 80, 1180, 260, C.blueD);
    circle(ctx, 980, 980, 230, C.blue);
    circle(ctx, 980, 980, 120, C.blueD);
    pill(ctx, -60, 760, 360, 36, C.blueL);
    pill(ctx, 620, 1420, 300, 36, C.blueL);
    dotArray(ctx, 600, 690, 7, 3, 34, 6, C.blueL);
    // 彩虹弧：同心半圆描边
    ctx.save(); ctx.lineCap = 'butt';
    [[150, C.coralD, 0], [114, C.yellow, 1], [78, C.mint, 2], [42, C.cream, 3]].forEach(([r, col, i]) => {
      const k = S.E.outBack(S.clamp((t + 0.4 - i * 0.06) / 0.5), 1.4);
      ctx.strokeStyle = col; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(205, 790, r, Math.PI, Math.PI + Math.PI * k); ctx.stroke();
    });
    ctx.restore();
    // 云：奶油色药丸叠
    const cx = 640 + 26 * Math.sin(t * 1.2);
    pill(ctx, cx, 740, 250, 64, C.cream); pill(ctx, cx + 70, 700, 140, 64, C.cream); pill(ctx, cx + 170, 772, 120, 32, C.creamD);
    // 太阳：黄色圆 + 旋转放射药丸
    const sx = 905, sy = 620, sp = 1 + 0.06 * S.pulse(t, 7);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.6);
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); pill(ctx, 86, -9, 34, 18, C.yellow); }
    ctx.restore();
    circle(ctx, sx, sy, 66 * sp, C.yellow); circle(ctx, sx - 16, sy - 14, 24, '#ffe17a');

    // 地面
    rect(ctx, -40, 1560, S.W + 80, 500, 60, C.navy);
    dotArray(ctx, 120, 1640, 12, 4, 72, 7, C.navyL);
    // 小丘
    ctx.fillStyle = C.mint; ctx.beginPath(); ctx.arc(860, 1580, 230, Math.PI, 0); ctx.fill();
    ctx.fillStyle = C.mintD; ctx.beginPath(); ctx.arc(860, 1580, 230, Math.PI * 1.5, 0); ctx.lineTo(860, 1580); ctx.fill();
    // 树：圆冠 + 树干
    rect(ctx, 642, 1380, 22, 190, 11, C.navy); circle(ctx, 653, 1360, 62, C.mint); circle(ctx, 670, 1342, 30, '#7af0cc');
    rect(ctx, 960, 1240, 18, 140, 9, C.navy); circle(ctx, 969, 1230, 40, C.yellow);

    // P1：薄荷药丸 + 立杆
    const d1 = dip(t, 0.5);
    rect(ctx, P1.x - 9, P1.y + 50, 18, 1560 - P1.y - 50, 9, C.navy);
    pill(ctx, P1.x - 135, P1.y + d1, 270, 64, C.mint); pill(ctx, P1.x - 115, P1.y + d1 + 40, 230, 24, C.mintD);
    dotArray(ctx, P1.x - 90, P1.y + d1 + 32, 7, 1, 30, 5, C.mintD);

    // P2：黄色圆角方块 + 奶油点阵
    const d2 = dip(t, 1.0), h2 = 230 - d2 * 0.6;
    rect(ctx, P2.x - 26, P2.y + h2, 52, 1560 - P2.y - h2, 0, C.navy);
    rect(ctx, P2.x - 120, P2.y + d2, 240, h2 - d2 + 8, 40, C.yellow);
    rect(ctx, P2.x - 120, P2.y + d2 + (h2 - d2) * 0.62, 240, (h2 - d2) * 0.38 + 8, [0, 0, 40, 40], C.yellowD);
    dotArray(ctx, P2.x - 60, P2.y + d2 + 58, 3, 3, 60, 13, C.cream, t, 0.18 * S.clamp(1 - Math.abs(t - 1.15) * 2.2), 0);

    // P3：奶油药丸，下面是海军蓝半圆丘
    const d3 = dip(t, 1.5);
    ctx.fillStyle = C.navyL; ctx.beginPath(); ctx.arc(P3.x, 1562, 200, Math.PI, 0); ctx.fill();
    dotArray(ctx, P3.x - 90, 1440, 4, 2, 60, 8, C.navy);
    pill(ctx, P3.x - 150, P3.y + d3, 300, 60, C.cream); pill(ctx, P3.x - 130, P3.y + d3 + 38, 260, 22, C.creamD);

    // 薄荷点阵：随拍波动
    dotArray(ctx, 116, 1000, 4, 5, 36, 9, C.mint, t, 0.25, 0);

    // 碰撞特效
    impact(ctx, S, t, 0.5, P1.x, P1.y + 6, C.yellow, C.cream);
    impact(ctx, S, t, 1.0, P2.x, P2.y + 6, C.cream, C.mint);
    impact(ctx, S, t, 1.5, P3.x, P3.y + 6, C.yellow, C.mint);
    drawHeroA(ctx, t, S);
  }

  // ---------- 世界二：奶油底 + 蓝色星球 ----------
  function hero2(t) {
    // 2.22 从星球顶冒出，之后每拍着地：2.5 3.0 3.5 4.0 4.5
    const top = PL.y - PL.r;
    if (t < 2.22) return null;
    if (t < 2.5) { const u = (t - 2.22) / 0.28; return { x: PL.x, y: top - R2 - 220 * Math.sin(Math.PI * (0.5 + u * 0.5)) * Math.min(1, u * 3 + 0.4), sc: S.E.outBack(Math.min(1, u * 2.2), 2.5), air: true }; }
    const k = (t - 2.5) % 0.5, tl = t - k;
    if (k < 0.1) return { x: PL.x, contact: true, land: tl, k: k / 0.1 };
    const u = (k - 0.1) / 0.4, h = 300;
    return { x: PL.x, y: top - R2 - 4 * h * u * (1 - u), air: true, u };
  }
  function drawHero2(ctx, t, S) {
    const p = hero2(t); if (!p) return;
    const top = PL.y - PL.r + planetDip(t);
    if (p.contact) {
      const sy = 1 - 0.42 * Math.cos(p.k * Math.PI / 2) ** 2 + 0.12 * Math.sin(p.k * Math.PI), sx = 1 / Math.pow(sy, 0.85);
      drawBlob(ctx, p.x, top - R2 * sy, R2, sx, sy, 0, C.coral); return;
    }
    const e = 0.008, a = hero2(t - e) || p, b = hero2(t + e) || p;
    const vy = ((b.y ?? p.y) - (a.y ?? p.y)) / (2 * e), st = 1 + Math.min(0.45, Math.abs(vy) / 5200);
    const sc = p.sc ?? 1;
    drawBlob(ctx, p.x, p.y, R2 * sc, 1 / Math.sqrt(st), st, 0, C.coral);
  }
  const planetDip = t => { let d = 0; for (const tl of [2.5, 3.0, 3.5, 4.0]) d += dip(t, tl, 12); return d; };

  function ring(ctx, t, half) { // 星环：half = 'back' | 'front'
    ctx.save(); ctx.translate(PL.x, PL.y); ctx.rotate(-0.2);
    const rx = 470, ry = 108;
    ctx.strokeStyle = C.mint; ctx.lineWidth = 20; ctx.lineCap = 'round';
    ctx.beginPath(); half === 'back' ? ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2) : ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = C.mintD; ctx.lineWidth = 6;
    ctx.beginPath(); half === 'back' ? ctx.ellipse(0, 0, rx - 34, ry - 18, 0, Math.PI, Math.PI * 2) : ctx.ellipse(0, 0, rx - 34, ry - 18, 0, 0, Math.PI); ctx.stroke();
    // 卫星
    const moons = [[t * 1.3 + 0.4, C.yellow, 40], [t * 1.3 + 3.4, C.navy, 26]];
    for (const [a, col, r] of moons) {
      const s = Math.sin(a), front = s > 0;
      if ((half === 'front') !== front) continue;
      const x = Math.cos(a) * rx, y = s * ry, sc = 0.85 + 0.15 * s;
      circle(ctx, x, y, r * sc, col);
      if (col === C.yellow) circle(ctx, x - 10 * sc, y - 10 * sc, r * 0.38 * sc, '#ffe792');
    }
    ctx.restore();
  }

  function world2(ctx, t, S) {
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, S.W, S.H);
    const pk = (d) => pop(S, t, SW0 + 0.12 + d, 0.42, 2.0);
    // 背景大圆环
    circle(ctx, 540, 1210, 520 * pk(0), C.creamD);
    circle(ctx, 540, 1210, 420 * pk(0.02), C.cream);
    // 星点阵
    dotArray(ctx, 110, 660, 5, 4, 40, 8 * pk(0.05), C.coral, t, 0.25, 1);
    dotArray(ctx, 790, 640, 5, 3, 40, 8 * pk(0.08), C.blue, t, 0.25, 2);
    // 漂浮药丸云
    const dx = 30 * Math.sin(t * 1.4);
    pill(ctx, 70 + dx, 860, 220 * pk(0.1), 54, C.navy); pill(ctx, 150 + dx, 828, 110 * pk(0.12), 54, C.navy);
    pill(ctx, 760 - dx, 900, 230 * pk(0.14), 50, C.mint); pill(ctx, 830 - dx, 872, 120 * pk(0.16), 50, C.mint);
    // 底部：薄荷半圆丘 + 珊瑚半圆
    ctx.fillStyle = C.mint; ctx.beginPath(); ctx.arc(170, 1680, 300 * pk(0.18), Math.PI, 0); ctx.fill();
    ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(930, 1690, 240 * pk(0.2), Math.PI, 0); ctx.fill();
    rect(ctx, -40, 1640, S.W + 80, 400, 0, C.navy);
    dotArray(ctx, 60, 1720, 14, 3, 72, 7, C.navyL);

    const rs = pop(S, t, 2.12, 0.5, 1.6);
    ctx.save(); ctx.translate(PL.x, PL.y); ctx.scale(rs, rs); ctx.translate(-PL.x, -PL.y);
    ring(ctx, t, 'back'); ctx.restore();
    // 星球
    const s = pop(S, t, 2.06, 0.45, 2.2), pd = planetDip(t);
    ctx.save(); ctx.translate(PL.x, PL.y); ctx.scale(s, s); ctx.translate(0, PL.r); ctx.scale(1 + pd / 600, 1 - pd / 300); ctx.translate(-PL.x, -PL.y - PL.r);
    circle(ctx, PL.x, PL.y, PL.r, C.blueDD);
    ctx.save(); ctx.beginPath(); ctx.arc(PL.x, PL.y, PL.r, 0, Math.PI * 2); ctx.clip();
    circle(ctx, PL.x - 44, PL.y - 40, PL.r, C.blue);
    // 陨坑 + 点阵
    circle(ctx, PL.x - 120, PL.y + 40, 60, C.blueD); circle(ctx, PL.x - 112, PL.y + 32, 46, C.blueL);
    circle(ctx, PL.x + 90, PL.y - 120, 36, C.blueD); circle(ctx, PL.x + 95, PL.y - 126, 26, C.blueL);
    circle(ctx, PL.x + 40, PL.y + 150, 28, C.blueD);
    pill(ctx, PL.x - 220, PL.y - 60, 150, 26, C.blueL);
    pill(ctx, PL.x + 30, PL.y + 50, 180, 26, C.blueL);
    dotArray(ctx, PL.x - 30, PL.y - 200, 4, 2, 34, 6, C.cream);
    // 星球表面涟漪
    for (const tl of [2.5, 3.0, 3.5, 4.0]) {
      const d = t - tl; if (d < 0 || d > 0.55) continue; const k = d / 0.55;
      ctx.strokeStyle = C.cream; ctx.globalAlpha = 1 - k; ctx.lineWidth = 12 * (1 - k) + 3;
      for (let i = 0; i < 2; i++) { const kk = S.clamp(k * 1.2 - i * 0.2); ctx.beginPath(); ctx.ellipse(PL.x, PL.y - PL.r + 4, 50 + 240 * S.E.out3(kk), 18 + 70 * S.E.out3(kk), 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.translate(PL.x, PL.y); ctx.scale(rs, rs); ctx.translate(-PL.x, -PL.y);
    ring(ctx, t, 'front'); ctx.restore();
    // 放射短线
    for (const tl of [2.5, 3.0, 3.5, 4.0]) impact(ctx, S, t, tl, PL.x, PL.y - PL.r + 4, C.navy, 'rgba(0,0,0,0)', 9, 0.95);
    drawHero2(ctx, t, S);
  }

  // ---------- 标题 ----------
  function title(ctx, t, S, light) {
    const fg = light ? C.navy : C.cream;
    // 徽章 03
    const b = pop(S, t, -0.05, 0.45, 2.6), bp = 1 + 0.07 * S.pulse(t, 9) * (t > 0.4 ? 1 : 0);
    ctx.save(); ctx.translate(170, 302); ctx.scale(b * bp, b * bp);
    circle(ctx, 0, 0, 104, C.yellow); circle(ctx, 0, 0, 104, C.yellow);
    ctx.fillStyle = C.yellowD; ctx.beginPath(); ctx.arc(0, 0, 104, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fill();
    circle(ctx, 0, -8, 96, C.yellow);
    ctx.fillStyle = C.navy; ctx.font = S.F(116, 'SpaceGrotesk', 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('03', 0, -4);
    ctx.restore();
    // 中文：逐字落下，拉长 → 落地压扁 → 回弹
    ctx.font = S.F(156, 'NotoSansSC', 900); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const cs = S.chars(ctx, '扁平矢量', 304, 'left', 2), base = 362;
    cs.forEach((c, i) => {
      const t0 = 0.05 + i * 0.07, k = S.clamp((t - t0) / 0.26);
      if (t < t0) return;
      let y = base, sx = 1, sy = 1;
      if (k < 1) { y = base - 260 * (1 - k * k); sy = 1 + 0.35 * k; sx = 1 / Math.sqrt(sy); }
      else { const d = t - t0 - 0.26; const q = Math.exp(-11 * d) * Math.cos(d * 30); sy = 1 - 0.3 * q; sx = 1 + 0.22 * q; }
      ctx.save(); ctx.translate(c.cx, y); ctx.scale(sx, sy); ctx.fillStyle = fg; ctx.fillText(c.ch, -c.w / 2, 0); ctx.restore();
    });
    // 英文：海军蓝药丸展开
    const pw = 470 * S.E.outExpo(S.seg(t, 0.25, 0.75));
    if (pw > 2) {
      pill(ctx, 80, 432, pw + 4, 84, C.navy);
      ctx.save(); ctx.beginPath(); ctx.rect(80, 432, pw, 84); ctx.clip();
      ctx.fillStyle = C.cream; ctx.font = S.F(52, 'SpaceGrotesk', 700); ctx.letterSpacing = '5px';
      ctx.fillText('FLAT VECTOR', 122 - (1 - S.E.out3(S.seg(t, 0.3, 0.8))) * 120, 492);
      ctx.letterSpacing = '0px'; ctx.restore();
    }
    const m = pop(S, t, 0.55, 0.35, 3); circle(ctx, 620, 474, 42 * m, C.mint);
    const y2 = pop(S, t, 0.65, 0.35, 3); pill(ctx, 684, 448, 150 * y2, 52, C.coral);
    dotArray(ctx, 862, 456, 3, 2, 30, 7 * pop(S, t, 0.75, 0.3, 3), fg);
  }

  registerScene({
    n: 3, key: 'flat', zh: '扁平矢量', en: 'Flat Vector',
    bg: C.blue, accent: C.coral,
    draw(ctx, t, S) {
      const rc = t < SW0 ? 0 : Math.max(0, 1400 * S.E.in3(S.seg(t, SW0, SW1)) - 110 * S.smooth(SW0, SW0 + 0.1, t) + 110 * S.seg(t, SW1 - 0.06, SW1 + 0.04));
      if (rc < 1300) world1(ctx, t, S);
      if (rc > 0) {
        ctx.save(); ctx.beginPath(); ctx.arc(C0.x, C0.y, rc, 0, Math.PI * 2); ctx.clip();
        world2(ctx, t, S); ctx.restore();
      }
      // 标题：擦除圆内换深色
      if (rc < 1300) { ctx.save(); if (rc > 0) { ctx.beginPath(); ctx.rect(0, 0, S.W, S.H); ctx.arc(C0.x, C0.y, rc, 0, Math.PI * 2, true); ctx.clip('evenodd'); } title(ctx, t, S, false); ctx.restore(); }
      if (rc > 0) { ctx.save(); ctx.beginPath(); ctx.arc(C0.x, C0.y, rc, 0, Math.PI * 2); ctx.clip(); title(ctx, t, S, true); ctx.restore(); }
    },
  });
})();
