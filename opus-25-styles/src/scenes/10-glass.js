// 10 弥散玻璃拟态 —— 近黑冷底上的蓝紫青极光，透视微倾的大块磨砂玻璃面板（音乐播放器 / 天气 / 指标），
// 一颗厚玻璃透镜滑过界面，放大并折弯其下的内容，边缘带彩虹色散。
(function () {
  const W = 1080, H = 1920;
  const LW = 270, LH = 480;           // 低分辨率层（极光 / 模糊）

  // ---------- 工具 ----------
  // 透视面板：绕竖轴偏航 yaw，绕横轴俯仰 pitch（仅用于轻微纵向错切）
  function makeProj(p) {
    const D = 1700, cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
    return (u, v) => { const z = u * sy, s = D / (D + z); return [p.cx + u * cy * s + v * p.skew * s, p.cy + v * s]; };
  }
  function outline(p, proj, r = 44) {
    const w = p.w / 2, h = p.h / 2, pts = [];
    const cs = [[w - r, -h + r, -Math.PI / 2], [w - r, h - r, 0], [-w + r, h - r, Math.PI / 2], [-w + r, -h + r, Math.PI]];
    for (const [x, y, a0] of cs) for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; pts.push(proj(x + Math.cos(a) * r, y + Math.sin(a) * r)); }
    return pts;
  }
  const path = (g, pts) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); };
  // 把面板内容层按透视切成竖条画出来
  function drawStrips(g, src, p, proj, alpha = 1) {
    const step = 6, w = p.w, h = p.h;
    g.save(); g.globalAlpha = alpha;
    for (let x = 0; x < w; x += step) {
      const u0 = x - w / 2, u1 = Math.min(w, x + step) - w / 2;
      const a = proj(u0, -h / 2), b = proj(u1, -h / 2), c = proj(u0, h / 2);
      // 竖条两端对齐整数像素：既不重叠（半透明不会叠深），也没有缝
      const x0 = Math.round(a[0]), x1 = Math.round(b[0]);
      if (x1 > x0) g.drawImage(src, x, 0, Math.min(step, w - x), h, x0, a[1], x1 - x0, c[1] - a[1]);
    }
    g.restore();
  }

  // ---------- 图标 ----------
  function playIcon(g, x, y, s, playing) {
    g.save(); g.translate(x, y); g.fillStyle = '#fff';
    if (playing) { S.rr(g, -s * 0.42, -s * 0.5, s * 0.3, s, s * 0.08); g.fill(); S.rr(g, s * 0.12, -s * 0.5, s * 0.3, s, s * 0.08); g.fill(); }
    else { g.beginPath(); g.moveTo(-s * 0.35, -s * 0.55); g.lineTo(s * 0.55, 0); g.lineTo(-s * 0.35, s * 0.55); g.closePath(); g.fill(); }
    g.restore();
  }
  function skipIcon(g, x, y, s, dir) {
    g.save(); g.translate(x, y); g.scale(dir, 1); g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const o of [0, s * 0.5]) { g.beginPath(); g.moveTo(-s * 0.5 + o, -s * 0.4); g.lineTo(o, 0); g.lineTo(-s * 0.5 + o, s * 0.4); g.closePath(); g.fill(); }
    g.fillRect(s * 0.5, -s * 0.4, s * 0.1, s * 0.8);
    g.restore();
  }

  // ---------- 面板内容 ----------
  function contentMusic(g, w, h, t) {
    // 专辑封面：小块极光
    const ax = 44, ay = 44, as = 236;
    g.save(); S.rr(g, ax, ay, as, as, 34); g.clip();
    const cg = g.createLinearGradient(ax, ay, ax + as, ay + as); cg.addColorStop(0, '#0b1a5c'); cg.addColorStop(1, '#2a0d52'); g.fillStyle = cg; g.fillRect(ax, ay, as, as);
    g.globalCompositeOperation = 'lighter';
    const blobs = [['#2f7bff', 0.3, 0.35, 0.7], ['#8d4dff', 0.75, 0.3, 0.6], ['#22d3ee', 0.5, 0.85, 0.55]];
    for (const [c, bx, by, r] of blobs) {
      const x = ax + as * (bx + 0.06 * Math.sin(t * 1.3 + bx * 9)), y = ay + as * (by + 0.06 * Math.cos(t * 1.1 + by * 7));
      const rg = g.createRadialGradient(x, y, 0, x, y, as * r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(ax, ay, as, as);
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3;
    g.beginPath(); g.arc(ax + as * 0.5, ay + as * 0.52, as * 0.26, 0, S.TAU); g.stroke();
    g.beginPath(); g.arc(ax + as * 0.5, ay + as * 0.52, as * 0.12 + 6 * S.pulse(t, 6), 0, S.TAU); g.stroke();
    g.restore();
    // 曲目信息
    g.fillStyle = '#fff'; g.font = S.F(54, 'InterXB', 800); g.fillText('Aurora Drift', 316, 120);
    g.fillStyle = 'rgba(255,255,255,0.62)'; g.font = S.F(32, 'Inter'); g.fillText('Opus · 极光电台', 318, 172);
    // 小标签
    g.fillStyle = 'rgba(255,255,255,0.14)'; S.rr(g, 318, 206, 150, 46, 23); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = S.F(24, 'InterXB', 800); g.fillText('LOSSLESS', 338, 238);
    // 波形（随节拍跳动）
    const N = 46, x0 = 44, x1 = w - 44, wy = 350;
    for (let i = 0; i < N; i++) {
      const x = x0 + (x1 - x0) * (i + 0.5) / N;
      const base = 0.25 + 0.75 * Math.abs(S.noise2(i * 0.35, 3.1));
      const hb = (14 + 70 * base * (0.55 + 0.45 * S.pulse(t + i * 0.006, 7))) * (0.85 + 0.15 * Math.sin(t * 9 + i));
      const played = (i + 0.5) / N < prog(t);
      g.fillStyle = played ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.32)';
      S.rr(g, x - 4, wy - hb / 2, 8, hb, 4); g.fill();
    }
    // 进度条
    const py = 446, pp = prog(t);
    g.fillStyle = 'rgba(255,255,255,0.22)'; S.rr(g, x0, py - 4, x1 - x0, 8, 4); g.fill();
    const pg = g.createLinearGradient(x0, 0, x1, 0); pg.addColorStop(0, '#7fd6ff'); pg.addColorStop(1, '#c6a8ff');
    g.fillStyle = pg; S.rr(g, x0, py - 4, (x1 - x0) * pp, 8, 4); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + (x1 - x0) * pp, py, 13, 0, S.TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = S.F(26, 'Inter');
    const sec = Math.floor(84 + pp * 132);
    g.fillText(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, x0, py + 46);
    g.textAlign = 'right'; g.fillText('3:36', x1, py + 46); g.textAlign = 'left';
    // 控制
    const cy = 552, pb = 1 + 0.06 * S.pulse(t, 6);
    skipIcon(g, w / 2 - 190, cy, 46, -1); skipIcon(g, w / 2 + 190, cy, 46, 1);
    g.save(); g.translate(w / 2, cy); g.scale(pb, pb);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(0, 0, 56, 0, S.TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.stroke();
    playIcon(g, 0, 0, 44, true); g.restore();
  }
  const prog = t => 0.28 + 0.16 * S.clamp((t + 0.4) / 4.8);

  function contentTitle(g, w, h, t) {
    const a = S.E.out3(S.seg(t, -0.1, 0.6));
    const ng = g.createLinearGradient(0, 40, 0, 270); ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, 'rgba(220,232,255,0.55)');
    g.fillStyle = ng; g.font = S.F(240, 'InterXB', 800); g.letterSpacing = '-14px'; g.fillText('10', 30, 238); g.letterSpacing = '0px';
    g.fillStyle = '#fff'; g.font = S.F(92, 'NotoSansSCM', 500);
    const cs = S.chars(g, '弥散玻璃拟态', 326, 'left', 2);
    cs.forEach((c, i) => { const k = S.E.out3(S.seg(t, 0.0 + i * 0.05, 0.45 + i * 0.05)); g.globalAlpha = k; g.fillText(c.ch, c.x, 150 + (1 - k) * 30); });
    g.globalAlpha = a; g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = S.F(31, 'Inter'); g.letterSpacing = '5px';
    g.fillText('AURORA GLASSMORPHISM', 330, 216); g.letterSpacing = '0px'; g.globalAlpha = 1;
  }

  function contentWeather(g, w, h, t) {
    g.fillStyle = '#fff'; g.font = S.F(116, 'InterXB', 800); g.letterSpacing = '-4px'; g.fillText('-12°', 30, 136); g.letterSpacing = '0px';
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = S.F(30, 'NotoSansSCM', 500); g.fillText('极光可见 · 特罗姆瑟', 34, 192);
    // 月亮 + 星
    const mx = w - 74, my = 70;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(mx, my, 30, 0, S.TAU); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(mx + 14, my - 10, 26, 0, S.TAU); g.fill(); g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 3; i++) { const s = 4 + 3 * S.pulse(t + i * 0.17, 5); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(mx - 50 + i * 22, my + 44 - i * 10, s * 0.6, 0, S.TAU); g.fill(); }
  }

  function contentStats(g, w, h, t) {
    const cx = 120, cy = h / 2, r = 72, v = 0.62 + 0.25 * S.E.out3(S.seg(t, 0.3, 2.0)) + 0.02 * Math.floor(S.clamp(t - 2) * 2);
    g.lineCap = 'round'; g.lineWidth = 18;
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.arc(cx, cy, r, 0, S.TAU); g.stroke();
    const rg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); rg.addColorStop(0, '#7fd6ff'); rg.addColorStop(1, '#b48cff');
    g.strokeStyle = rg; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + S.TAU * v); g.stroke();
    g.fillStyle = '#fff'; g.font = S.F(46, 'InterXB', 800); g.textAlign = 'center'; g.fillText(Math.round(v * 100) + '', cx, cy + 16); g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,0.65)'; g.font = S.F(26, 'Inter'); g.fillText('KP INDEX', 230, cy - 26);
    g.fillStyle = '#fff'; g.font = S.F(52, 'InterXB', 800); g.fillText('6.3', 230, cy + 34);
    // 迷你折线
    g.strokeStyle = 'rgba(160,220,255,0.9)'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i <= 12; i++) { const x = 320 + i * 7.5, y = cy + 20 - 22 * (0.5 + 0.5 * Math.sin(i * 0.9 + t * 3)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }

  function contentToast(g, w, h, t) {
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(46, h / 2, 26, 0, S.TAU); g.fill();
    g.fillStyle = '#fff'; g.font = S.F(30, 'InterXB', 800); g.textAlign = 'center'; g.fillText('♪', 46, h / 2 + 11); g.textAlign = 'left';
    g.font = S.F(28, 'InterXB', 800); g.fillText('Now Playing', 90, h / 2 + 10);
  }

  // 面板定义：中心、尺寸、偏航、视差深度、入场时间
  const PANES = [
    { key: 'title', w: 900, h: 280, cx: 520, cy: 340, yaw: 0.10, skew: 0.0, depth: 0.6, t0: -0.35, draw: contentTitle, r: 54 },
    { key: 'music', w: 820, h: 620, cx: 520, cy: 930, yaw: -0.13, skew: 0.0, depth: 1.0, t0: -0.15, draw: contentMusic, r: 56 },
    { key: 'stats', w: 450, h: 220, cx: 300, cy: 1390, yaw: 0.16, skew: 0.0, depth: 1.25, t0: 0.15, draw: contentStats, r: 46 },
    { key: 'weather', w: 380, h: 220, cx: 760, cy: 1385, yaw: -0.18, skew: 0.0, depth: 0.85, t0: 0.3, draw: contentWeather, r: 46 },
  ];

  function aurora(t) {
    const L = S.layer('s10-aur', LW, LH), g = L.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#04060c'; g.fillRect(0, 0, LW, LH);
    g.globalCompositeOperation = 'lighter';
    const beat = 0.85 + 0.15 * S.pulse(t, 3);
    const blobs = [
      ['rgba(40,96,255,0.85)', 70, 150, 190, 0.7], ['rgba(36,110,255,0.7)', 200, 330, 170, 1.1], ['rgba(130,70,255,0.75)', 210, 90, 150, 0.9],
      ['rgba(34,200,238,0.55)', 40, 360, 140, 1.3], ['rgba(120,60,255,0.6)', 120, 440, 150, 0.6], ['rgba(30,190,255,0.45)', 150, 230, 90, 1.7],
    ];
    for (const [c, x, y, r, sp] of blobs) {
      const xx = x + 26 * Math.sin(t * 0.5 * sp + x), yy = y + 18 * Math.cos(t * 0.4 * sp + y);
      const rg = g.createRadialGradient(xx, yy, 0, xx, yy, r);
      rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = beat; g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
    }
    // 极光帘幕
    g.globalAlpha = 0.5;
    for (let k = 0; k < 3; k++) {
      const col = ['rgba(60,140,255,', 'rgba(60,230,230,', 'rgba(150,100,255,'][k];
      for (let x = -10; x < LW + 10; x += 3) {
        const y0 = 40 + k * 60 + 30 * Math.sin(x * 0.03 + t * 0.6 + k * 2) + 14 * S.noise2(x * 0.05, t * 0.3 + k);
        const len = 70 + 40 * (0.5 + 0.5 * Math.sin(x * 0.05 + k + t));
        const lg = g.createLinearGradient(0, y0, 0, y0 + len); lg.addColorStop(0, col + '0)'); lg.addColorStop(0.7, col + '0.35)'); lg.addColorStop(1, col + '0)');
        g.fillStyle = lg; g.fillRect(x, y0, 3, len);
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    return L;
  }

  registerScene({
    n: 10, key: 'glass', zh: '弥散玻璃拟态', en: 'Aurora Glassmorphism',
    bg: '#070a16', accent: '#4f8bff',
    draw(ctx, t, S) {
      const { E, seg, clamp, lerp } = S;
      const SL = S.layer('s10-scene', W, H), g = SL.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      g.imageSmoothingQuality = 'low';
      // 1) 极光底
      g.drawImage(aurora(t), 0, 0, W, H);
      // 2) 清晰的背景元素（给磨砂玻璃去模糊）：星点、光球、轨道环、斜线
      const cam = (t - 2) * 10;
      for (let i = 0; i < 90; i++) {
        const x = S.hash(i * 3.3) * W, y = ((S.hash(i * 7.1) * H) + cam * (0.3 + S.hash(i) * 0.5)) % H, r = 0.8 + S.hash(i * 1.7) * 2.2;
        g.fillStyle = `rgba(220,235,255,${0.25 + 0.6 * S.hash(i * 5.5) * (0.6 + 0.4 * Math.sin(t * 3 + i))})`; g.beginPath(); g.arc(x, y, r, 0, S.TAU); g.fill();
      }
      // 大光球（被音乐卡片半遮）
      {
        const ox = 760 - cam * 1.4, oy = 780 + cam * 0.6, R = 260;
        const og = g.createRadialGradient(ox - 80, oy - 90, 20, ox, oy, R);
        og.addColorStop(0, '#d9f3ff'); og.addColorStop(0.35, '#59a8ff'); og.addColorStop(0.8, '#5a3df0'); og.addColorStop(1, '#2b1a7a');
        g.fillStyle = og; g.beginPath(); g.arc(ox, oy, R, 0, S.TAU); g.fill();
        g.strokeStyle = 'rgba(160,200,255,0.35)'; g.lineWidth = 2;
        g.save(); g.translate(ox, oy); g.rotate(-0.35); g.scale(1, 0.32);
        g.beginPath(); g.arc(0, 0, R * 1.55, 0, S.TAU); g.stroke(); g.beginPath(); g.arc(0, 0, R * 1.85, 0, S.TAU); g.stroke(); g.restore();
      }
      {
        const ox = 170 + cam * 0.8, oy = 1180 - cam * 0.5, R = 120;
        const og = g.createRadialGradient(ox - 30, oy - 40, 10, ox, oy, R);
        og.addColorStop(0, '#c9fff7'); og.addColorStop(0.5, '#22d3ee'); og.addColorStop(1, '#1b4fd1');
        g.fillStyle = og; g.beginPath(); g.arc(ox, oy, R, 0, S.TAU); g.fill();
      }
      g.strokeStyle = 'rgba(140,180,255,0.18)'; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) { const y = 140 + k * 340 + cam * 0.4; g.beginPath(); g.moveTo(-50, y); g.lineTo(W + 50, y - 260); g.stroke(); }

      // 面板几何（视差 + 入场）
      const panes = PANES.map(p => {
        const e = E.out3(seg(t, p.t0, p.t0 + 0.7));
        const drift = (t - 2) * 6 * p.depth;
        const q = { ...p, cx: p.cx - drift * 0.8 + (1 - e) * 60 * (p.cx > 540 ? 1 : -1), cy: p.cy + drift * 0.5 + (1 - e) * 80, yaw: p.yaw + Math.sin(t * 0.7 + p.depth * 3) * 0.025 };
        q.e = e; q.blur = 1 - E.out2(seg(t, p.t0, p.t0 + 0.85)); q.proj = makeProj(q); q.out = outline(q, q.proj, p.r);
        return q;
      });
      // 通知小胶囊：0.5 进入，2.9–3.4 失焦退出
      const toastIn = E.outBack(seg(t, 0.5, 0.95), 1.4), toastOut = E.in2(seg(t, 2.9, 3.4));
      if (t > 0.45 && toastOut < 1) {
        const q = { key: 'toast', w: 300, h: 70, cx: 730 + toastOut * 60, cy: 556 - (1 - toastIn) * 50 - toastOut * 30, yaw: 0, skew: 0, depth: 1, draw: contentToast, r: 38 };
        q.e = toastIn * (1 - toastOut); q.blur = toastOut * 1.0 + (1 - clamp(toastIn)) * 0.6; q.scale = 1 + toastOut * 0.25;
        q.proj = (u, v) => [q.cx + u * q.scale, q.cy + v * q.scale]; q.out = outline(q, q.proj, 38);
        panes.push(q);
      }

      // 3) 面板投影（低分辨率模糊后叠暗）
      {
        const sh = S.layer('s10-sh', LW, LH), sg = sh.getContext('2d');
        sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, LW, LH); sg.filter = 'blur(6px)'; sg.fillStyle = '#000';
        sg.scale(LW / W, LH / H);
        for (const q of panes) { sg.globalAlpha = 0.65 * q.e; path(sg, q.out.map(([x, y]) => [x + 10, y + 34])); sg.fill(); }
        sg.setTransform(1, 0, 0, 1, 0, 0); sg.filter = 'none'; sg.globalAlpha = 1;
        g.drawImage(sh, 0, 0, W, H);
      }
      // 4) 模糊版本的背景（磨砂玻璃用）
      const BL = S.layer('s10-blur', LW, LH), bg2 = BL.getContext('2d');
      const B0 = S.layer('s10-blur0', LW, LH), b0 = B0.getContext('2d');
      b0.setTransform(1, 0, 0, 1, 0, 0); b0.imageSmoothingQuality = 'low'; b0.drawImage(SL, 0, 0, LW, LH);
      bg2.setTransform(1, 0, 0, 1, 0, 0); bg2.clearRect(0, 0, LW, LH); bg2.filter = 'blur(7px)'; bg2.drawImage(B0, 0, 0); bg2.filter = 'none';

      // 5) 画面板
      for (const q of panes) {
        if (q.e <= 0.001) continue;
        g.save(); g.globalAlpha = clamp(q.e * 1.2);
        path(g, q.out); g.save(); g.clip();
        g.drawImage(BL, 0, 0, W, H);
        // 白色薄雾 + 自上而下的亮度
        const bb = q.out.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
        const tg = g.createLinearGradient(bb[0], bb[1], bb[2] * 0.3 + bb[0] * 0.7, bb[3]);
        tg.addColorStop(0, 'rgba(255,255,255,0.20)'); tg.addColorStop(0.5, 'rgba(255,255,255,0.08)'); tg.addColorStop(1, 'rgba(200,220,255,0.05)');
        g.fillStyle = tg; g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
        // 顶部内高光
        const ig = g.createLinearGradient(0, bb[1], 0, bb[1] + 70); ig.addColorStop(0, 'rgba(255,255,255,0.22)'); ig.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = ig; g.fillRect(bb[0], bb[1], bb[2] - bb[0], 70);
        g.restore();
        // 内容
        const C = S.layer('s10-c-' + q.key, q.w, q.h), cg = C.getContext('2d');
        cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, q.w, q.h); cg.textBaseline = 'alphabetic'; cg.textAlign = 'left'; cg.globalAlpha = 1; cg.globalCompositeOperation = 'source-over';
        q.draw(cg, q.w, q.h, t);
        if (q.blur > 0.02) {
          // 失焦 ↔ 清晰：缩小再放大的近似模糊，与清晰版交叉
          const k = Math.max(2, Math.round(2 + q.blur * 14));
          const sw = Math.ceil(q.w / k), shh = Math.ceil(q.h / k);
          const sm = S.layer('s10-sm', sw, shh), smg = sm.getContext('2d');
          smg.setTransform(1, 0, 0, 1, 0, 0); smg.clearRect(0, 0, sw, shh); smg.drawImage(C, 0, 0, sw, shh);
          cg.globalCompositeOperation = 'copy'; cg.globalAlpha = 1;
          const tmp = S.layer('s10-tmp', q.w, q.h), tg2 = tmp.getContext('2d'); tg2.setTransform(1, 0, 0, 1, 0, 0); tg2.clearRect(0, 0, q.w, q.h);
          tg2.globalAlpha = 1 - clamp(q.blur * 1.6); tg2.drawImage(C, 0, 0); tg2.globalAlpha = clamp(q.blur * 1.6); tg2.drawImage(sm, 0, 0, q.w, q.h); tg2.globalAlpha = 1;
          cg.drawImage(tmp, 0, 0); cg.globalCompositeOperation = 'source-over';
        }
        drawStrips(g, C, q, q.proj, 1);
        // 发丝亮边
        path(g, q.out);
        const eg = g.createLinearGradient(bb[0], bb[1], bb[2], bb[3]);
        eg.addColorStop(0, 'rgba(255,255,255,0.85)'); eg.addColorStop(0.45, 'rgba(255,255,255,0.18)'); eg.addColorStop(0.8, 'rgba(170,200,255,0.12)'); eg.addColorStop(1, 'rgba(190,170,255,0.5)');
        g.strokeStyle = eg; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();
        g.restore();
      }

      // 6) 贴到舞台
      ctx.drawImage(SL, 0, 0);

      // 7) 厚玻璃透镜：放大 + 桶形弯曲 + 色散
      {
        const k1 = E.inOut3(seg(t, 0.3, 1.5)), k2 = E.inOut3(seg(t, 1.9, 3.1));
        const lx = lerp(lerp(1200, 640, k1), 360, k2), ly = lerp(lerp(700, 720, k1), 905, k2) + Math.sin(t * 1.6) * 8;
        const R = 138, rin = E.out3(seg(t, 0.2, 0.8));
        if (rin > 0) {
          const RR = R * (0.85 + 0.15 * rin);
          // 投影
          const shg = ctx.createRadialGradient(lx + 20, ly + 40, RR * 0.6, lx + 20, ly + 40, RR * 1.25);
          shg.addColorStop(0, 'rgba(0,0,10,0.45)'); shg.addColorStop(1, 'rgba(0,0,10,0)');
          ctx.fillStyle = shg; ctx.beginPath(); ctx.arc(lx + 20, ly + 40, RR * 1.25, 0, S.TAU); ctx.fill();
          // 取透镜下方区域，按 RGB 拆通道，以不同放大倍率分环绘制
          const SZ = 340, src = S.layer('s10-lsrc', SZ, SZ), sg = src.getContext('2d');
          sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'copy'; sg.drawImage(SL, lx - SZ / 2, ly - SZ / 2, SZ, SZ, 0, 0, SZ, SZ); sg.globalCompositeOperation = 'source-over';
          const out = S.layer('s10-lout', SZ, SZ), og2 = out.getContext('2d');
          og2.setTransform(1, 0, 0, 1, 0, 0); og2.globalCompositeOperation = 'source-over'; og2.fillStyle = '#000'; og2.fillRect(0, 0, SZ, SZ);
          const ch = S.layer('s10-lch', SZ, SZ), chg = ch.getContext('2d');
          const chans = [['#ff0000', 1.0], ['#00ff00', 1.035], ['#0000ff', 1.075]];
          for (const [col, cm] of chans) {
            chg.setTransform(1, 0, 0, 1, 0, 0); chg.globalCompositeOperation = 'source-over'; chg.fillStyle = '#000'; chg.fillRect(0, 0, SZ, SZ);
            const N = 9;
            for (let i = 0; i < N; i++) {
              const f = i / N, rr = RR * (1 - f), m = lerp(1.0, 1.75, Math.pow(f + 1 / N, 0.6)) * (1 + (cm - 1) * (1 - f));
              chg.save(); chg.beginPath(); chg.arc(SZ / 2, SZ / 2, rr, 0, S.TAU); chg.clip();
              chg.translate(SZ / 2, SZ / 2); chg.scale(m, m); chg.drawImage(src, -SZ / 2, -SZ / 2); chg.restore();
            }
            chg.globalCompositeOperation = 'multiply'; chg.fillStyle = col; chg.fillRect(0, 0, SZ, SZ);
            og2.globalCompositeOperation = 'lighter'; og2.drawImage(ch, 0, 0);
          }
          og2.globalCompositeOperation = 'source-over';
          ctx.save(); ctx.globalAlpha = rin; ctx.beginPath(); ctx.arc(lx, ly, RR, 0, S.TAU); ctx.clip();
          ctx.drawImage(out, lx - SZ / 2, ly - SZ / 2);
          // 玻璃体积感：边缘暗环 + 内部提亮
          const vg = ctx.createRadialGradient(lx, ly, RR * 0.55, lx, ly, RR);
          vg.addColorStop(0, 'rgba(255,255,255,0.04)'); vg.addColorStop(0.8, 'rgba(10,20,60,0.0)'); vg.addColorStop(0.93, 'rgba(10,20,60,0.35)'); vg.addColorStop(1, 'rgba(200,230,255,0.5)');
          ctx.fillStyle = vg; ctx.fillRect(lx - RR, ly - RR, RR * 2, RR * 2);
          // 高光
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath(); ctx.ellipse(lx - RR * 0.38, ly - RR * 0.48, RR * 0.32, RR * 0.12, -0.6, 0, S.TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.beginPath(); ctx.ellipse(lx + RR * 0.45, ly + RR * 0.55, RR * 0.14, RR * 0.05, -0.6, 0, S.TAU); ctx.fill();
          ctx.restore();
          ctx.save(); ctx.globalAlpha = rin;
          const rg2 = ctx.createLinearGradient(lx - RR, ly - RR, lx + RR, ly + RR);
          rg2.addColorStop(0, 'rgba(255,255,255,0.95)'); rg2.addColorStop(0.5, 'rgba(160,200,255,0.25)'); rg2.addColorStop(1, 'rgba(220,180,255,0.8)');
          ctx.strokeStyle = rg2; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(lx, ly, RR, 0, S.TAU); ctx.stroke();
          ctx.restore();
        }
      }
    },
  });
})();
