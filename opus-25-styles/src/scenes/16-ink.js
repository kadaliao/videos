// 16 · 水墨写意：宣纸纤维、五色墨（焦浓重淡清）、层层远山晕染、飞白干笔、墨滴晕开、竖排书法标题 + 朱印。
(function () {
  const W = 1080, H = 1920;
  const CPU = { willReadFrequently: true };   // 软件光栅：在 SwiftShader 下比 GPU 画布快一个数量级
  const PAPER = '#f2ede1', SEAL = '#c23a2b';
  const INK = { jiao: [12, 12, 14], nong: [30, 30, 34], zhong: [62, 62, 66], dan: [128, 126, 124], qing: [184, 180, 172] };
  const ink = (k, a) => `rgba(${INK[k][0]},${INK[k][1]},${INK[k][2]},${a})`;

  let fg = null, boatC = null, paper = null, mts = null, mists = null, field = null, chars = null, seal = null, num = null;

  // ---------- 宣纸 ----------
  const PW = 1240, PH = 1940;
  function makePaper(S) {
    const W = PW, H = PH;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    // 低频斑驳
    const sw = 270, sh = 480, s = document.createElement('canvas'); s.width = sw; s.height = sh;
    const sg = s.getContext('2d', CPU), im = sg.createImageData(sw, sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const n = S.fbm(x * 0.018, y * 0.018, 3.3, 4), i = (y * sw + x) * 4;
      im.data[i] = 150; im.data[i + 1] = 128; im.data[i + 2] = 92; im.data[i + 3] = Math.max(0, n + 0.15) * 70;
    }
    sg.putImageData(im, 0, 0); g.globalAlpha = 0.45; g.drawImage(s, 0, 0, W, H); g.globalAlpha = 1;
    // 纤维
    const r = S.rng(1616);
    for (let i = 0; i < 3200; i++) {
      const x = r() * W, y = r() * H, a = r() * Math.PI * 2, L = 8 + r() * 46, cv = (r() - 0.5) * 0.9;
      const light = r() < 0.35;
      g.strokeStyle = light ? `rgba(255,253,245,${0.35 + r() * 0.35})` : `rgba(${120 + r() * 40},${100 + r() * 30},${70 + r() * 20},${0.05 + r() * 0.1})`;
      g.lineWidth = 0.5 + r() * 1.1;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + cv) * L * 0.5, y + Math.sin(a + cv) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) { g.globalAlpha = 0.06; g.globalCompositeOperation = 'multiply'; g.drawImage(S.grainTexture(), x, y); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // 旧纸边缘泛黄
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, 'rgba(160,130,80,0)'); vg.addColorStop(1, 'rgba(150,115,60,0.22)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }

  // ---------- 远山（半分辨率像素晕染，预计算） ----------
  function makeRange(S, o) {
    const w = 700, h = 960, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', CPU), im = g.createImageData(w, h), d = im.data;
    const ridge = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      let y = o.base;
      for (const [px, ph, pw] of o.peaks) y -= ph * Math.exp(-(((x - px) / pw) ** 2));
      y -= o.rough * (S.fbm(x * 0.012, o.seed, 0.3, 5) + 0.5 * Math.abs(S.noise2(x * 0.045, o.seed + 3)));
      ridge[x] = y;
    }
    for (let x = 0; x < w; x++) {
      const r0 = ridge[x], slope = (ridge[Math.min(w - 1, x + 2)] - ridge[Math.max(0, x - 2)]);
      for (let y = Math.max(0, Math.floor(r0) - 3); y < h; y++) {
        const dd = y - r0; if (dd < -2) continue;
        const edge = S.smooth(-1.5, 2.5, dd);
        let a = o.ink * (0.22 + 0.78 * Math.exp(-dd / o.fall)) + o.ink * 0.5 * Math.exp(-dd / 5);
        // 披麻皴：顺坡的竖向笔触纹理 + 湿墨颗粒
        const ns = S.noise3(x * 0.09 + dd * 0.02 * Math.sign(slope), y * 0.012, o.seed);
        const n1 = S.fbm(x * 0.02, y * 0.02, o.seed + 9, 3);
        a *= 0.72 + 0.5 * n1 + 0.35 * ns;
        // 阴阳面：坡向一侧更深
        a *= 1 + 0.25 * Math.max(-1, Math.min(1, slope * 0.15));
        a *= 1 - S.smooth(o.mist0, o.mist1, y + 30 * S.noise2(x * 0.01, o.seed + 5));
        a *= edge;
        if (a <= 0.004) continue;
        const i = (y * w + x) * 4;
        d[i] = o.col[0]; d[i + 1] = o.col[1]; d[i + 2] = o.col[2]; d[i + 3] = Math.min(255, a * 255);
      }
    }
    g.putImageData(im, 0, 0);
    // 软化湿边，并裁掉上下空白（减少每帧合成面积）
    let top = h; for (let x = 0; x < w; x++) top = Math.min(top, ridge[x]);
    const y0 = Math.max(0, Math.floor(top) - 6), y1 = Math.min(h, o.mist1 + 40), ch = y1 - y0;
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = ch; const g2 = c2.getContext('2d', CPU);
    g2.filter = 'blur(1.2px)'; g2.drawImage(c, 0, -y0); g2.filter = 'none'; g2.globalAlpha = 0.6; g2.drawImage(c, 0, -y0);
    return { c: c2, y0: y0 * 2, h: ch * 2 };
  }
  // 雾带：预先烘好的一条宽幅柔光带
  function makeMist(S, seed, a) {
    const w = 1300, h = 150, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', CPU);
    for (let k = 0; k < 7; k++) {
      const ew = 220 + S.hash(seed + k) * 200, x = k * 190 + S.hash(seed + k * 3) * 80, yy = h / 2 + (S.hash(seed + k * 7) - 0.5) * 40;
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, `rgba(242,237,225,${a})`); gr.addColorStop(0.55, `rgba(242,237,225,${a * 0.55})`); gr.addColorStop(1, 'rgba(242,237,225,0)');
      g.save(); g.translate(x, yy); g.scale(ew, h * 0.42); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
    }
    return c;
  }

  // ---------- 墨滴晕开的距离场 ----------
  function makeField(S) {
    const N = 360, f = new Float32Array(N * N), gr = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N * 2 - 1, v = y / N * 2 - 1, r = Math.hypot(u, v), th = Math.atan2(v, u);
      let R = 1 + 0.16 * S.fbm(Math.cos(th) * 1.6 + 5, Math.sin(th) * 1.6 + 5, 0.7, 3);
      R += 0.07 * S.noise2(u * 9 + 11, v * 9 + 3) + 0.035 * S.noise2(u * 26, v * 26);  // 毛细的小须
      f[y * N + x] = r / R;
      gr[y * N + x] = 0.8 + 0.45 * S.fbm(u * 6 + 2, v * 6 + 7, 1.1, 3);
    }
    return { N, f, gr };
  }
  function bloom(S, key, rho, dens, rim, col) {
    const { N, f, gr } = field, c = S.layer(key, N, N), g = c.getContext('2d', { willReadFrequently: true });
    const im = g.createImageData(N, N), d = im.data, fe = 0.06 + rho * 0.05;
    for (let i = 0; i < N * N; i++) {
      const F = f[i]; if (F > rho + fe) continue;
      const core = 1 - S.smooth(rho - fe, rho + fe * 0.4, F);
      const edge = Math.exp(-(((F - rho * 0.96) / (0.035 + rho * 0.02)) ** 2));
      const a = Math.min(1, (dens * core * gr[i] + rim * edge * core) * (0.7 + 0.3 * (1 - F / (rho + 0.001))));
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = a * 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  }

  // ---------- 干笔（飞白）：一束鬃毛沿路径走 ----------
  function brush(g, S, pts, o) {
    const n = pts.length; if (n < 2) return;
    const end = Math.max(1, Math.floor((n - 1) * S.clamp(o.p ?? 1)));
    const nb = o.bristles || Math.max(8, Math.min(46, Math.round(o.w / 1.6)));
    // 预计算法线与累计长度
    const nx = [], ny = [], s = [0];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      nx.push(-dy / L); ny.push(dx / L); if (i) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = s[n - 1] || 1, rr = S.rng(o.seed || 1);
    g.lineCap = 'round';
    for (let b = 0; b < nb; b++) {
      const off = (b / (nb - 1) - 0.5) + (rr() - 0.5) * 0.04, load = 0.55 + rr() * 0.45, ph = rr() * 50;
      const edgeK = Math.abs(off) * 2;  // 边缘的鬃毛更容易干
      g.strokeStyle = o.color(load); g.lineWidth = Math.max(0.8, o.w / nb * (1.6 + rr()));
      g.beginPath(); let on = false;
      for (let i = 0; i <= end; i++) {
        const u = s[i] / total;
        const press = (o.press ? o.press(u) : Math.sin(Math.min(1, u * 1.15 + 0.05) * Math.PI) ** 0.5);
        const dry = (o.dry ?? 0.35) * (0.25 + u * 1.1) + edgeK * 0.35 - (1 - load) * 0.1;
        const nv = S.noise2(ph + s[i] * (o.freq || 0.035), b * 3.7);
        const draw = nv * 0.5 + 0.5 > dry * 0.95 && Math.abs(off) < press * 0.5 + 0.02;
        const x = pts[i][0] + nx[i] * off * o.w * press, y = pts[i][1] + ny[i] * off * o.w * press;
        if (draw) { if (!on) { g.moveTo(x, y); on = true; } else g.lineTo(x, y); } else on = false;
      }
      g.stroke();
    }
  }
  // 路径采样
  function bez(p0, p1, p2, p3, n = 60) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
      out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
    }
    return out;
  }

  // ---------- 书法字（预渲染，带飞白纹理） ----------
  function makeChars(S) {
    const out = [];
    const tex = document.createElement('canvas'); tex.width = 260; tex.height = 260;
    const tg = tex.getContext('2d', CPU), ti = tg.createImageData(260, 260);
    for (let y = 0; y < 260; y++) for (let x = 0; x < 260; x++) {
      const n = S.noise2(x * 0.32 + y * 0.18, y * 0.022 - x * 0.012) + 0.25 * S.noise2(x * 0.05, y * 0.05), i = (y * 260 + x) * 4;
      ti.data[i + 3] = n > 0.42 ? 230 : n > 0.36 ? 90 : 0;
    }
    tg.putImageData(ti, 0, 0);
    for (const [k, ch] of [...'水墨写意'].entries()) {
      const c = document.createElement('canvas'); c.width = 260; c.height = 260; const g = c.getContext('2d', CPU);
      g.font = S.F(220, 'MaShanZheng'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = ink('jiao', 1); g.fillText(ch, 130, 138);
      g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.85;
      g.drawImage(tex, (k * 61) % 90 - 45, (k * 37) % 60 - 30, 300, 300);
      const b = document.createElement('canvas'); b.width = 260; b.height = 260; const bg = b.getContext('2d', CPU);
      bg.filter = 'blur(5px)'; bg.drawImage(c, 0, 0);
      out.push({ c, b });
    }
    return out;
  }
  function makeSeal(S) {
    const c = document.createElement('canvas'); c.width = 200; c.height = 200; const g = c.getContext('2d', CPU);
    g.fillStyle = SEAL;
    g.beginPath();
    const r = S.rng(77);
    for (let i = 0; i <= 40; i++) { const t = i / 40, x = 16 + t * 168; g.lineTo(x, 16 + (r() - 0.5) * 3); }
    for (let i = 0; i <= 40; i++) { const t = i / 40, y = 16 + t * 168; g.lineTo(184 + (r() - 0.5) * 3, y); }
    for (let i = 0; i <= 40; i++) { const t = i / 40, x = 184 - t * 168; g.lineTo(x, 184 + (r() - 0.5) * 3); }
    for (let i = 0; i <= 40; i++) { const t = i / 40, y = 184 - t * 168; g.lineTo(16 + (r() - 0.5) * 3, y); }
    g.fill();
    // 阴刻：白字 + 白边
    g.globalCompositeOperation = 'destination-out';
    g.strokeStyle = '#000'; g.lineWidth = 5; g.strokeRect(30, 30, 140, 140);
    g.font = S.F(64, 'NotoSerifSC', 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
    g.fillText('十', 132, 66); g.fillText('六', 132, 134); g.fillText('画', 68, 66); g.fillText('风', 68, 134);
    // 印泥不匀
    for (let i = 0; i < 260; i++) { g.globalAlpha = 0.2 + r() * 0.6; g.beginPath(); g.arc(16 + r() * 168, 16 + r() * 168, 0.6 + r() * 2.4, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    return c;
  }

  // ---------- 场景元素 ----------
  // 近景崖石与孤松：每一笔先在 init 里画好，逐帧沿笔路用遮罩“画出来”
  function strokeItem(S, pts, o, t0, dur) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const pad = o.w * 0.8 + 6; x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad); x1 = Math.ceil(x1 + pad); y1 = Math.ceil(y1 + pad);
    const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0; const g = c.getContext('2d', CPU);
    g.translate(-x0, -y0); brush(g, S, pts, o);
    return { c, x0, y0, pts: pts.map(([x, y]) => [x - x0, y - y0]), w: o.w, t0, dur };
  }
  function makeFG(S) {
    const items = [];
    // 崖体淡墨衬底（湿边）
    {
      const c = document.createElement('canvas'); c.width = 620; c.height = 760; const g = c.getContext('2d', CPU);
      g.filter = 'blur(9px)'; g.fillStyle = ink('zhong', 0.26);
      const C = [[-30, 1268], [80, 1236], [170, 1252], [262, 1292], [330, 1352], [362, 1420], [432, 1462], [472, 1540], [444, 1640], [476, 1780], [470, 1990], [-60, 1990]];
      g.beginPath(); C.forEach(([x, y], i) => i ? g.lineTo(x + 40 - 6, y - 1230 + 6) : g.moveTo(x + 40, y - 1230 + 6)); g.closePath(); g.fill();
      g.filter = 'blur(3px)'; g.fillStyle = ink('dan', 0.25); g.fill();
      g.filter = 'none';
      g.filter = 'none'; g.globalCompositeOperation = 'destination-in';
      const fade = g.createLinearGradient(0, 0, 0, 760); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.45, 'rgba(0,0,0,0.75)'); fade.addColorStop(1, 'rgba(0,0,0,0.08)');
      g.fillStyle = fade; g.fillRect(0, 0, 620, 760); g.globalCompositeOperation = 'source-over';
      items.push({ c, x0: -40, y0: 1230, pts: [[300, -300], [300, 800]], w: 900, t0: 0.05, dur: 0.8, wash: true });
    }
    // 崖石：折线勾勒（焦墨）+ 斧劈皴（短而斜的侧锋干笔）
    const poly = (pts, n = 14) => { const out = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const u = k / n; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]); } out.push(pts[pts.length - 1]); return out; };
    const r = S.rng(808);
    for (let i = 0; i < 11; i++) {
      const x = 30 + r() * 360, y = 1310 + r() * 360, L = 50 + r() * 40, a = 2.05 + r() * 0.3, tone = r() < 0.5 ? 'zhong' : 'dan';
      items.push(strokeItem(S, poly([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 20), { w: 50 + r() * 26, dry: 0.42, bristles: 34, seed: 60 + i, color: q => ink(tone, 0.3 * q), freq: 0.05, press: u => Math.sin(Math.min(1, u * 1.1 + 0.05) * Math.PI) ** 0.35 }, -0.1 + i * 0.04, 0.25));
    }
    const lines = [
      [[[-30, 1268], [80, 1236], [170, 1252], [262, 1292], [330, 1352], [362, 1420], [432, 1462], [472, 1540], [444, 1640], [476, 1780]], 26, 'jiao'],
      [[[60, 1330], [140, 1382], [182, 1470], [168, 1560], [200, 1660]], 16, 'nong'],
      [[[250, 1400], [302, 1482], [290, 1600]], 14, 'nong'],
      [[[-20, 1480], [60, 1520], [110, 1640]], 12, 'zhong'],
    ];
    lines.forEach(([pts, w, tone], i) => items.push(strokeItem(S, poly(pts), { w, dry: 0.38, seed: 11 + i, color: a => ink(tone, 0.85 * a), freq: 0.04, press: u => 0.75 + 0.25 * Math.sin(u * 9) }, -0.3 + i * 0.12, 0.55)));
    // 树干：一笔重墨 + 一笔焦墨皴皮
    items.push(strokeItem(S, bez([140, 1330], [200, 1180], [80, 1080], [235, 935], 90), { w: 60, dry: 0.32, seed: 21, color: a => ink('nong', 0.9 * a), press: u => 1 - u * 0.5, bristles: 40 }, 0.0, 0.55));
    items.push(strokeItem(S, bez([128, 1320], [185, 1190], [70, 1085], [222, 945], 90), { w: 16, dry: 0.5, seed: 22, color: a => ink('jiao', 0.85 * a), press: u => 1 - u * 0.3 }, 0.12, 0.5));
    const br = [
      [[200, 1010], [260, 990], [330, 1000], [410, 955]],
      [[150, 1125], [100, 1100], [60, 1080], [5, 1092]],
      [[230, 950], [285, 905], [350, 900], [420, 868]],
      [[175, 1060], [220, 1070], [255, 1060], [300, 1072]],
    ];
    br.forEach((cp, i) => items.push(strokeItem(S, bez(...cp, 40), { w: 13, dry: 0.4, seed: 30 + i, color: a => ink('jiao', 0.82 * a) }, 0.35 + i * 0.07, 0.3)));
    // 松针团
    const clusters = [[410, 948, 74], [330, 990, 62], [430, 866, 64], [300, 895, 56], [20, 1084, 60], [85, 1098, 48], [250, 925, 46], [300, 1066, 44]];
    const cl = clusters.map(([cx, cy, R], k) => {
      const c = document.createElement('canvas'); c.width = Math.ceil(R * 2.3); c.height = Math.ceil(R * 1.3); const g = c.getContext('2d', CPU);
      const ox = c.width / 2, oy = c.height * 0.72, r = S.rng(400 + k);
      g.fillStyle = ink('dan', 0.14); g.beginPath(); g.ellipse(ox, oy - R * 0.18, R * 0.95, R * 0.33, 0, 0, Math.PI * 2); g.fill();
      g.lineCap = 'round';
      for (let i = 0; i < 52; i++) {
        const a = -Math.PI * 0.97 + (i / 52) * Math.PI * 0.94 + (r() - 0.5) * 0.1, L = R * (0.55 + r() * 0.45);
        g.strokeStyle = ink(r() < 0.5 ? 'jiao' : 'nong', 0.55 + r() * 0.35); g.lineWidth = 2 + r() * 2.4;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L * 0.55); g.stroke();
      }
      return { c, x: cx - ox, y: cy - oy, cx, cy, t0: 0.6 + k * 0.06 };
    });
    return { items, cl };
  }
  function drawFG(g, S, t, ox) {
    fg.items.forEach((it, i) => {
      const p = S.clamp((t - it.t0) / it.dur); if (p <= 0) return;
      if (p >= 1) { g.drawImage(it.c, it.x0 + ox, it.y0); return; }
      const L = S.layer('s16-fg' + i, it.c.width, it.c.height), lg = L.getContext('2d', CPU);
      lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, L.width, L.height);
      const n = it.pts.length, end = Math.max(1, Math.floor((n - 1) * S.E.inOut2(p)));
      lg.lineCap = 'round'; lg.lineJoin = 'round'; lg.lineWidth = it.w * 1.3; lg.strokeStyle = '#000';
      lg.beginPath(); lg.moveTo(it.pts[0][0], it.pts[0][1]); for (let k = 1; k <= end; k++) lg.lineTo(it.pts[k][0], it.pts[k][1]); lg.stroke();
      lg.globalCompositeOperation = 'source-in'; lg.drawImage(it.c, 0, 0); lg.globalCompositeOperation = 'source-over';
      g.drawImage(L, it.x0 + ox, it.y0);
    });
    fg.cl.forEach(c => {
      const q = S.clamp((t - c.t0) / 0.3); if (q <= 0) return;
      const e = S.E.outBack(q, 1.4);
      g.save(); g.globalAlpha = Math.min(1, q * 1.5); g.translate(c.cx + ox, c.cy); g.scale(e, e); g.drawImage(c.c, c.x - c.cx, c.y - c.cy); g.restore();
    });
  }

  function makeBoat(S) {
    const c = document.createElement('canvas'); c.width = 380; c.height = 220; const g = c.getContext('2d', CPU);
    g.translate(130, 150);
    brush(g, S, bez([-110, -6], [-50, 22], [50, 22], [120, -12], 40), { w: 18, dry: 0.25, seed: 51, color: a => ink('jiao', 0.9 * a), press: u => 0.6 + 0.4 * Math.sin(u * Math.PI) });
    brush(g, S, bez([-80, 4], [-20, 10], [40, 10], [90, 0], 30), { w: 7, dry: 0.4, seed: 52, color: a => ink('zhong', 0.6 * a) });
    // 蓑笠翁：佝偻的身形 + 宽檐斗笠
    g.fillStyle = ink('nong', 0.85);
    g.beginPath(); g.moveTo(-22, 4); g.bezierCurveTo(-30, -20, -18, -44, 0, -46); g.bezierCurveTo(14, -44, 20, -30, 18, -14); g.bezierCurveTo(16, -4, 14, 2, 12, 4); g.closePath(); g.fill();
    g.strokeStyle = ink('jiao', 0.55); g.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(-16 + i * 4, -38 + Math.abs(i - 4) * 2); g.lineTo(-22 + i * 5, 4); g.stroke(); }
    g.fillStyle = ink('jiao', 0.95);
    g.beginPath(); g.moveTo(-42, -44); g.quadraticCurveTo(-4, -82, 38, -46); g.quadraticCurveTo(-2, -54, -42, -44); g.fill();
    g.fillRect(-3, -74, 4, 6);
    g.strokeStyle = ink('nong', 0.9); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(10, -26); g.quadraticCurveTo(80, -90, 220, -128); g.stroke();
    return c;
  }
  function boat(g, S, t, x, y) {
    const bob = Math.sin(t * 2.2) * 4, rk = Math.sin(t * 2.2 + 0.8) * 0.03, sc = 1.25;
    g.save(); g.translate(x, y + bob); g.rotate(rk); g.scale(sc, sc);
    g.drawImage(boatC, -130, -150);
    g.strokeStyle = ink('zhong', 0.6); g.lineWidth = 1.2; g.beginPath(); g.moveTo(220, -128); g.quadraticCurveTo(226, -40, 230, 18 - bob); g.stroke();
    g.restore();
    g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const w = 200 - i * 36, yy = y + 32 + i * 13 + bob * 0.3, xx = x - 10 + Math.sin(t * 1.5 + i) * 10;
      g.strokeStyle = ink('dan', 0.32 - i * 0.06); g.lineWidth = 3 - i * 0.5;
      g.beginPath(); g.moveTo(xx - w / 2, yy); g.lineTo(xx + w / 2, yy); g.stroke();
    }
  }

  function birds(g, S, t) {
    const list = [[880, 640, 1.0, 0], [960, 600, 0.8, 1.3], [1010, 690, 0.7, 2.1], [1100, 640, 0.6, 0.7], [1180, 700, 0.55, 2.8]];
    g.lineCap = 'round';
    list.forEach(([x0, y0, s, ph], i) => {
      const x = x0 - t * (130 + i * 12) - 120, y = y0 + Math.sin(t * 2 + ph) * 12 - t * 18;
      if (x < -60 || x > W + 60) return;
      const flap = Math.sin(t * 9 + ph * 3), span = 34 * s, up = flap * 14 * s;
      g.strokeStyle = ink('jiao', 0.88); g.lineWidth = 4.2 * s;
      g.beginPath(); g.moveTo(x - span, y - up); g.quadraticCurveTo(x - span * 0.4, y - 10 * s - up * 0.2, x, y); g.stroke();
      g.beginPath(); g.moveTo(x + span * 0.9, y - up * 0.9); g.quadraticCurveTo(x + span * 0.35, y - 9 * s - up * 0.2, x, y); g.stroke();
      g.fillStyle = ink('jiao', 0.9); g.beginPath(); g.ellipse(x - 2 * s, y + 1, 5 * s, 3 * s, 0.2, 0, 7); g.fill();
    });
  }

  function mist(g, k, t, y, speed) {
    const c = mists[k]; g.drawImage(c, -500 + ((t + 0.4) * speed) % 400 - k * 60, y - 150, 2600, 300);
  }

  function drop(g, S, t, x, y0, y1, tHit, size, tone) {
    if (t < tHit - 0.5 || t >= tHit) return;
    const k = S.clamp((t - (tHit - 0.5)) / 0.5), y = y0 + (y1 - y0) * k * k, st = 1 + k * 1.6;
    g.fillStyle = ink(tone, 0.95);
    g.beginPath(); g.ellipse(x, y, size, size * st, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - size * 0.7, y - size * st * 0.5); g.quadraticCurveTo(x, y - size * st * 3, x + size * 0.7, y - size * st * 0.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - size * 0.35, y - size * 0.3, size * 0.22, size * 0.4 * st, 0, 0, 7); g.fill();
  }
  function splats(g, S, t, x, y, tHit, n, R, seed, tone) {
    if (t < tHit) return;
    const k = S.E.out3(S.clamp((t - tHit) / 0.35)), r = S.rng(seed);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = R * (0.7 + r() * 0.9) * k, s = (1.5 + r() * 4) * (0.6 + 0.4 * k);
      const gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d * 0.9;
      const gr = g.createRadialGradient(gx, gy, 0, gx, gy, s * 1.6);
      gr.addColorStop(0, ink(tone, 0.85)); gr.addColorStop(0.6, ink(tone, 0.6)); gr.addColorStop(1, ink(tone, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(gx, gy, s * 1.6, 0, 7); g.fill();
    }
  }

  function makeNum(S) {
    const mk = (blur, alpha) => {
      const c = document.createElement('canvas'); c.width = 420; c.height = 340; const g = c.getContext('2d', CPU);
      g.font = S.F(270, 'MaShanZheng'); g.textAlign = 'center'; g.textBaseline = 'middle';
      if (blur) g.filter = `blur(${blur}px)`;
      g.fillStyle = ink('jiao', alpha); g.fillText('16', 210, 180); return c;
    };
    return { sharp: mk(0, 0.95), soft: mk(14, 0.9), bleed: mk(3, 0.3) };
  }

  registerScene({
    n: 16, key: 'ink', zh: '水墨写意', en: 'Chinese Ink Wash',
    bg: PAPER, accent: SEAL,
    init: async (S) => {
      paper = makePaper(S);
      const far = makeRange(S, { seed: 1.3, base: 520, peaks: [[120, 110, 70], [330, 70, 60], [520, 130, 80], [660, 70, 50]], rough: 34, ink: 0.2, fall: 60, mist0: 520, mist1: 610, col: INK.dan });
      paper.getContext('2d', CPU).drawImage(far.c, 0, far.y0, 1400, far.h);
      mts = [
        makeRange(S, { seed: 4.1, base: 580, peaks: [[150, 230, 60], [240, 140, 55], [430, 90, 80], [610, 110, 60]], rough: 40, ink: 0.42, fall: 90, mist0: 560, mist1: 670, col: INK.zhong }),
        makeRange(S, { seed: 7.7, base: 650, peaks: [[400, 60, 90], [560, 85, 70], [130, 40, 80]], rough: 26, ink: 0.55, fall: 40, mist0: 640, mist1: 700, col: INK.nong }),
      ];
      mists = [makeMist(S, 10, 0.55), makeMist(S, 20, 0.75), makeMist(S, 30, 0.65), makeMist(S, 40, 0.8)];
      field = makeField(S);
      chars = makeChars(S);
      seal = makeSeal(S);
      num = makeNum(S);
      fg = makeFG(S);
      boatC = makeBoat(S);
    },
    draw(ctx, t, S) {
      // 全部画在 CPU 画布上，最后一次性贴到舞台
      const M = S.layer('s16-main', W, H), g = M.getContext('2d', CPU);
      g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      // 落印时的轻微震动
      const thump = t >= 2 && t < 2.25 ? Math.sin((t - 2) * 60) * 5 * (1 - (t - 2) / 0.25) : 0;
      g.save(); g.translate(0, thump);
      // 镜头缓慢平移的长卷（纸 + 远山一起走）
      const pan = t + 0.4;
      g.imageSmoothingEnabled = true;
      g.drawImage(paper, -40 - pan * 10, -10);
      mist(g, 0, t, 1110, 22);

      // 墨滴一：t=0.5 落下，晕成一轮淡墨月，「16」从墨里洇出来
      const mx = 300, my = 470;
      drop(g, S, t, mx, -80, my, 0.5, 15, 'nong');
      if (t >= 0.5) {
        const k = S.clamp((t - 0.5) / 2.2), rho = 0.15 + 0.78 * S.E.out3(k);
        const B = bloom(S, 's16-b1', rho, 0.28 + 0.4 * (1 - k), 0.35, INK.zhong);
        g.drawImage(B, mx - 260, my - 260, 520, 520);
      }
      splats(g, S, t, mx, my, 0.5, 4, 150, 5, 'nong');

      g.drawImage(mts[0].c, -120 - pan * 18, mts[0].y0, 1400, mts[0].h);
      mist(g, 1, t, 1250, 34);
      g.drawImage(mts[1].c, -160 - pan * 28, mts[1].y0, 1400, mts[1].h);
      mist(g, 2, t, 1365, 40);

      // 远水：几道淡墨横纹
      g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const y = 1500 + i * 34 + (i % 2) * 6, x = 200 + S.hash(i * 3.3) * 500 - pan * 30, w = 140 + S.hash(i * 5.1) * 260;
        g.strokeStyle = ink('qing', 0.45); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
      }

      // 孤舟
      boat(g, S, t, 640 - pan * 22, 1420);
      // 墨滴二：t=3 落入水中，墨晕 + 涟漪
      const dx = 850 - pan * 22, dy = 1470;
      drop(g, S, t, dx, 200, dy, 3.0, 9, 'jiao');
      if (t >= 3.0) {
        const k = S.clamp((t - 3.0) / 1.2), rho = 0.12 + 0.6 * S.E.out3(k);
        const B = bloom(S, 's16-b2', rho, 0.6 * (1 - 0.4 * k), 0.5, INK.jiao);
        g.save(); g.translate(dx, dy); g.scale(1, 0.42); g.drawImage(B, -110, -110, 220, 220); g.restore();
        for (let r = 0; r < 3; r++) {
          const kk = S.clamp((t - 3.0 - r * 0.18) / 1.1); if (kk <= 0) continue;
          const R = 30 + 190 * S.E.out2(kk);
          g.strokeStyle = ink('zhong', 0.5 * (1 - kk)); g.lineWidth = 3 * (1 - kk) + 0.8;
          g.beginPath(); g.ellipse(dx, dy, R, R * 0.22, 0, 0, Math.PI * 2); g.stroke();
        }
      }
      splats(g, S, t, dx, dy, 3.0, 6, 40, 9, 'jiao');

      // 近景：崖石与孤松（一笔笔画出来）
      drawFG(g, S, t, 30 - pan * 14);
      birds(g, S, t);

      // ---------- 标题 ----------
      const nk = S.clamp((t - 0.55) / 0.55);
      if (nk > 0) {
        const e = S.E.out2(nk);
        g.globalAlpha = 1 - e; g.drawImage(num.soft, mx - 214, my - 170);
        g.globalAlpha = e; g.drawImage(num.bleed, mx - 208, my - 166); g.drawImage(num.sharp, mx - 210, my - 170);
        g.globalAlpha = 1;
      }
      // 英文名（托一团薄雾，压在山头上也能读）
      const ek = S.clamp((t - 0.9) / 0.6);
      if (ek > 0) {
        g.save(); g.globalAlpha = S.E.out2(ek);
        g.drawImage(mists[3], mx - 330, my + 150, 660, 120);
        g.font = S.F(66, 'InstrumentSerif'); g.fillStyle = ink('nong', 0.95); g.textAlign = 'center';
        g.fillText('Chinese Ink Wash', mx, my + 225 + (1 - ek) * 12);
        g.fillStyle = ink('zhong', 0.7); g.fillRect(mx - 120, my + 248, 240 * S.E.out3(ek), 2);
        g.restore();
      }
      // 竖排书法：逐字书写（斜向笔势擦出 + 墨洇）
      const colX = 815, y0 = 260, step = 205;
      chars.forEach((c, i) => {
        const a = i * 0.32, k = S.clamp((t - a) / 0.42); if (k <= 0) return;
        const cy = y0 + i * step;
        if (k >= 1) { g.globalAlpha = 0.25; g.drawImage(c.b, colX - 132, cy - 126, 264, 264); g.globalAlpha = 1; g.drawImage(c.c, colX - 130, cy - 130); return; }
        const L = S.layer('s16-ch' + i, 260, 260), lg = L.getContext('2d', CPU);
        const e = S.E.inOut2(k), p = -0.25 + e * 1.6;
        const gr = lg.createLinearGradient(30, 0, 230, 260);
        gr.addColorStop(S.clamp(p - 0.12), 'rgba(0,0,0,1)'); gr.addColorStop(S.clamp(p + 0.02), 'rgba(0,0,0,0)');
        lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1; lg.clearRect(0, 0, 260, 260);
        lg.globalAlpha = 0.25; lg.drawImage(c.b, -2, 4); lg.globalAlpha = 1; lg.drawImage(c.c, 0, 0);
        lg.globalCompositeOperation = 'destination-in'; lg.fillStyle = gr; lg.fillRect(0, 0, 260, 260);
        lg.globalCompositeOperation = 'source-over';
        g.drawImage(L, colX - 130, cy - 130);
      });
      // 朱印：第二小节强拍落下
      if (t > 1.82) {
        const k = S.clamp((t - 1.82) / 0.18), land = t >= 2;
        let sc, al;
        if (!land) { sc = 1.7 - 0.7 * S.E.in3(k); al = 0.15 + 0.6 * k; }
        else { const q = t - 2; sc = 1 - 0.06 * Math.exp(-q * 14) * Math.cos(q * 40); al = 1; }
        const sx = colX, sy = y0 + 4 * step - 20;
        g.save(); g.translate(sx, sy); g.rotate(-0.04); g.scale(sc, sc); g.globalAlpha = al;
        if (!land) { g.fillStyle = 'rgba(40,20,10,0.15)'; g.fillRect(-84, -72, 180, 180); }
        g.drawImage(seal, -95, -95, 190, 190);
        g.restore();
        if (land) {
          const q = S.clamp((t - 2) / 0.4);
          g.strokeStyle = `rgba(194,58,43,${0.25 * (1 - q)})`; g.lineWidth = 3;
          g.strokeRect(sx - 78 - q * 30, sy - 78 - q * 30, 156 + q * 60, 156 + q * 60);
        }
      }
      g.restore();
      g.restore();
      ctx.drawImage(M, 0, 0);
    },
  });
})();
