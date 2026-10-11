// 08 赛博朋克 HUD · Cyberpunk HUD / FUI
// 一颗真 3D 投影的线框地球（经纬线 + 大陆点阵 + 城市弧线 + 倾斜轨道上的卫星），
// 被分段刻度环和十字准星锁定；设备开机式入场、逐行打字、强拍上切片错位故障后整屏切换为琥珀警报。
(function () {
  const BG = '#03070b';
  const CYAN = [60, 228, 255], WHITE = [226, 252, 255], AMBER = [255, 170, 32], RED = [255, 70, 60];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  const GX = 540, GY = 860, R = 238;

  // ---------- 静态数据 ----------
  let LAND = null, CITIES = null, HEX = null;
  function prep(S) {
    if (LAND) return;
    LAND = [];
    // 大陆：在经纬网格上用 fbm 阈值挑点
    for (let la = -78; la <= 78; la += 4.2) {
      const step = 4.2 / Math.max(0.25, Math.cos(la * Math.PI / 180));
      for (let lo = -180; lo < 180; lo += step) {
        const v = S.fbm(lo * 0.022 + 3.1, la * 0.03 + 1.7, 0.5, 4);
        if (v > 0.02) LAND.push(ll(la, lo));
      }
    }
    CITIES = [[31.2, 121.5], [40.7, -74], [51.5, -0.1], [35.7, 139.7], [-33.9, 151.2], [1.35, 103.8], [37.8, -122.4], [55.7, 37.6], [-23.5, -46.6], [19.4, -99.1]].map(([a, b]) => ll(a, b));
    const r = S.rng(808); HEX = [];
    for (let i = 0; i < 80; i++) HEX.push(Math.floor(r() * 65536).toString(16).toUpperCase().padStart(4, '0') + ' ' + Math.floor(r() * 256).toString(16).toUpperCase().padStart(2, '0'));
  }
  function ll(la, lo) { const a = la * Math.PI / 180, b = lo * Math.PI / 180; return [Math.cos(a) * Math.sin(b), -Math.sin(a), Math.cos(a) * Math.cos(b)]; }

  // 3D：绕 Y 轴 yaw，再绕 X 轴 tilt；透视投影
  function mkProj(yaw, tilt, cx, cy, rad) {
    const cy1 = Math.cos(yaw), sy1 = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt), D = 4.2;
    return ([x, y, z]) => {
      const x1 = x * cy1 + z * sy1, z1 = -x * sy1 + z * cy1;
      const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const p = D / (D - z2);
      return [cx + x1 * rad * p, cy + y2 * rad * p, z2];
    };
  }

  // 目标城市（上海）在 t=2.0 正好转到正中
  const TARGET = [31.2, 121.5];
  function yawAt(t, S) {
    const yT = -TARGET[1] * Math.PI / 180;
    const k = S.clamp((t + 0.4) / 2.4);
    const approach = Math.pow(1 - k, 2.2) * 2.2;     // 减速转入
    return yT + approach + (t > 2 ? (t - 2) * 0.18 : 0);
  }
  const TILT = -0.42;   // 目标纬度会被 tilt 拉回接近中心

  // ---------- 文字（逐行打字）----------
  function typed(str, t, t0, cps = 38) { const n = Math.floor((t - t0) * cps); return n <= 0 ? '' : str.slice(0, n); }

  function drawHUD(ctx, t, S, C, alert) {
    const { E, seg, clamp, lerp } = S;
    const on = k => clamp(k);
    // 开机：元素按序点亮，带闪烁
    const flick = (t0) => { const k = (t - t0) / 0.18; if (k <= 0) return 0; if (k >= 1) return 1; return (S.hash(Math.floor(t * 60) + t0 * 100) > 0.35 ? 1 : 0.15) * k + 0.2; };
    const C2 = rgba(C, 0.45), C3 = rgba(C, 0.18), CF = rgba(C, 1);
    const HOT = alert ? rgba([255, 236, 200], 1) : rgba(WHITE, 1);

    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';

    // ---------- 背景网格 + 边缘刻度 ----------
    const gA = flick(-0.3);
    if (gA > 0) {
      ctx.globalAlpha = gA;
      ctx.strokeStyle = rgba(C, 0.06); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 1080; x += 60) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 1920); }
      for (let y = 0; y <= 1920; y += 60) { ctx.moveTo(0, y + 0.5); ctx.lineTo(1080, y + 0.5); }
      ctx.stroke();
      // 左侧刻度尺
      ctx.strokeStyle = C2; ctx.beginPath();
      for (let y = 200; y <= 1540; y += 20) { const l = y % 100 === 0 ? 22 : 10; ctx.moveTo(40, y); ctx.lineTo(40 + l, y); }
      ctx.moveTo(40, 200); ctx.lineTo(40, 1540); ctx.stroke();
      // 刻度游标
      const cy = 860 + Math.sin(t * 2.1) * 220;
      ctx.fillStyle = CF; ctx.beginPath(); ctx.moveTo(66, cy); ctx.lineTo(80, cy - 8); ctx.lineTo(80, cy + 8); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ---------- 标题面板 ----------
    const tA = flick(-0.12);
    if (tA > 0) {
      ctx.globalAlpha = tA;
      bracketBox(ctx, 70, 186, 870, 250, 34, CF, 3);
      ctx.fillStyle = rgba(C, 0.06); ctx.fillRect(70, 186, 870, 250);
      // 斜切角标签
      ctx.fillStyle = CF; ctx.beginPath(); ctx.moveTo(70, 186); ctx.lineTo(250, 186); ctx.lineTo(232, 206); ctx.lineTo(70, 206); ctx.fill();
      ctx.font = S.F(17, 'JetBrainsMono'); ctx.fillStyle = BG; ctx.fillText('MODULE // 08', 80, 202);
      ctx.font = S.F(178, 'Orbitron', 800); ctx.fillStyle = HOT; ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = rgba(C, 0.9); ctx.shadowBlur = 28; ctx.fillText('08', 84, 396); ctx.shadowBlur = 0;
      // 中文名 + 英文名（逐字解码）
      const zh = '赛博朋克 HUD', en = 'CYBERPUNK HUD';
      ctx.font = S.F(78, 'NotoSansSC', 900); ctx.fillStyle = CF;
      const nz = Math.floor(clamp((t - 0.05) / 0.35) * zh.length + 0.001);
      ctx.fillText(zh.slice(0, nz) + scramble(zh.length - nz, t, S, 0), 400, 296);
      ctx.font = S.F(40, 'Orbitron', 800); ctx.fillStyle = HOT; ctx.letterSpacing = '6px';
      const ne = Math.floor(clamp((t - 0.15) / 0.4) * en.length + 0.001);
      ctx.fillText(en.slice(0, ne) + scramble(Math.min(en.length - ne, 4), t, S, 7), 402, 360);
      ctx.letterSpacing = '0px';
      ctx.font = S.F(22, 'JetBrainsMono'); ctx.fillStyle = C2;
      ctx.fillText(typed('FUI.SYS v2.077 ▸ NODE-08 ▸ LINK STABLE', t, 0.35, 60), 402, 408);
      ctx.globalAlpha = 1;
    }

    // ---------- 地球 ----------
    const gOn = flick(-0.05);
    const pw = E.outBack(clamp((t + 0.05) / 0.5), 1.4);           // 开机缩放
    if (gOn > 0) {
      ctx.globalAlpha = gOn;
      const yaw = yawAt(t, S), rad = R * pw;
      const P = mkProj(yaw, TILT, GX, GY, rad);
      // 球体暗面 + 边缘光
      const g = ctx.createRadialGradient(GX - rad * 0.3, GY - rad * 0.3, rad * 0.1, GX, GY, rad * 1.06);
      g.addColorStop(0, rgba(C, 0.10)); g.addColorStop(0.85, rgba(C, 0.04)); g.addColorStop(1, rgba(C, 0.22));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(GX, GY, rad * 1.02, 0, S.TAU); ctx.fill();
      // 经纬线：前半球亮、背面暗
      const line3 = (pts) => {
        let prevFront = null;
        const pr = pts.map(P);
        for (const front of [false, true]) {
          ctx.strokeStyle = front ? rgba(C, 0.55) : rgba(C, 0.12); ctx.lineWidth = front ? 1.6 : 1;
          ctx.beginPath(); let pen = false;
          for (let i = 0; i < pr.length; i++) {
            const q = pr[i], f = q[2] > -0.05;
            if (f === front) { if (!pen) { ctx.moveTo(q[0], q[1]); pen = true; } else ctx.lineTo(q[0], q[1]); } else pen = false;
          }
          ctx.stroke();
        }
      };
      for (let la = -75; la <= 75; la += 15) { const pts = []; for (let lo = -180; lo <= 180; lo += 6) pts.push(ll(la, lo)); line3(pts); }
      for (let lo = -180; lo < 180; lo += 20) { const pts = []; for (let la = -90; la <= 90; la += 6) pts.push(ll(la, lo)); line3(pts); }
      // 大陆点阵（只画正面，越靠边越暗）
      for (const v of LAND) {
        const q = P(v); if (q[2] < 0.02) continue;
        ctx.fillStyle = rgba(C, 0.25 + 0.65 * q[2]);
        const s = 2.2 + 1.6 * q[2]; ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
      // 城市之间的弧线（抬高的大圆弧）
      ctx.lineWidth = 1.6;
      const draw = clamp((t - 0.6) / 1.2);
      for (let i = 1; i < 7; i++) {
        const a = CITIES[0], b = CITIES[i];
        const pts = [];
        const nn = 28, upto = Math.floor(nn * clamp(draw * 1.6 - i * 0.08));
        for (let k = 0; k <= upto; k++) {
          const u = k / nn; let x = a[0] * (1 - u) + b[0] * u, y = a[1] * (1 - u) + b[1] * u, z = a[2] * (1 - u) + b[2] * u;
          const l = Math.hypot(x, y, z), h = 1 + 0.12 * Math.sin(Math.PI * u);
          pts.push(P([x / l * h, y / l * h, z / l * h]));
        }
        if (pts.length < 2) continue;
        ctx.strokeStyle = rgba(C, 0.75); ctx.beginPath();
        let pen = false;
        for (const q of pts) { if (q[2] > -0.1) { pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false; }
        ctx.stroke();
      }
      for (const c of CITIES) { const q = P(c); if (q[2] < 0) continue; ctx.fillStyle = HOT; ctx.fillRect(q[0] - 3, q[1] - 3, 6, 6); }
      // 轨道 + 卫星（3D 倾斜圆环）
      const orb = mkProj(yaw * 0.2 + 0.6, 1.15, GX, GY, rad * 1.42);
      const ring = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * S.TAU; ring.push(orb([Math.cos(a), 0, Math.sin(a)])); }
      ctx.setLineDash([10, 8]);
      for (const front of [false, true]) {
        ctx.strokeStyle = front ? rgba(C, 0.7) : rgba(C, 0.2); ctx.lineWidth = front ? 2 : 1;
        ctx.beginPath(); let pen = false;
        for (const q of ring) { const f = q[2] > 0; if (f === front) { pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false; }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      const sa = t * 1.1 + 0.4; const sp = orb([Math.cos(sa), 0, Math.sin(sa)]);
      // 卫星：小方块 + 太阳翼
      ctx.save(); ctx.translate(sp[0], sp[1]); ctx.rotate(-0.4);
      ctx.strokeStyle = HOT; ctx.lineWidth = 2; ctx.strokeRect(-9, -9, 18, 18);
      ctx.strokeStyle = CF; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-20, 0); ctx.moveTo(9, 0); ctx.lineTo(20, 0); ctx.stroke();
      for (const sx of [-1, 1]) { ctx.strokeRect(sx > 0 ? 20 : -48, -8, 28, 16); ctx.beginPath(); ctx.moveTo(sx > 0 ? 34 : -34, -8); ctx.lineTo(sx > 0 ? 34 : -34, 8); ctx.stroke(); }
      ctx.restore();
      ctx.font = S.F(18, 'JetBrainsMono'); ctx.fillStyle = CF; ctx.fillText('SAT-7 ▸ ' + (1200 + Math.floor(t * 37) % 100), sp[0] + 54, sp[1] - 12);

      // ---------- 刻度环（分段，各自旋转）----------
      const rr = rad + 52;
      seggedRing(ctx, GX, GY, rr, 64, 0.62, t * 0.35, rgba(C, 0.7), 4, S);
      ticksRing(ctx, GX, GY, rr + 26, 120, -t * 0.2, rgba(C, 0.45), S);
      arcSegs(ctx, GX, GY, rr + 58, [[0.1, 0.9], [1.4, 2.5], [3.2, 3.5], [4.1, 5.6]], -t * 0.5 + 0.3, rgba(C, 0.8), 3);
      arcSegs(ctx, GX, GY, rad + 18, [[0, 0.6], [2.1, 2.5], [3.6, 4.6]], t * 0.9, rgba(C, 0.35), 2);
      // 方位读数
      ctx.font = S.F(18, 'JetBrainsMono'); ctx.fillStyle = C2; ctx.textAlign = 'center';
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 - Math.PI / 2; const x = GX + Math.cos(a) * (rr + 82), y = GY + Math.sin(a) * (rr + 82) + 6;
        ctx.fillText(['000', '090', '180', '270'][k], x, y);
      }
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // ---------- 准星：锁定框按拍收拢 ----------
    const cA = flick(0.3);
    if (cA > 0) {
      ctx.globalAlpha = cA;
      const P = mkProj(yawAt(t, S), TILT, GX, GY, R);
      const tq = P(ll(TARGET[0], TARGET[1]));
      // 按拍步进收拢（每拍一跳 + 缓动）
      const bi = Math.floor((t - 0.3) / 0.5), bp = ((t - 0.3) / 0.5) - bi;
      const steps = clamp((Math.max(0, bi) + E.outBack(clamp(bp * 2.2), 2)) / 3.4);
      const lockK = t < 0.3 ? 0 : steps;
      const box = lerp(300, 74, lockK);
      const bx = lerp(GX, tq[0], E.out3(clamp((t - 0.2) / 1.6))), by = lerp(GY, tq[1], E.out3(clamp((t - 0.2) / 1.6)));
      const locked = t >= 2.0;
      const col = locked ? HOT : CF;
      ctx.strokeStyle = col; ctx.lineWidth = locked ? 4 : 3;
      const L = box * 0.32;
      ctx.shadowColor = rgba(C, 1); ctx.shadowBlur = 16;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = bx + sx * box / 2, y = by + sy * box / 2;
        ctx.beginPath(); ctx.moveTo(x - sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * L); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // 中心十字（有缺口）
      ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.beginPath();
      const g0 = 10, g1 = 28;
      ctx.moveTo(bx - g1, by); ctx.lineTo(bx - g0, by); ctx.moveTo(bx + g0, by); ctx.lineTo(bx + g1, by);
      ctx.moveTo(bx, by - g1); ctx.lineTo(bx, by - g0); ctx.moveTo(bx, by + g0); ctx.lineTo(bx, by + g1);
      ctx.stroke();
      // 长十字线（全屏）
      ctx.strokeStyle = rgba(C, 0.22); ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(70, by); ctx.lineTo(bx - box / 2 - 16, by); ctx.moveTo(bx + box / 2 + 16, by); ctx.lineTo(1010, by);
      ctx.moveTo(bx, 480); ctx.lineTo(bx, by - box / 2 - 16); ctx.moveTo(bx, by + box / 2 + 16); ctx.lineTo(bx, 1240);
      ctx.stroke();
      // 标签
      ctx.font = S.F(20, 'JetBrainsMono'); ctx.fillStyle = col;
      ctx.fillText(locked ? 'TGT ▸ LOCKED' : 'TGT ▸ ACQUIRING' + '...'.slice(0, 1 + Math.floor(t * 6) % 3), bx + box / 2 + 10, by - box / 2 + 4);
      ctx.fillStyle = C2; ctx.fillText('31.2304N 121.4737E', bx + box / 2 + 10, by - box / 2 + 28);
      ctx.globalAlpha = 1;
    }

    // ---------- 左下：逐行打字的读数 ----------
    const lA = flick(0.45);
    if (lA > 0) {
      ctx.globalAlpha = lA;
      bracketBox(ctx, 70, 1196, 430, 236, 20, C2, 2);
      ctx.font = S.F(19, 'JetBrainsMono'); ctx.fillStyle = CF;
      ctx.fillRect(70, 1196, 150, 26); ctx.fillStyle = BG; ctx.fillText('TELEMETRY', 80, 1215);
      const rows = [['LAT', '31.2304 N'], ['LON', '121.4737 E'], ['ALT', (35786 - Math.floor(t * 211)).toLocaleString('en') + ' KM'], ['VEL', (3.07 + Math.sin(t * 3) * 0.02).toFixed(3) + ' KM/S'], ['SIG', alert ? '!! INTRUSION' : 'NOMINAL']];
      ctx.font = S.F(28, 'JetBrainsMono');
      rows.forEach(([k, v], i) => {
        const t0 = 0.5 + i * 0.16;
        if (t < t0) return;
        const y = 1262 + i * 38;
        ctx.fillStyle = C2; ctx.fillText(k, 90, y);
        ctx.fillStyle = (i === 4 && alert) ? HOT : CF;
        const s = typed(v, t, t0 + 0.05, 50);
        ctx.fillText(s, 170, y);
        if (s.length < v.length && Math.floor(t * 8) % 2 === 0) ctx.fillRect(170 + ctx.measureText(s).width + 4, y - 22, 14, 26);
      });
      ctx.globalAlpha = 1;
    }

    // ---------- 右下：大号跳动数字 + 数据条 ----------
    const rA = flick(0.6);
    if (rA > 0) {
      ctx.globalAlpha = rA;
      ctx.textAlign = 'right';
      ctx.font = S.F(22, 'JetBrainsMono'); ctx.fillStyle = C2; ctx.fillText(t < 2 ? 'RANGE · 距离 / KM' : 'CLOSING · 逼近 / KM', 940, 1222);
      const tq = Math.floor(t * 30) / 30;
      const rng = tq < 2 ? 108.4 + 4177.7 * (1 - E.out2(clamp((tq + 0.4) / 2.4))) : 108.4 - (tq - 2) * 23.7;
      ctx.font = S.F(100, 'Orbitron', 800); ctx.fillStyle = HOT;
      ctx.shadowColor = rgba(C, 0.9); ctx.shadowBlur = 24; ctx.fillText(rng.toFixed(1).padStart(6, '0'), 940, 1322); ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
      // 数据条（随拍跳）
      const n = 16, x0 = 560, w = 380 / n;
      for (let i = 0; i < n; i++) {
        const base = 0.25 + 0.5 * S.hash(i * 3.1 + Math.floor(t * 8));
        const h = 96 * clamp(base + 0.35 * S.pulse(t, 6) * S.hash(i));
        ctx.fillStyle = i % 5 === 0 ? HOT : rgba(C, 0.75);
        ctx.fillRect(x0 + i * w + 2, 1442 - h, w - 6, h);
      }
      ctx.strokeStyle = C2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, 1446); ctx.lineTo(940, 1446); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ---------- 底部状态条 ----------
    const bA = flick(0.75);
    if (bA > 0) {
      ctx.globalAlpha = bA;
      const prog = clamp((t - 0.7) / 1.3);
      ctx.strokeStyle = CF; ctx.lineWidth = 2; ctx.strokeRect(70, 1470, 870, 50);
      const segs = 40;
      for (let i = 0; i < segs * prog; i++) { ctx.fillStyle = i > segs * prog - 2 ? HOT : rgba(C, 0.7); ctx.fillRect(78 + i * (854 / segs), 1478, 854 / segs - 4, 34); }
      ctx.font = S.F(22, 'JetBrainsMono');
      const stx = alert ? '▲ LOCK 100% · 目标已锁定 · ENGAGE' : 'LOCK ' + Math.floor(prog * 100).toString().padStart(3, '0') + '%';
      ctx.fillStyle = BG; ctx.fillRect(84, 1480, ctx.measureText(stx).width + 18, 30);
      ctx.fillStyle = HOT;
      ctx.fillText(alert ? '▲ LOCK 100% · 目标已锁定 · ENGAGE' : 'LOCK ' + Math.floor(prog * 100).toString().padStart(3, '0') + '%', 92, 1503);
      ctx.globalAlpha = 1;
    }

    // ---------- 右侧 hex 流 ----------
    const hA = flick(0.2);
    if (hA > 0) {
      ctx.globalAlpha = hA * 0.55; ctx.font = S.F(16, 'JetBrainsMono'); ctx.fillStyle = rgba(C, 0.8);
      const off = Math.floor(t * 14);
      for (let i = 0; i < 40; i++) ctx.fillText(HEX[(i + off) % HEX.length], 966, 470 + i * 28);
      ctx.globalAlpha = 1;
    }
  }

  function scramble(n, t, S, salt) {
    const G = '#%&@$*01<>/\\=+';
    let s = ''; for (let i = 0; i < n; i++) s += G[Math.floor(S.hash(i * 7.7 + Math.floor(t * 24) + salt) * G.length)];
    return s;
  }
  function bracketBox(ctx, x, y, w, h, l, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    ctx.moveTo(x, y + l); ctx.lineTo(x, y); ctx.lineTo(x + l, y);
    ctx.moveTo(x + w - l, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + l);
    ctx.moveTo(x + w, y + h - l); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - l, y + h);
    ctx.moveTo(x + l, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - l);
    ctx.stroke();
  }
  function seggedRing(ctx, cx, cy, r, n, fill, rot, col, lw, S) {
    ctx.strokeStyle = col; ctx.lineWidth = lw * 3;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (S.hash(i * 1.37) < 0.18) continue;
      const a0 = rot + i / n * S.TAU, a1 = a0 + fill / n * S.TAU;
      ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); ctx.arc(cx, cy, r, a0, a1);
    }
    ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.globalAlpha /= 0.5;
  }
  function ticksRing(ctx, cx, cy, r, n, rot, col, S) {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * S.TAU, l = i % 10 === 0 ? 18 : 7;
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * (r + l), cy + Math.sin(a) * (r + l));
    }
    ctx.stroke();
  }
  function arcSegs(ctx, cx, cy, r, segs, rot, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    for (const [a, b] of segs) { ctx.beginPath(); ctx.arc(cx, cy, r, a + rot, b + rot); ctx.stroke(); }
  }

  // ---------- 背景 ----------
  function drawBG(ctx, S, C, alert, t) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, 1080, 1920);
    let g = ctx.createRadialGradient(540, 860, 60, 540, 880, 900);
    g.addColorStop(0, rgba(C, alert ? 0.15 : 0.11)); g.addColorStop(0.5, rgba(C, 0.035)); g.addColorStop(1, rgba(C, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    // 冷色暗角
    g = ctx.createRadialGradient(540, 900, 500, 540, 900, 1250);
    g.addColorStop(0, 'rgba(0,3,8,0)'); g.addColorStop(1, 'rgba(0,3,8,0.92)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
  }

  let GPAT = null, SCAN = null;
  function scanlines(ctx, S, t) {
    if (!SCAN) {
      const c = document.createElement('canvas'); c.width = 8; c.height = 4; const g = c.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(0, 0, 8, 2);
      SCAN = ctx.createPattern(c, 'repeat');
    }
    ctx.fillStyle = SCAN; ctx.fillRect(0, 0, 1080, 1920);
    // 慢速扫描亮带
    const y = ((t * 520) % 2300) - 200;
    const g = ctx.createLinearGradient(0, y - 120, 0, y + 20);
    g.addColorStop(0, 'rgba(120,230,255,0)'); g.addColorStop(1, 'rgba(120,230,255,0.06)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 120, 1080, 140);
  }

  // 琥珀警报：整屏边框、危险斜纹横幅、大字
  function drawAlert(ctx, t, S, k) {
    const { clamp, E } = S;
    const fl = 0.55 + 0.45 * S.pulse(t, 5);
    // 整屏琥珀染色 + 边缘
    ctx.fillStyle = `rgba(255,140,0,${0.07 * fl * k})`; ctx.fillRect(0, 0, 1080, 1920);
    const eg = ctx.createRadialGradient(540, 900, 520, 540, 900, 1200);
    eg.addColorStop(0, 'rgba(255,150,20,0)'); eg.addColorStop(1, `rgba(255,150,20,${0.35 * fl * k})`);
    ctx.fillStyle = eg; ctx.fillRect(0, 0, 1080, 1920);
    ctx.strokeStyle = rgba(AMBER, 0.9 * fl * k); ctx.lineWidth = 10; ctx.strokeRect(22, 22, 1036, 1876);
    // 横幅
    const by = 1030, bh = 140;
    const open = E.outExpo(clamp((t - 2.0) / 0.25));
    const w = 1080 * open;
    ctx.save();
    ctx.beginPath(); ctx.rect(540 - w / 2, by, w, bh); ctx.clip();
    ctx.fillStyle = 'rgba(10,6,0,0.88)'; ctx.fillRect(0, by, 1080, bh);
    // 斜纹带（上下）
    for (const yy of [by, by + bh - 22]) {
      ctx.fillStyle = rgba(AMBER, 1); ctx.fillRect(0, yy, 1080, 22);
      ctx.fillStyle = '#140a00'; ctx.beginPath();
      const off = (t * 120) % 44;
      for (let x = -44 + off; x < 1100; x += 44) { ctx.moveTo(x, yy + 22); ctx.lineTo(x + 22, yy); ctx.lineTo(x + 40, yy); ctx.lineTo(x + 18, yy + 22); }
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = S.F(76, 'NotoSansSC', 900); ctx.fillStyle = rgba(AMBER, fl > 0.75 ? 1 : 0.85);
    ctx.shadowColor = rgba(AMBER, 1); ctx.shadowBlur = 30 * fl;
    ctx.fillText('⚠ 警告 · TARGET LOCKED', 540, by + 98); ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // 切片错位故障：把一层按水平条带错开画回
  function glitchBlit(ctx, src, t, S, amt) {
    const seed = Math.floor(t * 40);
    let y = 0;
    while (y < 1920) {
      const h = 20 + Math.floor(S.hash2(seed, y) * 140);
      const r = S.hash2(seed + 3, y);
      const dx = r < 0.45 ? 0 : (S.hash2(seed + 9, y) - 0.5) * 2 * 90 * amt;
      ctx.drawImage(src, 0, y, 1080, h, dx, y, 1080, h);
      if (r > 0.85) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(src, 0, y, 1080, h, dx + 14 * amt, y, 1080, h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      y += h;
    }
  }

  // 整幅先画在 CPU 画布上（软件光栅化远快于 SwiftShader 的 GPU 画布），最后一次性贴回
  const CPU = {};
  function cpuCtx(key) {
    if (!CPU[key]) { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; CPU[key] = c.getContext('2d', { willReadFrequently: true }); }
    const g = CPU[key];
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetX = g.shadowOffsetY = 0; g.setLineDash([]);
    g.lineCap = 'butt'; g.lineJoin = 'miter'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px'; g.lineWidth = 1;
    return g;
  }

  let SM = null;
  function cpuSmall() {
    if (!SM) { const c = document.createElement('canvas'); c.width = 270; c.height = 480; SM = c.getContext('2d', { willReadFrequently: true }); }
    SM.setTransform(1, 0, 0, 1, 0, 0); SM.globalAlpha = 1; SM.globalCompositeOperation = 'source-over'; SM.clearRect(0, 0, 270, 480);
    return SM;
  }

  registerScene({
    n: 8, key: 'hud', zh: '赛博朋克 HUD', en: 'Cyberpunk HUD',
    bg: BG, accent: '#3ce4ff',
    init(S) { prep(S); },
    draw(out, t, S) {
      prep(S);
      const ctx = cpuCtx('main');
      const { clamp, seg, E } = S;
      // 状态：<1.92 青；1.92–2.0 故障；2.0–3.2 琥珀警报；3.2–3.3 故障回青
      const alert = t >= 2.0 && t < 3.25;
      const glitch = (t >= 1.9 && t < 2.04) ? 1 - Math.abs(t - 1.97) / 0.08 : (t >= 3.2 && t < 3.32) ? 1 - Math.abs(t - 3.26) / 0.07 : (t >= 1.3 && t < 1.34 ? 0.35 : 0);
      const C = alert ? AMBER : CYAN;

      // 开机：t<0.1 时 CRT 式中线展开
      const boot = clamp((t + 0.4) / 0.3);
      const g = glitch > 0 ? cpuCtx('glitch') : ctx;
      const target = glitch > 0 ? g.canvas : null;

      drawBG(g, S, C, alert, t);
      if (boot < 1) {
        // 开机前：中心一道亮线向两侧展开，再纵向打开
        const h = E.inOut3(clamp((t + 0.32) / 0.22)) * 1920;
        g.save(); g.beginPath(); g.rect(0, 960 - Math.max(3, h) / 2, 1080, Math.max(3, h)); g.clip();
        drawHUD(g, t, S, C, alert);
        g.restore();
        const lw = E.out3(boot) * 1080;
        g.fillStyle = rgba(WHITE, 0.9 * (1 - clamp((t + 0.32) / 0.22)));
        g.fillRect(540 - lw / 2, 958, lw, 4);
        const hg = g.createRadialGradient(540, 960, 0, 540, 960, 400);
        hg.addColorStop(0, rgba(CYAN, 0.35 * (1 - boot * 0.6))); hg.addColorStop(1, rgba(CYAN, 0));
        g.fillStyle = hg; g.fillRect(0, 560, 1080, 800);
      } else {
        drawHUD(g, t, S, C, alert);
      }
      if (alert) drawAlert(g, t, S, 1);
      // 辉光：整幅 1/4 降采样模糊后加色叠回
      {
        const B = cpuSmall();
        B.filter = 'blur(4px)'; B.drawImage(g.canvas, 0, 0, 270, 480); B.filter = 'none';
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(B.canvas, 0, 0, 1080, 1920); g.restore();
      }
      scanlines(g, S, t);

      if (target) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, 1080, 1920);
        glitchBlit(ctx, target, t, S, glitch);
        // 色块噪声
        for (let i = 0; i < 8; i++) {
          const r = S.hash2(Math.floor(t * 40), i);
          if (r < 0.4) continue;
          ctx.fillStyle = i % 2 ? rgba(AMBER, 0.6) : rgba(CYAN, 0.6);
          ctx.fillRect(S.hash2(i, 5 + Math.floor(t * 40)) * 1000, S.hash2(i, 9 + Math.floor(t * 40)) * 1900, 40 + r * 300, 6 + r * 18);
        }
      }
      // 颗粒
      if (!GPAT) GPAT = ctx.createPattern(S.grainTexture(), 'repeat');
      ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
      ctx.translate(-((S.hash(Math.floor(t * 30)) * 512) | 0), -((S.hash(Math.floor(t * 30) + 2) * 512) | 0));
      ctx.fillStyle = GPAT; ctx.fillRect(0, 0, 1080 + 512, 1920 + 512); ctx.restore();
      out.drawImage(ctx.canvas, 0, 0);
    },
  });
})();
