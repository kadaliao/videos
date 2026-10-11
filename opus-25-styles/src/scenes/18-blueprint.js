// 18 蓝图工程图 · Blueprint
// 普鲁士蓝晒图纸：细/粗网格、图框分区、点划中心线、构造圆、剖面线、带箭头的尺寸标注、角落标题栏 No.18。
// 主体：一台火箭发动机（万向节 / 喷注器 / 燃烧室 / 喉部 / 喷管 / 涡轮泵）逐线绘出，强拍 2.0 沿轴线爆炸分解，引线标注逐个弹出。
(function () {
  const PAPER = '#0f3c86';
  const INK = 'rgba(236,246,255,0.95)', INK2 = 'rgba(200,228,255,0.6)', INK3 = 'rgba(190,220,255,0.28)';
  const X = 410;                // 发动机轴线

  // 爆炸位移（组装位 → 分解位）
  const OFF = { A: [0, -104], B: [0, -58], C: [0, 0], D: [0, 34], E: [0, 84], F: [96, 0] };

  let ST = null, HATCH = null, PAPERTEX = null, GPAT = null;

  function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }

  function prep(S) {
    if (ST) return;
    ST = [];
    const add = (part, pts, t0, dur, opt = {}) => ST.push({ part, pts, t0, dur, len: polyLen(pts), w: opt.w || 2.6, col: opt.col || INK, dash: opt.dash || null });
    const prof = (y0, y1, rf, n = 30) => { const a = []; for (let i = 0; i <= n; i++) { const u = i / n; a.push([y0 + (y1 - y0) * u, rf(u)]); } return a; };
    const sideL = pr => pr.map(([y, r]) => [X - r, y]);
    const sideR = pr => pr.map(([y, r]) => [X + r, y]);
    HATCH = [];   // 剖面区域（右半）：{part, poly}
    const part = (key, pr, wall, t0) => {
      const L = sideL(pr), R = sideR(pr);
      const top = pr[0], bot = pr[pr.length - 1];
      add(key, [[X - top[1], top[0]], [X + top[1], top[0]]], t0, 0.18);
      add(key, L, t0 + 0.08, 0.42);
      add(key, R, t0 + 0.08, 0.42);
      add(key, [[X - bot[1], bot[0]], [X + bot[1], bot[0]]], t0 + 0.42, 0.18);
      // 右半剖面内壁线 + 左半隐藏线（虚线）
      const inR = pr.map(([y, r]) => [X + Math.max(0, r - wall), y]);
      const inL = pr.map(([y, r]) => [X - Math.max(0, r - wall), y]);
      add(key, inR, t0 + 0.2, 0.4, { w: 1.6 });
      add(key, inL, t0 + 0.25, 0.4, { w: 1.4, col: INK2, dash: [10, 7] });
      HATCH.push({ part: key, poly: [...R, ...inR.slice().reverse()], t0: t0 + 0.5 });
    };
    // A 万向节
    part('A', prof(612, 662, u => 30 + 34 * u, 6), 14, 0.05);
    // B 喷注器穹顶
    part('B', prof(662, 722, u => 64 + 88 * Math.sin(u * Math.PI / 2)), 18, 0.2);
    // C 燃烧室
    part('C', prof(722, 880, u => 152, 8), 24, 0.38);
    // D 喉部收敛段
    part('D', prof(880, 952, u => 152 - 74 * (0.5 - 0.5 * Math.cos(Math.PI * u))), 20, 0.6);
    // E 喷管钟形段
    part('E', prof(952, 1300, u => 78 + 142 * (1 - Math.pow(1 - u, 1.9)), 40), 10, 0.8);

    // 万向节球铰
    const ball = []; for (let k = 0; k <= 40; k++) { const a = Math.PI + k / 40 * Math.PI; ball.push([X + Math.cos(a) * 26, 612 + Math.sin(a) * 26]); }
    add('A', ball, 0.0, 0.25);
    // 燃烧室法兰 + 冷却通道线
    for (const y of [726, 876]) add('C', [[X - 166, y], [X + 166, y]], 0.55, 0.2, { w: 2 });
    for (const y of [726, 876]) { add('C', [[X - 166, y - 6], [X - 166, y + 6]], 0.6, 0.06); add('C', [[X + 166, y - 6], [X + 166, y + 6]], 0.6, 0.06); }
    for (let k = 1; k < 6; k++) { const x = X - 152 + k * 22; add('C', [[x, 732], [x, 870]], 0.7 + k * 0.03, 0.2, { w: 1.1, col: INK2 }); }
    // 喷管加强环
    for (const u of [0.22, 0.5, 0.78]) {
      const y = 952 + 348 * u, r = 78 + 142 * (1 - Math.pow(1 - u, 1.9));
      add('E', [[X - r - 8, y], [X + r + 8, y]], 1.15 + u * 0.3, 0.2, { w: 2 });
    }
    // 喷管出口唇边
    add('E', [[X - 232, 1300], [X + 232, 1300]], 1.3, 0.15, { w: 3 });

    // F 涡轮泵（圆角壳体 + 进口管 + 连到燃烧室的管 + 排气管）
    const rr = (x, y, w, h, r) => {
      const p = [];
      const arc = (cx, cy, a0) => { for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
      arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI); p.push(p[0].slice());
      return p;
    };
    add('F', rr(X + 196, 694, 104, 150, 22), 1.0, 0.5);
    add('F', [[X + 196, 744], [X + 300, 744]], 1.25, 0.12, { w: 1.4 });
    add('F', [[X + 196, 796], [X + 300, 796]], 1.28, 0.12, { w: 1.4 });
    const shaft = []; for (let k = 0; k <= 36; k++) { const a = k / 36 * Math.PI * 2; shaft.push([X + 248 + Math.cos(a) * 26, 770 + Math.sin(a) * 26]); }
    add('F', shaft, 1.3, 0.25, { w: 1.6 });
    add('F', [[X + 166, 760], [X + 196, 760]], 1.35, 0.1);
    add('F', [[X + 166, 780], [X + 196, 780]], 1.35, 0.1);
    add('F', [[X + 214, 694], [X + 214, 632]], 1.4, 0.15);
    add('F', [[X + 244, 694], [X + 244, 632]], 1.42, 0.15);
    add('F', [[X + 204, 632], [X + 254, 632]], 1.5, 0.08, { w: 3 });
    const exh = []; for (let k = 0; k <= 30; k++) { const u = k / 30; exh.push([X + 262 - 40 * u * u, 844 + 150 * u]); }
    add('F', exh, 1.45, 0.3);
    add('F', exh.map(([x, y]) => [x + 22, y]), 1.48, 0.3);
  }

  // ---------- 局部绘制 ----------
  function drawPart(ctx, pts, L) {
    if (L <= 0) return null;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    let acc = 0, head = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= L) { const k = (L - acc) / d; head = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; ctx.lineTo(head[0], head[1]); break; }
      acc += d; ctx.lineTo(pts[i][0], pts[i][1]); head = pts[i];
    }
    ctx.stroke();
    return head;
  }

  function arrow(ctx, x, y, ang, s = 16) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.22) * s, y - Math.sin(ang - 0.22) * s);
    ctx.lineTo(x - Math.cos(ang + 0.22) * s, y - Math.sin(ang + 0.22) * s);
    ctx.closePath(); ctx.fill();
  }
  // 尺寸线（可按进度画出）
  function dimH(ctx, S, x0, x1, y, yRef, txt, k) {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= S.clamp(k * 3);
    ctx.strokeStyle = INK2; ctx.lineWidth = 1.3;
    // 延伸线
    ctx.beginPath(); ctx.moveTo(x0, yRef); ctx.lineTo(x0, y + (y > yRef ? 14 : -14)); ctx.moveTo(x1, yRef); ctx.lineTo(x1, y + (y > yRef ? 14 : -14)); ctx.stroke();
    const m = (x0 + x1) / 2, h = (x1 - x0) / 2 * S.E.out3(k);
    ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(m - h, y); ctx.lineTo(m + h, y); ctx.stroke();
    ctx.fillStyle = INK; arrow(ctx, m - h, y, Math.PI); arrow(ctx, m + h, y, 0);
    ctx.font = S.F(26, 'JetBrainsMono'); ctx.textAlign = 'center';
    const tw = ctx.measureText(txt).width + 16;
    ctx.fillStyle = PAPER; ctx.fillRect(m - tw / 2, y - 34, tw, 28);
    ctx.fillStyle = INK; ctx.fillText(txt, m, y - 12);
    ctx.textAlign = 'left'; ctx.restore();
  }
  function dimV(ctx, S, y0, y1, x, xRef, txt, k) {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= S.clamp(k * 3);
    ctx.strokeStyle = INK2; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(xRef, y0); ctx.lineTo(x - 14, y0); ctx.moveTo(xRef, y1); ctx.lineTo(x - 14, y1); ctx.stroke();
    const m = (y0 + y1) / 2, h = (y1 - y0) / 2 * S.E.out3(k);
    ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x, m - h); ctx.lineTo(x, m + h); ctx.stroke();
    ctx.fillStyle = INK; arrow(ctx, x, m - h, -Math.PI / 2); arrow(ctx, x, m + h, Math.PI / 2);
    ctx.save(); ctx.translate(x - 12, m); ctx.rotate(-Math.PI / 2);
    ctx.font = S.F(26, 'JetBrainsMono'); ctx.textAlign = 'center';
    const tw = ctx.measureText(txt).width + 16;
    ctx.fillStyle = PAPER; ctx.fillRect(-tw / 2, -24, tw, 30);
    ctx.fillStyle = INK; ctx.fillText(txt, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  // 纸张：底色 + 斑驳（低分辨率 fbm 放大）+ 网格
  function makePaper(S) {
    const c = document.createElement('canvas'); c.width = 270; c.height = 480; const g = c.getContext('2d', { willReadFrequently: true });
    const im = g.createImageData(270, 480);
    for (let y = 0; y < 480; y++) for (let x = 0; x < 270; x++) {
      const v = S.fbm(x * 0.018, y * 0.018, 1.3, 4) * 0.8 + S.fbm(x * 0.09, y * 0.09, 7.1, 2) * 0.25;
      const i = (y * 270 + x) * 4;
      im.data[i] = 14 + v * 22; im.data[i + 1] = 56 + v * 30; im.data[i + 2] = 132 + v * 40; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  }

  const CPU = {};
  function cpuCtx(key) {
    if (!CPU[key]) { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; CPU[key] = c.getContext('2d', { willReadFrequently: true }); }
    const g = CPU[key];
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetX = g.shadowOffsetY = 0; g.setLineDash([]);
    g.lineCap = 'butt'; g.lineJoin = 'miter'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px'; g.lineWidth = 1;
    return g;
  }

  function paper(ctx, S, t) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(PAPERTEX, 0, 0, 1080, 1920);
    // 网格
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(200,230,255,0.07)'; ctx.beginPath();
    for (let x = 0; x <= 1080; x += 20) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 1920); }
    for (let y = 0; y <= 1920; y += 20) { ctx.moveTo(0, y + 0.5); ctx.lineTo(1080, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,230,255,0.15)'; ctx.beginPath();
    for (let x = 0; x <= 1080; x += 100) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 1920); }
    for (let y = 0; y <= 1920; y += 100) { ctx.moveTo(0, y + 0.5); ctx.lineTo(1080, y + 0.5); }
    ctx.stroke();
    // 折痕
    const fg = ctx.createLinearGradient(530, 0, 552, 0);
    fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(0.5, 'rgba(255,255,255,0.05)'); fg.addColorStop(1, 'rgba(0,0,30,0.06)');
    ctx.fillStyle = fg; ctx.fillRect(530, 0, 22, 1920);
    // 暗角
    const vg = ctx.createRadialGradient(540, 900, 600, 540, 900, 1300);
    vg.addColorStop(0, 'rgba(4,16,48,0)'); vg.addColorStop(1, 'rgba(4,16,48,0.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 1080, 1920);
    // 图框 + 分区刻度
    ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.strokeRect(36, 36, 1008, 1848);
    ctx.lineWidth = 1; ctx.strokeRect(50, 50, 980, 1820);
    ctx.font = S.F(18, 'JetBrainsMono'); ctx.fillStyle = INK3; ctx.textAlign = 'center';
    for (let i = 0; i < 6; i++) { const x = 50 + (i + 0.5) * 980 / 6; ctx.fillText(String(i + 1), x, 47); ctx.fillText(String(i + 1), x, 1882); }
    for (let i = 0; i < 10; i++) { const y = 50 + (i + 0.5) * 182; ctx.fillText('ABCDEFGHJK'[i], 43, y + 6); ctx.fillText('ABCDEFGHJK'[i], 1037, y + 6); }
    ctx.textAlign = 'left';
    ctx.beginPath();
    for (let i = 1; i < 6; i++) { const x = 50 + i * 980 / 6; ctx.moveTo(x, 36); ctx.lineTo(x, 50); ctx.moveTo(x, 1870); ctx.lineTo(x, 1884); }
    for (let i = 1; i < 10; i++) { const y = 50 + i * 182; ctx.moveTo(36, y); ctx.lineTo(50, y); ctx.moveTo(1030, y); ctx.lineTo(1044, y); }
    ctx.strokeStyle = INK3; ctx.stroke();
  }

  function titleBlock(ctx, S, t) {
    const x = 650, y = 1386, w = 290, h = 154;
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(x, y + 54); ctx.lineTo(x + w, y + 54);
    ctx.moveTo(x, y + 104); ctx.lineTo(x + w, y + 104);
    ctx.moveTo(x + 110, y + 54); ctx.lineTo(x + 110, y + h);
    ctx.moveTo(x + 190, y + 104); ctx.lineTo(x + 190, y + h);
    ctx.stroke();
    const k = S.clamp((t - 0.15) / 0.6);
    const tp = (s, kk) => s.slice(0, Math.ceil(s.length * S.clamp(kk)));
    ctx.fillStyle = INK3; ctx.font = S.F(14, 'JetBrainsMono');
    ctx.fillText('TITLE 图名', x + 8, y + 16); ctx.fillText('DWG NO.', x + 8, y + 70); ctx.fillText('MATERIAL', x + 118, y + 70);
    ctx.fillText('SCALE', x + 8, y + 120); ctx.fillText('DRAWN', x + 118, y + 120); ctx.fillText('SHEET', x + 198, y + 120);
    ctx.fillStyle = INK;
    ctx.font = S.F(26, 'NotoSansSCM', 500); ctx.fillText(tp('火箭发动机 总装', k * 1.6), x + 10, y + 46);
    ctx.font = S.F(30, 'SpaceGrotesk', 700); ctx.fillText(tp('No.18', k * 1.6 - 0.2), x + 10, y + 98);
    ctx.font = S.F(18, 'JetBrainsMono'); ctx.fillText(tp('INCONEL 718', k * 1.6 - 0.3), x + 118, y + 96);
    ctx.font = S.F(24, 'JetBrainsMono'); ctx.fillText(tp('1:20', k * 1.6 - 0.4), x + 10, y + 144);
    ctx.font = S.F(30, 'Caveat', 700); ctx.fillText(tp('A.I.', k * 1.6 - 0.5), x + 118, y + 146);
    ctx.font = S.F(22, 'JetBrainsMono'); ctx.fillText(tp('18/25', k * 1.6 - 0.6), x + 198, y + 144);
  }

  function title(ctx, S, t) {
    const { clamp, E } = S;
    // 18：空心技术字 + 自己的尺寸标注
    const k = clamp((t + 0.1) / 0.5);
    ctx.save();
    ctx.font = S.F(250, 'SpaceGrotesk', 700); ctx.textBaseline = 'alphabetic';
    const w18 = ctx.measureText('18').width;
    ctx.beginPath(); ctx.rect(80, 180, w18 * E.out3(k) + 20, 300); ctx.clip();
    ctx.fillStyle = 'rgba(220,240,255,0.10)'; ctx.fillText('18', 84, 430);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeText('18', 84, 430);
    ctx.restore();
    dimH(ctx, S, 92, 84 + w18 - 6, 196, 240, String(Math.round(w18)), clamp((t - 0.25) / 0.4));
    // 中文 + 英文：逐字"描"出
    const zh = '蓝图工程图';
    ctx.font = S.F(96, 'NotoSansSCM', 500); ctx.fillStyle = INK;
    const cs = S.chars(ctx, zh, 430, 'left', 6);
    cs.forEach((c, i) => {
      const a = clamp((t - 0.05 - i * 0.07) / 0.14);
      if (a <= 0) return;
      ctx.globalAlpha = a; ctx.fillText(c.ch, c.x, 330 + (1 - a) * 8);
    });
    ctx.globalAlpha = 1;
    ctx.font = S.F(42, 'JetBrainsMono'); ctx.letterSpacing = '14px';
    const en = 'BLUEPRINT';
    ctx.fillText(en.slice(0, Math.ceil(en.length * clamp((t - 0.2) / 0.4))), 434, 404);
    ctx.letterSpacing = '0px';
    ctx.strokeStyle = INK2; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(432, 428); ctx.lineTo(432 + 506 * E.out3(clamp((t - 0.25) / 0.5)), 428); ctx.stroke();
    ctx.font = S.F(30, 'Caveat', 700); ctx.fillStyle = INK2;
    if (t > 0.5) ctx.fillText('rocket engine · general assembly', 434, 462);
  }

  // 细节圆：喷注器面板孔位（右上）
  function detail(ctx, S, t) {
    const k = S.clamp((t - 0.9) / 0.6);
    if (k <= 0) return;
    const cx = 866, cy = 560, r = 70;
    ctx.save();
    ctx.strokeStyle = INK3; ctx.lineWidth = 1.2; ctx.setLineDash([16, 6, 3, 6]);
    ctx.beginPath(); ctx.moveTo(cx - r - 26, cy); ctx.lineTo(cx + r + 26, cy); ctx.moveTo(cx, cy - r - 26); ctx.lineTo(cx, cy + r + 26); ctx.stroke();
    ctx.setLineDash([]);
    // 构造圆（圆规画出）
    ctx.strokeStyle = INK2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, r + 14, -Math.PI / 2, -Math.PI / 2 + S.TAU * S.E.out3(k)); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + S.TAU * S.E.out3(S.clamp(k * 1.3))); ctx.stroke();
    if (k < 1) { const a = -Math.PI / 2 + S.TAU * S.E.out3(k); ctx.strokeStyle = INK2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r + 14), cy + Math.sin(a) * (r + 14)); ctx.stroke(); }
    // 孔位：两圈
    ctx.fillStyle = INK;
    for (const [rr, n] of [[52, 16], [30, 8], [0, 1]]) {
      for (let i = 0; i < n; i++) {
        if (i / n > S.clamp((k - 0.3) / 0.6)) continue;
        const a = i / n * S.TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rr ? 5 : 9, 0, S.TAU); ctx.stroke();
      }
    }
    ctx.font = S.F(20, 'JetBrainsMono'); ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.fillText('DETAIL B', cx, cy + r + 44);
    ctx.font = S.F(18, 'NotoSansSCM', 500); ctx.fillStyle = INK2; ctx.fillText('喷注器面板 1:5', cx, cy + r + 70);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  const CALL = [
    { part: 'A', n: '1', zh: '万向节', en: 'GIMBAL', at: [X - 34, 640], lab: [20, 512], side: -1 },
    { part: 'B', n: '2', zh: '喷注器', en: 'INJECTOR', at: [X - 120, 700], lab: [20, 640], side: -1 },
    { part: 'C', n: '3', zh: '燃烧室', en: 'CHAMBER', at: [X - 152, 810], lab: [20, 800], side: -1 },
    { part: 'D', n: '4', zh: '喉部', en: 'THROAT', at: [X - 90, 940], lab: [20, 960], side: -1 },
    { part: 'F', n: '5', zh: '涡轮泵', en: 'TURBOPUMP', at: [X + 300, 800], lab: [800, 900], side: 1 },
    { part: 'E', n: '6', zh: '喷管', en: 'NOZZLE', at: [X + 186, 1160], lab: [760, 1150], side: 1 },
  ];

  function draw(ctx, t, S) {
    const { clamp, E, seg } = S;
    prep(S);
    if (!PAPERTEX) PAPERTEX = makePaper(S);
    paper(ctx, S, t);

    const ex = E.outBack(seg(t, 2.0, 2.55), 1.3);           // 爆炸进度（带过冲）
    const offOf = p => [OFF[p][0] * ex, OFF[p][1] * ex];

    // 中心线（点划线）
    const cl = E.out3(clamp((t + 0.4) / 0.6));
    ctx.save(); ctx.strokeStyle = INK2; ctx.lineWidth = 1.4; ctx.setLineDash([34, 8, 4, 8]);
    ctx.beginPath(); ctx.moveTo(X, 960 - 470 * cl); ctx.lineTo(X, 960 + 500 * cl); ctx.stroke();
    ctx.restore();
    ctx.font = S.F(26, 'Caveat', 700); ctx.fillStyle = INK3; if (cl > 0.9) ctx.fillText('℄', X + 8, 500);

    // 构造圆（喉部 / 出口）——组装态可见，爆炸后淡出
    const consA = clamp((t - 0.5) / 0.4) * (1 - seg(t, 2.0, 2.3));
    if (consA > 0) {
      ctx.save(); ctx.globalAlpha = consA; ctx.strokeStyle = INK3; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(X, 916, 152, 0, S.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(X + 560, 952, 560 - 78, Math.PI * 0.86, Math.PI * 1.0); ctx.stroke();
      ctx.beginPath(); ctx.arc(X - 560, 952, 560 - 78, 0, Math.PI * 0.14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - 300, 916); ctx.lineTo(X + 300, 916); ctx.stroke();
      ctx.restore();
    }

    // 剖面线（右半，组装后扫入）
    for (const hz of HATCH) {
      const k = clamp((t - hz.t0) / 0.5);
      if (k <= 0) continue;
      const [ox, oy] = offOf(hz.part);
      ctx.save(); ctx.translate(ox, oy);
      ctx.beginPath(); hz.poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fillStyle = 'rgba(200,230,255,0.08)'; ctx.fill();
      ctx.clip();
      const ys = hz.poly.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const sweep = y0 + (y1 - y0 + 300) * E.out2(k);
      ctx.beginPath(); ctx.rect(0, 0, 1080, sweep); ctx.clip();
      ctx.strokeStyle = 'rgba(225,240,255,0.8)'; ctx.lineWidth = 1.3; ctx.beginPath();
      for (let d = -400; d < 900; d += 9) {
        ctx.moveTo(X - 10, y0 + d); ctx.lineTo(X + 400, y0 + d - 410);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 线条逐笔绘出
    let pen = null, penT = -1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of ST) {
      const k = clamp((t - s.t0) / s.dur);
      if (k <= 0) continue;
      const [ox, oy] = offOf(s.part);
      ctx.save(); ctx.translate(ox, oy);
      ctx.strokeStyle = s.col; ctx.lineWidth = s.w; if (s.dash) ctx.setLineDash(s.dash);
      const head = drawPart(ctx, s.pts, s.len * E.inOut2(k));
      ctx.restore();
      if (k < 1 && s.t0 > penT && head) { pen = [head[0] + ox, head[1] + oy]; penT = s.t0; }
    }

    // 绘图机十字：跟随当前笔尖
    if (pen && t < 1.95) {
      ctx.strokeStyle = 'rgba(220,240,255,0.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(56, pen[1]); ctx.lineTo(1024, pen[1]); ctx.moveTo(pen[0], 56); ctx.lineTo(pen[0], 1864); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pen[0], pen[1], 5, 0, S.TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pen[0], pen[1], 14, 0, S.TAU); ctx.stroke();
      ctx.font = S.F(16, 'JetBrainsMono'); ctx.fillStyle = INK2;
      ctx.fillText(`X${(pen[0] - X).toFixed(1)} Y${(1300 - pen[1]).toFixed(1)}`, pen[0] + 20, pen[1] - 18);
    }

    // 尺寸标注（组装态），爆炸时淡出
    const dimA = 1 - seg(t, 1.95, 2.2);
    if (dimA > 0) {
      ctx.save(); ctx.globalAlpha = dimA;
      dimV(ctx, S, 612, 1300, X - 290, X - 240, '1 360', seg(t, 1.0, 1.5));
      dimH(ctx, S, X - 152, X + 152, 760 + 0, 760, 'Ø 600', seg(t, 1.1, 1.5) * 1);
      dimH(ctx, S, X - 220, X + 220, 1350, 1306, 'Ø 880', seg(t, 1.3, 1.7));
      // 喉部引线标注
      const k = seg(t, 1.45, 1.8);
      if (k > 0) {
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath();
        ctx.moveTo(X + 80, 948); ctx.lineTo(X + 80 + 90 * k, 1010); ctx.lineTo(X + 80 + 90 * k + 70 * k, 1010); ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(X + 80, 948, 4, 0, S.TAU); ctx.fill();
        ctx.globalAlpha *= k; ctx.font = S.F(24, 'JetBrainsMono'); ctx.fillText('Ø 312 THROAT', X + 176, 1002);
      }
      ctx.restore();
    }

    // 爆炸：轴向运动箭头
    const mv = seg(t, 1.95, 2.4) * (1 - seg(t, 2.6, 3.0));
    if (mv > 0) {
      ctx.save(); ctx.globalAlpha = mv; ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2;
      for (const [x, y0, y1] of [[X - 260, 640, 520], [X - 260, 1200, 1320], [X + 260, 1200, 1320]]) {
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); arrow(ctx, x, y1, y1 < y0 ? -Math.PI / 2 : Math.PI / 2, 18);
      }
      ctx.beginPath(); ctx.moveTo(X + 330, 690); ctx.lineTo(X + 440, 690); ctx.stroke(); arrow(ctx, X + 440, 690, 0, 18);
      ctx.restore();
    }
    // 分解后的虚线导轨（零件沿轴滑开的轨迹）
    if (ex > 0.05) {
      ctx.save(); ctx.strokeStyle = INK3; ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);
      ctx.beginPath();
      for (const s of [-1, 1]) { ctx.moveTo(X + s * 152, 722); ctx.lineTo(X + s * 152, 722 - 58 * ex); ctx.moveTo(X + s * 78, 952); ctx.lineTo(X + s * 78, 952 + 96 * ex); }
      ctx.moveTo(X + 166, 760); ctx.lineTo(X + 166 + 96 * ex, 760);
      ctx.stroke(); ctx.restore();
    }

    // 引线标注（爆炸后按拍弹出）
    CALL.forEach((c, i) => {
      const k = seg(t, 2.35 + i * 0.13, 2.65 + i * 0.13);
      if (k <= 0) return;
      const [ox, oy] = offOf(c.part);
      const ax = c.at[0] + ox, ay = c.at[1] + oy;
      const bx = c.lab[0], by = c.lab[1];
      const ek = E.out3(k);
      const ex2 = ax + (bx + (c.side < 0 ? 200 : 0) - ax) * ek, ey2 = ay + (by - ay) * ek;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex2, ey2); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ax, ay, 5, 0, S.TAU); ctx.fill();
      if (k < 0.5) return;
      const a = E.outBack(clamp((k - 0.5) * 2), 2);
      // 编号气泡 + 文字
      const cx = c.side < 0 ? bx + 200 : bx, cy = by;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(a, a);
      ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(0, 0, 24, 0, S.TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.font = S.F(28, 'SpaceGrotesk', 700); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(c.n, 0, 10);
      ctx.restore();
      ctx.globalAlpha = clamp((k - 0.5) * 2);
      ctx.textAlign = c.side < 0 ? 'right' : 'left';
      const tx = c.side < 0 ? cx - 34 : cx + 34;
      ctx.font = S.F(30, 'NotoSansSCM', 500); ctx.fillStyle = INK; ctx.fillText(c.zh, tx, cy - 2);
      ctx.font = S.F(19, 'JetBrainsMono'); ctx.fillStyle = INK2; ctx.fillText(c.en, tx, cy + 24);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    });

    detail(ctx, S, t);
    title(ctx, S, t);
    titleBlock(ctx, S, t);
    // 手写批注
    if (t > 1.6) {
      ctx.save(); ctx.globalAlpha = clamp((t - 1.6) / 0.3);
      ctx.font = S.F(32, 'Caveat', 700); ctx.fillStyle = INK2;
      ctx.fillText('NOTE: all dims in mm', 96, 1500);
      ctx.fillText('— exploded along ℄', 96, 1534);
      ctx.restore();
    }

    // 3.0 强拍：APPROVED 印章落下
    const st = seg(t, 3.0, 3.25);
    if (st > 0) {
      const sc = 1 + 1.4 * (1 - E.outBack(st, 2.2));
      ctx.save(); ctx.translate(810, 1300); ctx.rotate(-0.16); ctx.scale(sc, sc); ctx.globalAlpha = clamp(st * 3) * 0.9;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; S.rr(ctx, -128, -40, 256, 80, 10); ctx.stroke();
      ctx.lineWidth = 1.5; S.rr(ctx, -120, -32, 240, 64, 7); ctx.stroke();
      ctx.font = S.F(40, 'SpaceGrotesk', 700); ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText('APPROVED', 0, 8);
      ctx.font = S.F(16, 'JetBrainsMono'); ctx.fillText('审定 · 2026.10', 0, 28);
      ctx.restore();
    }

    // 纸面颗粒
    if (!GPAT) GPAT = ctx.createPattern(S.grainTexture(), 'repeat');
    ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
    ctx.translate(-((S.hash(Math.floor(t * 12)) * 512) | 0), -((S.hash(Math.floor(t * 12) + 2) * 512) | 0));
    ctx.fillStyle = GPAT; ctx.fillRect(0, 0, 1080 + 512, 1920 + 512); ctx.restore();
  }

  registerScene({
    n: 18, key: 'blueprint', zh: '蓝图工程图', en: 'Blueprint',
    bg: PAPER, accent: '#e6f4ff',
    init(S) { prep(S); PAPERTEX = makePaper(S); },
    draw(out, t, S) {
      const ctx = cpuCtx('main');
      draw(ctx, t, S);
      out.drawImage(ctx.canvas, 0, 0);
    },
  });
})();
