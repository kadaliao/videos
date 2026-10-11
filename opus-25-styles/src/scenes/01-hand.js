// 01 逐帧手绘 Frame-by-frame Hand-drawn
// 动画纸（定位孔、铅笔构造线、帧号）上的胖墨线角色：蓄力→起跳翻滚→落地（一拍），硬切近景 → 全屏爆炸星芒 + "耶！"。
// 线条一拍二（每 2 帧重抖一次），快动作一拍一。
(function () {
  const PAPER = '#fbf3e2', PAPER2 = '#efe3c9', INK = '#1e1914', RED = '#ff5534', YEL = '#ffbd1e', PINK = '#ff8f7a', PENCIL = 'rgba(70,80,110,0.22)';
  const { TAU } = S;

  // ---------- 手绘工具 ----------
  // 沿轮廓的平滑抖动（boil）：同一 fr 内稳定，fr 变则整体重抖
  function boil(pts, seed, fr, amp, closed = true) {
    const n = pts.length, out = new Array(n);
    for (let i = 0; i < n; i++) {
      const u = closed ? i / n : i / (n - 1);
      const a = S.noise3(u * 5.3 + seed * 1.7, fr * 0.91 + seed, 0.3) * amp, b = S.noise3(u * 5.3 + 40 + seed, fr * 0.91 - seed, 2.1) * amp;
      out[i] = [pts[i][0] + a, pts[i][1] + b];
    }
    return out;
  }
  function polyPath(ctx, pts, closed = true) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  }
  // 粗细不均的墨线：用法线偏移出一条带子，粗细随噪声变化，开口线两端收尖
  function ribbon(ctx, pts, w, seed, fr, closed = true, color = INK) {
    const n = pts.length; if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const u = closed ? i / n : i / (n - 1);
      let ww = w * (0.62 + 0.55 * (0.5 + 0.5 * S.noise3(u * 3.1 + seed * 3.3, fr * 0.37 + seed, 7.7)));
      if (!closed) ww *= Math.min(1, Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * 1.6 + 0.08);
      L.push([pts[i][0] - dy * ww / 2, pts[i][1] + dx * ww / 2]); R.push([pts[i][0] + dy * ww / 2, pts[i][1] - dx * ww / 2]);
    }
    ctx.fillStyle = color; ctx.beginPath();
    if (closed) { polyPath(ctx, L); polyPath(ctx, R.slice().reverse()); ctx.fill('evenodd'); }
    else { polyPath(ctx, L, false); for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill(); }
  }
  function ellipsePts(cx, cy, rx, ry, n = 48, rot = 0) {
    const a = []; for (let i = 0; i < n; i++) { const th = i / n * TAU; const x = Math.cos(th) * rx, y = Math.sin(th) * ry; a.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return a;
  }
  function linePts(x0, y0, x1, y1, n = 10, bend = 0) {
    const a = [], nx = -(y1 - y0), ny = x1 - x0, d = Math.hypot(nx, ny) || 1;
    for (let i = 0; i < n; i++) { const u = i / (n - 1), b = Math.sin(u * Math.PI) * bend; a.push([x0 + (x1 - x0) * u + nx / d * b, y0 + (y1 - y0) * u + ny / d * b]); } return a;
  }
  // 填色 + 墨线（填色略微错位，像手上色）
  function inkShape(ctx, pts, fill, w, seed, fr, amp = 3.5) {
    const b = boil(pts, seed, fr, amp);
    if (fill) { const f = boil(pts, seed + 9, fr, amp * 1.3); ctx.fillStyle = fill; ctx.beginPath(); polyPath(ctx, f.map(p => [p[0] + 3, p[1] + 2])); ctx.fill(); }
    ribbon(ctx, b, w, seed, fr, true);
    return b;
  }
  function inkLine(ctx, pts, w, seed, fr, amp = 3, color = INK) { ribbon(ctx, boil(pts, seed, fr, amp, false), w, seed, fr, false, color); }
  // 手排排线阴影：在 clipPts 内、偏移副本之外的月牙区域画斜线
  function hatch(ctx, clipPts, offx, offy, fr, seed, spacing = 15, w = 3.4, ang = 0.8) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of clipPts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    ctx.save(); ctx.beginPath(); polyPath(ctx, clipPts); ctx.clip();
    ctx.beginPath(); ctx.rect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100); polyPath(ctx, clipPts.map(p => [p[0] + offx, p[1] + offy])); ctx.clip('evenodd');
    const diag = Math.hypot(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let k = -diag / 2, i = 0; k < diag / 2; k += spacing, i++) {
      const px = cx - sa * k, py = cy + ca * k, j = (S.hash2(i + seed, fr) - 0.5) * 6;
      inkLine(ctx, linePts(px - ca * diag / 2 + j, py - sa * diag / 2, px + ca * diag / 2, py + sa * diag / 2 + j, 6), w, seed + i * 0.37, fr, 1.5);
    }
    ctx.restore();
  }

  // ---------- 角色（原点在脚底中心） ----------
  function bodyPts() {
    const a = []; for (let i = 0; i < 56; i++) {
      const th = i / 56 * TAU, s = Math.sin(th), c = Math.cos(th);
      const rx = 138 * (1 + 0.07 * s), ry = 150; a.push([c * rx, -150 + s * ry * (s > 0 ? 0.92 : 1)]);
    } return a;
  }
  const BODY = bodyPts();
  function drawChar(ctx, o, fr) {
    const { x, y, sx, sy, rot = 0, arms = 'side', eyes = 'open', mouth = 'smile', scale = 1, look = 0 } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    // 柔光
    const g = ctx.createRadialGradient(0, -150 * sy, 40, 0, -150 * sy, 360);
    g.addColorStop(0, S.hex(YEL, 0.55)); g.addColorStop(0.55, S.hex(YEL, 0.18)); g.addColorStop(1, S.hex(YEL, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -150 * sy, 360, 0, TAU); ctx.fill();
    // 旋转围绕身体中心
    ctx.translate(0, -150 * sy); ctx.rotate(rot); ctx.translate(0, 150 * sy);
    const T = p => [p[0] * sx, p[1] * sy];
    // 腿
    const legY = -6 * sy;
    inkLine(ctx, linePts(-55 * sx, -40 * sy, -62 * sx, legY + 8, 6, 4), 13, 21, fr);
    inkLine(ctx, linePts(55 * sx, -40 * sy, 62 * sx, legY + 8, 6, -4), 13, 22, fr);
    inkShape(ctx, ellipsePts(-74 * sx, legY + 10, 40, 17, 20), INK, 6, 23, fr, 2);
    inkShape(ctx, ellipsePts(74 * sx, legY + 10, 40, 17, 20), INK, 6, 24, fr, 2);
    // 手臂（在身体后面的一只）
    const sh = [[-118 * sx, -175 * sy], [118 * sx, -175 * sy]];
    const armEnd = side => {
      const d = side < 0 ? -1 : 1, s = sh[side < 0 ? 0 : 1];
      if (arms === 'up') return [s[0] + d * 95, s[1] - 170 * Math.min(1.2, sy)];
      if (arms === 'back') return [s[0] + d * 120, s[1] + 40];
      if (arms === 'wave') return [s[0] + d * 120, s[1] - 120];
      return [s[0] + d * 70, s[1] + 95];
    };
    const drawArm = side => {
      const s = sh[side < 0 ? 0 : 1], e = armEnd(side);
      inkLine(ctx, linePts(s[0], s[1], e[0], e[1], 8, side * 14), 14, 30 + side, fr);
      inkShape(ctx, ellipsePts(e[0], e[1], 26, 24, 18), RED, 7, 32 + side, fr, 2.2);
    };
    drawArm(-1);
    // 身体
    const bp = BODY.map(T);
    const b = inkShape(ctx, bp, RED, 13, 1, fr, 4.2);
    hatch(ctx, b, -38 * sx, -40 * sy, fr, 3, 15, 3.2, 0.75);
    // 高光
    ctx.fillStyle = 'rgba(255,240,220,0.85)'; ctx.beginPath(); polyPath(ctx, boil(ellipsePts(-62 * sx, -228 * sy, 26 * sx, 15 * sy, 14, -0.6), 40, fr, 2)); ctx.fill();
    // 脸
    const fx = 22 * sx + look, fy = -190 * sy;
    if (eyes === 'happy') {
      inkLine(ctx, linePts(fx - 72, fy + 4, fx - 22, fy + 4, 8, 22), 11, 50, fr, 1.5);
      inkLine(ctx, linePts(fx + 18, fy + 4, fx + 68, fy + 4, 8, 22), 11, 51, fr, 1.5);
    } else if (eyes === 'squint') {
      inkLine(ctx, linePts(fx - 70, fy - 10, fx - 28, fy + 6, 6, 0), 11, 52, fr, 1.5);
      inkLine(ctx, linePts(fx + 66, fy - 10, fx + 24, fy + 6, 6, 0), 11, 53, fr, 1.5);
    } else {
      for (const [ex, sd] of [[fx - 45, 54], [fx + 42, 55]]) {
        ctx.fillStyle = INK; ctx.beginPath(); polyPath(ctx, boil(ellipsePts(ex, fy, 18, 27, 16), sd, fr, 1.6)); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 5, fy - 10, 7, 0, TAU); ctx.fill();
      }
    }
    // 腮红
    for (const [cx, sd] of [[fx - 82, 60], [fx + 80, 61]]) { ctx.fillStyle = S.hex(PINK, 0.85); ctx.beginPath(); polyPath(ctx, boil(ellipsePts(cx, fy + 42, 22, 12, 14), sd, fr, 2)); ctx.fill(); }
    // 嘴
    const my = fy + 52;
    if (mouth === 'o') inkShape(ctx, ellipsePts(fx, my + 6, 16, 20, 16), '#7a1d14', 7, 62, fr, 1.5);
    else if (mouth === 'grin') {
      const m = []; for (let i = 0; i <= 14; i++) { const u = i / 14; m.push([fx - 44 + 88 * u, my - 4 + Math.sin(u * Math.PI) * 52]); }
      inkShape(ctx, m, '#7a1d14', 8, 63, fr, 1.5);
      ctx.fillStyle = PINK; ctx.beginPath(); ctx.ellipse(fx, my + 30, 20, 11, 0, 0, TAU); ctx.fill();
    } else inkLine(ctx, linePts(fx - 30, my, fx + 30, my, 9, 16), 10, 64, fr, 1.5);
    drawArm(1);
    ctx.restore();
  }

  // 4 角闪光（手绘）
  function sparkle(ctx, x, y, r, fr, seed, fill = YEL) {
    const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU - Math.PI / 2, rr = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.28 : r * 0.2; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    inkShape(ctx, p, fill, 6, seed, fr, 2);
  }
  function puff(ctx, x, y, r, fr, seed) { inkShape(ctx, ellipsePts(x, y, r, r * 0.78, 18), PAPER, 7, seed, fr, r * 0.08 + 1.5); }

  // 星芒（全屏 / 徽章）
  function starburst(ctx, cx, cy, R, fr, rotA, nRays, jag) {
    for (let i = 0; i < nRays; i++) {
      const a0 = rotA + i / nRays * TAU, a1 = rotA + (i + 1) / nRays * TAU;
      const p = [[cx, cy]]; for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * k / 4; p.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      ctx.fillStyle = i % 2 ? RED : YEL; ctx.beginPath(); polyPath(ctx, boil(p, 70 + i, fr, 5)); ctx.fill();
    }
    for (let i = 0; i < nRays; i++) { const a = rotA + i / nRays * TAU; inkLine(ctx, linePts(cx + Math.cos(a) * 80, cy + Math.sin(a) * 80, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 10, 0), jag, 90 + i, fr, 4); }
  }
  function jaggedBurst(ctx, cx, cy, R, fr, n = 14, fill = YEL) {
    const p = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU - 0.2, r = i % 2 ? R * (0.66 + 0.06 * S.hash(i)) : R * (0.95 + 0.1 * S.hash(i + 30)); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return inkShape(ctx, p, fill, 12, 77, fr, 5);
  }

  // ---------- 纸 ----------
  function paper(ctx, fr, t) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 1080, 1920);
    const vg = ctx.createRadialGradient(540, 900, 300, 540, 960, 1250); vg.addColorStop(0, 'rgba(255,250,235,0)'); vg.addColorStop(1, 'rgba(160,120,70,0.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 1080, 1920);
    S.grain(ctx, 0.07, 5, 'multiply', 1); S.grain(ctx, 0.12, 6, 'soft-light', 3);
    S.grain(ctx, 0.035, 11 + (fr % 4), 'multiply', 2); // 纸面轻微闪动（逐帧扫描感）
    // 定位孔
    ctx.fillStyle = '#d9cbb0';
    for (const [x, w] of [[380, 70], [540, 34], [700, 70]]) { S.rr(ctx, x - w / 2, 70, w, 34, 17); ctx.fill(); }
    ctx.strokeStyle = 'rgba(120,90,50,0.35)'; ctx.lineWidth = 2;
    for (const [x, w] of [[380, 70], [540, 34], [700, 70]]) { S.rr(ctx, x - w / 2, 70, w, 34, 17); ctx.stroke(); }
    // 页边线
    ctx.strokeStyle = 'rgba(220,90,70,0.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(54, 150); ctx.lineTo(54, 1880); ctx.stroke();
  }

  function title(ctx, t, fr) {
    const cnt = (k) => S.E.outBack(S.seg(t, k, k + 0.3), 2.2);
    // 编号：手画圈 + 01
    const k0 = cnt(-0.4);
    ctx.save(); ctx.translate(175, 345); ctx.scale(k0, k0); ctx.rotate(-0.08);
    inkShape(ctx, ellipsePts(0, 0, 112, 100, 30), YEL, 10, 200, fr, 5);
    ctx.font = S.F(170, 'Caveat', 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = INK; ctx.fillText('01', 2 + (S.hash(fr) - .5) * 4, 6 + (S.hash(fr + 3) - .5) * 4);
    ctx.restore();
    // 中文名
    ctx.font = S.F(158, 'ZCOOLKuaiLe'); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    const zh = '逐帧手绘';
    for (let i = 0; i < 4; i++) {
      const k = cnt(0.05 + i * 0.09); if (k <= 0) continue;
      const jx = (S.hash2(fr, i) - .5) * 5, jy = (S.hash2(fr, i + 9) - .5) * 5, r = (S.hash2(fr, i + 17) - .5) * 0.06 + (i % 2 ? 0.05 : -0.04);
      ctx.save(); ctx.translate(390 + i * 158 + jx, 410 + jy + (i % 2 ? 10 : -6)); ctx.rotate(r); ctx.scale(k, k);
      ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 16; ctx.strokeText(zh[i], 0, 0);
      ctx.fillStyle = i % 2 ? RED : PAPER; ctx.fillText(zh[i], 0, 0);
      ctx.restore();
    }
    // 英文
    const ke = S.E.out3(S.seg(t, 0.35, 0.7));
    ctx.save(); ctx.globalAlpha = ke; ctx.translate(560 + (1 - ke) * 40, 520); ctx.rotate(-0.025);
    ctx.font = S.F(68, 'Caveat', 700); ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.fillText('Frame-by-frame Hand-drawn', (S.hash(fr + 5) - .5) * 3, 0);
    inkLine(ctx, linePts(-340, 22, 340 * (2 * ke - 1), 26, 14, 6), 7, 300, fr, 2.5, RED);
    ctx.restore();
  }

  function timesheet(ctx, t, fr, cut) {
    ctx.save(); ctx.font = S.F(52, 'Caveat', 700); ctx.fillStyle = 'rgba(30,25,20,0.78)'; ctx.textAlign = 'left';
    const f = Math.max(0, Math.floor(t * 15)) * 2 + 1;
    ctx.fillText(`SC.01 · CUT ${cut}`, 96, 1530);
    ctx.textAlign = 'right'; ctx.fillText(`#${String(f).padStart(3, '0')}`, 984, 1530);
    inkLine(ctx, linePts(96, 1548, 400, 1546, 8, 2), 4, 400, fr, 1.5);
    ctx.restore();
  }

  function pencilGuides(ctx, x, y, sx, sy, scale) {
    ctx.save(); ctx.strokeStyle = PENCIL; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x + 10, y - 150 * sy * scale - 6, 150 * sx * scale, 160 * sy * scale, 0.05, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 200 * scale, y - 190 * sy * scale); ctx.quadraticCurveTo(x, y - 150 * sy * scale, x + 200 * scale, y - 196 * sy * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y - 330 * sy * scale); ctx.lineTo(x - 6, y + 10); ctx.stroke();
    ctx.restore();
  }

  // 远景：手绘云、小山、小花（静止，但线条仍在 boil）
  function backdrop(ctx, fr, t) {
    ctx.save();
    const hill = []; for (let i = 0; i <= 20; i++) { const u = i / 20; hill.push([60 + u * 960, 1390 - 120 * Math.exp(-((u - 0.18) ** 2) / 0.02) - 70 * Math.exp(-((u - 0.85) ** 2) / 0.015)]); }
    inkLine(ctx, hill, 5, 800, fr, 2.5, 'rgba(30,25,20,0.55)');
    for (const [cx, cy, s, sd] of [[220, 760, 1, 810], [860, 690, 0.8, 820]]) {
      const dx = Math.sin(t * 0.8 + sd) * 12;
      const p = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, bump = 1 + 0.16 * Math.abs(Math.sin(a * 3.5)); p.push([cx + dx + Math.cos(a) * 95 * s * bump, cy + Math.sin(a) * 42 * s * bump * (Math.sin(a) > 0 ? 0.55 : 1)]); }
      const b = inkShape(ctx, p, '#fffaf0', 6, sd, fr, 2.5);
      hatch(ctx, b, -10, -22, fr, sd + 3, 12, 2.2, 0.2);
    }
    for (const [fx, sd, c] of [[150, 830, RED], [960, 840, YEL]]) {
      inkLine(ctx, linePts(fx, 1392, fx + 6, 1310, 6, 5), 6, sd, fr, 2);
      const pet = []; for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; const r = 26 * (0.75 + 0.35 * Math.abs(Math.cos(a * 2.5))); pet.push([fx + 6 + Math.cos(a) * r, 1300 + Math.sin(a) * r]); }
      inkShape(ctx, pet, c, 5, sd + 1, fr, 1.5); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(fx + 6, 1300, 7, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // 动画师的轨迹弧线 + 间距刻度（每个一拍二的画面一个刻度）
  function spacingChart(ctx, X0, X1, GY, HJ, SC) {
    ctx.save(); ctx.strokeStyle = 'rgba(60,80,140,0.35)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 9]);
    const cy = GY - 150 * SC; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const p = i / 40; const x = S.lerp(X0, X1, p), y = cy - 4 * HJ * p * (1 - p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    for (let f = 0; f <= 15; f++) { const p = f / 15, x = S.lerp(X0, X1, p), y = cy - 4 * HJ * p * (1 - p); const dy = -4 * HJ * (1 - 2 * p), dx = X1 - X0, d = Math.hypot(dx, dy); ctx.beginPath(); ctx.moveTo(x - dy / d * 14, y + dx / d * 14); ctx.lineTo(x + dy / d * 14, y - dx / d * 14); ctx.stroke(); }
    ctx.font = S.F(34, 'Caveat', 700); ctx.fillStyle = 'rgba(60,80,140,0.55)'; ctx.fillText('1', X0 - 30, cy + 40); ctx.fillText('16', X1 + 20, cy + 40);
    ctx.restore();
  }

  registerScene({
    n: 1, key: 'hand', zh: '逐帧手绘', en: 'Frame-by-frame Hand-drawn',
    bg: PAPER, accent: RED,
    draw(ctx, t, S) {
      const fast = (t > 0.42 && t < 0.75) || (t > 1.32 && t < 1.62) || (t > 1.98 && t < 2.2);
      const fr = fast ? Math.floor(t * 30) : Math.floor(t * 15) * 2;
      const tq = fr / 30;
      paper(ctx, fr, t);
      const GY = 1390;
      if (t < 2) {
        // ---------- 镜头 1：蓄力 → 起跳翻滚 → 落地 ----------
        const X0 = 330, X1 = 720, HJ = 310, SC = 1.12;
        let x = X0, y = GY, sx = 1, sy = 1, rot = 0, arms = 'side', eyes = 'open', mouth = 'smile', hgt = 0;
        if (tq < 0) { sy = 1 + 0.025 * Math.sin(tq * 9); sx = 1 / sy; }
        else if (tq < 0.45) { const k = S.E.inOut2(S.seg(tq, 0, 0.45)); sy = 1 - 0.27 * k; sx = 1 + 0.2 * k; arms = 'back'; eyes = 'squint'; mouth = 'o'; }
        else if (tq < 1.5) {
          const p = S.seg(tq, 0.45, 1.5); hgt = 4 * HJ * p * (1 - p); x = S.lerp(X0, X1, p);
          const v = Math.abs(1 - 2 * p); sy = 1 + 0.32 * v * v; sx = 1 / Math.sqrt(sy); y = GY - hgt;
          rot = TAU * S.E.inOut3(S.seg(p, 0.22, 0.72)); arms = p < 0.75 ? 'up' : 'wave'; eyes = p > 0.25 && p < 0.7 ? 'happy' : 'open'; mouth = 'grin';
        } else {
          const k = S.seg(tq, 1.5, 2.0); const q = Math.exp(-6 * k) * Math.cos(TAU * 2.1 * k);
          x = X1; sy = 1 - 0.36 * q; sx = 1 + 0.3 * q; arms = k < 0.25 ? 'back' : 'side'; eyes = k < 0.2 ? 'squint' : 'open'; mouth = 'grin';
        }
        // 地面与影子
        inkLine(ctx, linePts(70, GY + 8, 1010, GY + 2, 24, 3), 9, 500, fr, 3);
        for (const [gx, sd] of [[180, 1], [860, 2], [930, 3], [250, 4]]) inkLine(ctx, linePts(gx, GY + 4, gx + 14, GY - 30, 5, 3), 6, 510 + sd, fr, 2);
        const shw = 1 - S.clamp(hgt / 520) * 0.6;
        const sp = ellipsePts(x, GY + 22, 175 * shw * sx, 26 * shw, 30);
        ctx.save(); ctx.globalAlpha = 0.9; hatch(ctx, sp, 0, -100, fr, 520, 11, 2.6, -0.5); ctx.restore();
        backdrop(ctx, fr, t);
        spacingChart(ctx, X0, X1, GY, HJ, SC);
        pencilGuides(ctx, x, y, sx, sy, SC);
        // 速度线（上升 / 下落）
        if (tq > 0.45 && tq < 1.5) {
          const p = S.seg(tq, 0.45, 1.5), up = p < 0.5, len = 260 * Math.abs(1 - 2 * p) + 40;
          for (let i = 0; i < 5; i++) {
            const lx = x + (i - 2) * 62 - (up ? 40 : -40), ly0 = up ? y + 20 + (i % 2) * 30 : y - 380 - (i % 2) * 30;
            inkLine(ctx, linePts(lx, ly0, lx, ly0 + (up ? len : -len), 6), 8, 600 + i, fr, 2.5);
          }
        }
        // 起跳尘土
        if (tq >= 0.45 && tq < 0.95) {
          const k = S.E.out3(S.seg(tq, 0.45, 0.95));
          for (let i = 0; i < 3; i++) for (const d of [-1, 1]) puff(ctx, X0 + d * (110 + i * 70) * (0.6 + k), GY - 18 - i * 6 - k * 18, (34 - i * 6) * (1 - k * 0.8), fr, 640 + i + d);
        }
        drawChar(ctx, { x, y, sx, sy, rot, arms, eyes, mouth, scale: SC }, fr);
        // 落地：尘土 + 冲击线
        if (tq >= 1.5 && tq < 2) {
          const k = S.E.out3(S.seg(tq, 1.5, 1.95));
          for (let i = 0; i < 4; i++) for (const d of [-1, 1]) puff(ctx, X1 + d * (170 + i * 60) * (0.55 + k * 0.7), GY - 14 - i * 8 - k * 20, (44 - i * 8) * (1 - k * 0.75), fr, 660 + i * 2 + d);
          if (k < 0.7) for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.42, r0 = 330 + k * 60, r1 = r0 + 70 * (1 - k); inkLine(ctx, linePts(X1 + Math.cos(a) * r0, GY - 140 + Math.sin(a) * r0, X1 + Math.cos(a) * r1, GY - 140 + Math.sin(a) * r1, 5), 10, 680 + i, fr, 2); }
        }
        if (tq > 0.75 && tq < 1.3) { const k = S.seg(tq, 0.75, 1.3); sparkle(ctx, 230, 860 - k * 40, 46 * Math.sin(k * Math.PI), fr, 700); sparkle(ctx, 880, 800 - k * 30, 36 * Math.sin(k * Math.PI), fr, 701, RED); }
        timesheet(ctx, t, fr, 1);
      } else {
        // ---------- 镜头 2（硬切）：近景 + 全屏星芒 ----------
        const k = S.seg(t, 2.0, 2.32), CX = 540, CY = 1040;
        const rotA = fr * 0.012;
        if (t < 2.32) {
          starburst(ctx, CX, CY, 2300, fr, rotA, 22, 6);
          ctx.fillStyle = `rgba(255,252,240,${0.85 * (1 - S.E.out2(k))})`; ctx.beginPath(); ctx.arc(CX, CY, 260 + 700 * k, 0, TAU); ctx.fill();
        } else {
          const kk = S.E.outBack(S.seg(t, 2.32, 2.7), 1.6), beat = S.pulse(t, 7);
          const R = 470 * kk + 22 * beat;
          const bp = jaggedBurst(ctx, CX, CY, R + 40, fr, 13, YEL);
          ctx.save(); ctx.beginPath(); polyPath(ctx, bp); ctx.clip(); starburst(ctx, CX, CY, R + 60, fr, rotA, 22, 5); ctx.restore();
          ribbon(ctx, bp, 12, 77, fr, true);
        }
        // 角色：举手欢呼，随拍子小跳
        const b = S.pulse(t, 9), hop = Math.max(0, Math.sin(S.fract(t * 2) * Math.PI)) * 40 * (t > 2.5 ? 1 : 0);
        const sy = t < 2.12 ? 1.18 : 1 - 0.1 * b + 0.04 * Math.sin(t * 9), sx = 1 / Math.sqrt(sy);
        const groundY = 1360;
        const shp = ellipsePts(CX, groundY + 14, 230 * sx * (1 - hop / 260), 34, 30);
        ctx.fillStyle = 'rgba(255,248,230,0.9)'; ctx.beginPath(); polyPath(ctx, boil(shp, 901, fr, 3)); ctx.fill();
        hatch(ctx, boil(shp, 900, fr, 3), 0, -200, fr, 902, 11, 2.6, -0.5);
        drawChar(ctx, { x: CX, y: groundY - hop, sx, sy, arms: 'up', eyes: 'happy', mouth: 'grin', scale: 1.42, rot: Math.sin(t * Math.PI * 2) * 0.05 }, fr);
        // 闪光 / 拟声
        const sp = [[205, 760, 60, 2.5], [880, 1260, 52, 3.0], [190, 1250, 44, 3.5], [890, 700, 40, 2.0]];
        sp.forEach(([x, y, r, tb], i) => { const kk = S.E.outBack(S.seg(t, tb, tb + 0.22), 3); if (kk > 0) sparkle(ctx, x, y, r * kk * (1 + 0.15 * S.pulse(t, 6)), fr, 950 + i, i % 2 ? RED : YEL); });
        const ky = S.E.outBack(S.seg(t, 2.05, 2.35), 3);
        if (ky > 0) {
          ctx.save(); ctx.translate(560 + (S.hash(fr) - .5) * 6, 790); ctx.rotate(-0.06); ctx.scale(ky, ky);
          ctx.font = S.F(170, 'ZCOOLKuaiLe'); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
          ctx.strokeStyle = INK; ctx.lineWidth = 18; ctx.strokeText('耶！', 0, 0); ctx.fillStyle = PAPER; ctx.fillText('耶！', 0, 0);
          ctx.restore();
        }
        timesheet(ctx, t, fr, 2);
      }
      title(ctx, t, fr);
    },
  });
})();
