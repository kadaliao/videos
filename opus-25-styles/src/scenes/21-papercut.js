// 21 纸雕层叠 —— 日落色阶的纸雕立体书：层层山丘随节拍从下方弹起，太阳缓缓升起，小屋翻折立起、窗灯亮起，纸鸟飞过。
// 每层纸预先烘焙（纤维纹理、不规则裁边、切口亮边、柔和投影），每帧只做位移与视差。
(function () {
  const W = 1080, H = 1920, M = 70;   // M：视差留边
  let BAKED = null;

  // ---------- 纸纤维纹理（透明底，深浅纤维与颗粒） ----------
  function fibreTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const im = g.createImageData(512, 512), r = S.rng(2121);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = r(); const dark = v < 0.5;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = dark ? 40 : 255; im.data[i + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 38);
    }
    g.putImageData(im, 0, 0);
    g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x = r() * 512, y = r() * 512, a = r() * Math.PI, l = 6 + r() * 26;
      g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.10 + r() * 0.18})` : `rgba(60,20,30,${0.05 + r() * 0.08})`;
      g.lineWidth = 0.6 + r() * 0.9; g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 6, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    return c;
  }

  // 不规则裁边：高频小抖动
  const jag = (x, seed) => S.noise2(x * 0.09, seed) * 1.6 + S.noise2(x * 0.5, seed + 3) * 0.7;

  // 把一个“形状绘制函数”烘焙成带纹理、亮边、投影的纸层
  function bake(w, h, color, shape, opt = {}) {
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h; const mg = mask.getContext('2d');
    mg.fillStyle = color; shape(mg);
    mg.globalCompositeOperation = 'source-atop';
    // 纵向明暗：顶部受光
    const top = opt.top ?? 0;
    const lg = mg.createLinearGradient(0, top, 0, top + (opt.shadeLen ?? 420));
    lg.addColorStop(0, 'rgba(255,240,220,0.16)'); lg.addColorStop(1, 'rgba(40,0,30,0.16)');
    mg.fillStyle = lg; mg.fillRect(0, 0, w, h);
    // 纤维
    const pat = mg.createPattern(BAKED.fibre, 'repeat'); mg.globalAlpha = (opt.texAlpha ?? 1) * 0.55; mg.fillStyle = pat; mg.fillRect(0, 0, w, h); mg.globalAlpha = 1;
    // 切口亮边
    if (opt.edge) { mg.strokeStyle = opt.edgeColor || 'rgba(255,236,214,0.55)'; mg.lineWidth = opt.edgeW || 3; opt.edge(mg); }
    mg.globalCompositeOperation = 'source-over';
    const out = document.createElement('canvas'); out.width = w; out.height = h; const og = out.getContext('2d');
    og.shadowColor = opt.shadowColor || 'rgba(70,14,40,0.62)'; og.shadowBlur = opt.shadowBlur ?? 30; og.shadowOffsetY = opt.shadowY ?? -8; og.shadowOffsetX = opt.shadowX ?? 0;
    og.drawImage(mask, 0, 0);
    og.shadowColor = 'transparent'; og.drawImage(mask, 0, 0);
    return out;
  }

  // ---------- 山丘层 ----------
  // 每层：基线、起伏、颜色、深度（视差）、树
  const HILLS = [
    { base: 960, amp: 70, f: 1.3, ph: 0.4, col: '#ffbe8e', depth: 0.15, trees: 0, seed: 1 },
    { base: 1035, amp: 80, f: 1.7, ph: 2.1, col: '#ff9f7c', depth: 0.25, trees: 0, seed: 2 },
    { base: 1110, amp: 70, f: 2.1, ph: 4.0, col: '#f6807a', depth: 0.38, trees: 6, treeS: 0.55, seed: 3 },
    { base: 1195, amp: 85, f: 1.5, ph: 1.0, col: '#e0627a', depth: 0.52, trees: 5, treeS: 0.8, seed: 4, house: true },
    { base: 1300, amp: 70, f: 2.3, ph: 5.2, col: '#bb4b78', depth: 0.68, trees: 6, treeS: 1.0, seed: 5 },
    { base: 1420, amp: 60, f: 1.8, ph: 3.3, col: '#8d3a70', depth: 0.85, trees: 4, treeS: 1.3, seed: 6 },
    { base: 1560, amp: 55, f: 2.6, ph: 0.9, col: '#622c61', depth: 1.05, trees: 0, grass: true, seed: 7 },
  ];
  const ridge = (L, x) => L.base - L.amp * (0.55 * Math.sin(x / W * Math.PI * L.f + L.ph) + 0.3 * Math.sin(x / W * Math.PI * L.f * 2.3 + L.ph * 1.7) + 0.15 * S.noise2(x * 0.004, L.seed)) + jag(x, L.seed * 10);

  function pine(g, x, y, s) {
    g.moveTo(x, y - 120 * s);
    for (let k = 0; k < 3; k++) { const yy = y - 120 * s + (k + 1) * 34 * s, ww = (20 + k * 12) * s; g.lineTo(x + ww, yy); g.lineTo(x + ww * 0.45, yy); }
    g.lineTo(x + 5 * s, y - 8 * s); g.lineTo(x + 5 * s, y + 20); g.lineTo(x - 5 * s, y + 20); g.lineTo(x - 5 * s, y - 8 * s);
    for (let k = 2; k >= 0; k--) { const yy = y - 120 * s + (k + 1) * 34 * s, ww = (20 + k * 12) * s; g.lineTo(x - ww * 0.45, yy); g.lineTo(x - ww, yy); }
    g.closePath();
  }
  function roundTree(g, x, y, s) {
    g.moveTo(x + 5 * s, y + 20); g.lineTo(x + 5 * s, y - 40 * s); g.lineTo(x - 5 * s, y - 40 * s); g.lineTo(x - 5 * s, y + 20); g.closePath();
    g.moveTo(x + 34 * s, y - 70 * s); g.arc(x, y - 70 * s, 34 * s, 0, S.TAU);
    g.moveTo(x + 22 * s + 20 * s, y - 50 * s); g.arc(x + 20 * s, y - 50 * s, 22 * s, 0, S.TAU);
    g.moveTo(x - 20 * s + 22 * s, y - 52 * s); g.arc(x - 20 * s, y - 52 * s, 22 * s, 0, S.TAU);
  }

  function bakeHills() {
    return HILLS.map((L, li) => {
      let ymin = 1e9; for (let x = -M; x <= W + M; x += 8) ymin = Math.min(ymin, ridge(L, x));
      const y0 = Math.floor(ymin - 200 * (L.treeS || 0.6) - 60), w = W + 2 * M, h = H + 160 - y0;
      const r = S.rng(500 + li);
      const treeXs = Array.from({ length: L.trees }, (_, k) => (k + 0.2 + r() * 0.6) / L.trees * (W + 80) - 40);
      const shape = g => {
        g.save(); g.translate(M, -y0);
        g.beginPath(); g.moveTo(-M, H + 200);
        for (let x = -M; x <= W + M; x += 4) g.lineTo(x, ridge(L, x));
        g.lineTo(W + M, H + 200); g.closePath();
        treeXs.forEach((tx, k) => { const s = L.treeS * (0.75 + 0.5 * r()); (k % 3 === 1 ? roundTree : pine)(g, tx, ridge(L, tx) + 6, s); });
        g.fill('nonzero');
        if (L.grass) { // 前景草叶
          g.beginPath();
          for (let x = -M; x <= W + M; x += 14) { const y = ridge(L, x) + 2, hh = 14 + 26 * Math.abs(S.noise2(x * 0.05, 9)); g.moveTo(x - 5, y); g.lineTo(x + 3 * Math.sin(x), y - hh); g.lineTo(x + 5, y); }
          g.fill();
        }
        g.restore();
      };
      const edge = g => { g.save(); g.translate(M, -y0 + 2.5); g.beginPath(); for (let x = -M; x <= W + M; x += 4) x === -M ? g.moveTo(x, ridge(L, x)) : g.lineTo(x, ridge(L, x)); g.stroke(); g.restore(); };
      const c = bake(w, h, L.col, shape, { top: ridge(L, W / 2) - y0, edge, shadowBlur: 40, shadowY: -12 });
      return { c, y0, L };
    });
  }

  function bakeSun() {
    const R = 430, s = R * 2 + 120, c0 = s / 2;
    const out = document.createElement('canvas'); out.width = out.height = s; const g = out.getContext('2d');
    const rings = [[R, '#ffe2ad'], [R * 0.78, '#ffe9bd'], [R * 0.58, '#fff0cd'], [R * 0.4, '#fff6dc'], [R * 0.25, '#fffbea']];
    rings.forEach(([r, col], i) => {
      const ring = bake(s, s, col, g2 => { g2.beginPath(); for (let a = 0; a <= S.TAU + 0.01; a += 0.02) { const rr = r + jag(a * 120, 40 + i); a ? g2.lineTo(c0 + Math.cos(a) * rr, c0 + Math.sin(a) * rr) : g2.moveTo(c0 + rr, c0); } g2.fill(); },
        { top: c0 - r, shadeLen: r * 2, shadowBlur: 22, shadowY: 4, shadowColor: 'rgba(200,90,40,0.35)', texAlpha: 0.7 });
      g.drawImage(ring, 0, 0);
    });
    return out;
  }

  function bakeCloud(seed, w) {
    const h = w * 0.45, cw = w + 80, ch = h + 80, r = S.rng(seed);
    return bake(cw, ch, '#fff1e2', g => {
      g.beginPath();
      const n = 4 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) { const x = 40 + w * (k + 0.5) / n, rr = h * (0.3 + 0.35 * Math.sin(Math.PI * (k + 0.5) / n)) * (0.85 + 0.3 * r()); g.moveTo(x + rr, 40 + h - rr * 0.7); g.arc(x, 40 + h - rr * 0.7, rr, 0, S.TAU); }
      g.rect(40, 40 + h * 0.62, w, h * 0.38); g.fill('nonzero');
    }, { top: 40, shadeLen: h, shadowBlur: 20, shadowY: 8, shadowColor: 'rgba(170,70,60,0.35)' });
  }

  function bakeHouse() {
    const w = 220, h = 230;
    return bake(w, h, '#fbe3c8', g => {
      g.beginPath(); g.rect(45, 110, 130, 100); g.fill();
      g.fillStyle = '#c4475f'; g.beginPath(); g.moveTo(25, 116); g.lineTo(110, 40); g.lineTo(195, 116); g.closePath(); g.fill();
      g.fillRect(140, 52, 22, 46);
      g.fillStyle = '#7e2f5e'; g.fillRect(96, 160, 30, 50);
      g.fillStyle = '#5a2350'; g.fillRect(62, 132, 26, 24); g.fillRect(136, 132, 26, 24);
    }, { top: 40, shadeLen: 200, shadowBlur: 16, shadowY: 6, shadowX: 6 });
  }

  function bakeBanner() {
    const w = 980, h = 330;
    const banner = bake(w, h, '#fff3e0', g => {
      g.beginPath();
      // 主带
      g.moveTo(80, 40); for (let x = 80; x <= 900; x += 10) g.lineTo(x, 40 + jag(x, 70) + 6 * Math.sin(x * 0.01)); g.lineTo(900, 240);
      for (let x = 900; x >= 80; x -= 10) g.lineTo(x, 240 + jag(x, 71) + 6 * Math.sin(x * 0.01)); g.closePath(); g.fill();
      // 两端燕尾
      g.fillStyle = '#f5d9bd';
      g.beginPath(); g.moveTo(20, 80); g.lineTo(100, 80); g.lineTo(100, 280); g.lineTo(20, 280); g.lineTo(55, 180); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(960, 80); g.lineTo(880, 80); g.lineTo(880, 280); g.lineTo(960, 280); g.lineTo(925, 180); g.closePath(); g.fill();
    }, { top: 40, shadeLen: 260, shadowBlur: 30, shadowY: 14, shadowColor: 'rgba(110,30,50,0.45)' });
    const strip = bake(660, 120, '#7a2f63', g => { g.beginPath(); g.moveTo(20, 30); for (let x = 20; x <= 640; x += 10) g.lineTo(x, 30 + jag(x, 80)); g.lineTo(640, 92); for (let x = 640; x >= 20; x -= 10) g.lineTo(x, 92 + jag(x, 81)); g.closePath(); g.fill(); },
      { top: 30, shadeLen: 60, shadowBlur: 16, shadowY: 8, edgeColor: 'rgba(255,200,200,0.4)' });
    const badge = bake(260, 260, '#e9604f', g => { g.beginPath(); for (let a = 0; a <= S.TAU + 0.01; a += 0.03) { const rr = 105 + jag(a * 90, 90) + 3 * Math.sin(a * 14); a ? g.lineTo(130 + Math.cos(a) * rr, 130 + Math.sin(a) * rr) : g.moveTo(130 + rr, 130); } g.fill(); },
      { top: 25, shadeLen: 210, shadowBlur: 24, shadowY: 10 });
    return { banner, strip, badge };
  }

  // 剪纸字：单字烘焙（带纹理和投影）
  function bakeGlyph(ch, font, color, size) {
    const g0 = document.createElement('canvas').getContext('2d'); g0.font = font; const tw = Math.ceil(g0.measureText(ch).width);
    const w = tw + 60, h = Math.ceil(size * 1.5) + 40;
    const c = bake(w, h, color, g => { g.font = font; g.textBaseline = 'alphabetic'; g.fillText(ch, 30, 20 + size * 1.12); },
      { top: 20, shadeLen: size * 1.2, shadowBlur: 10, shadowY: 7, shadowX: 4, shadowColor: 'rgba(90,20,40,0.5)' });
    return { c, w, h, tw, base: 20 + size * 1.12 };
  }

  function init() {
    BAKED = {}; BAKED.fibre = fibreTexture();
    // 天空
    const sky = document.createElement('canvas'); sky.width = W + 2 * M; sky.height = H; const sg = sky.getContext('2d');
    const gr = sg.createLinearGradient(0, 0, 0, 1150);
    gr.addColorStop(0, '#f4876f'); gr.addColorStop(0.45, '#ffb27d'); gr.addColorStop(1, '#ffe2a8');
    sg.fillStyle = gr; sg.fillRect(0, 0, sky.width, H);
    sg.globalAlpha = 0.5; sg.fillStyle = sg.createPattern(BAKED.fibre, 'repeat'); sg.fillRect(0, 0, sky.width, H); sg.globalAlpha = 1;
    BAKED.sky = sky;
    BAKED.sun = bakeSun();
    BAKED.hills = bakeHills();
    BAKED.clouds = [bakeCloud(11, 260), bakeCloud(12, 200), bakeCloud(13, 320), bakeCloud(14, 170)];
    BAKED.house = bakeHouse();
    Object.assign(BAKED, bakeBanner());
    const f = S.F(150, 'NotoSansSC', 900);
    BAKED.zh = [...'纸雕层叠'].map(ch => bakeGlyph(ch, f, '#5a2350', 150));
    BAKED.num = [...'21'].map(ch => bakeGlyph(ch, S.F(118, 'ArchivoBlack'), '#fff3e0', 118));
    BAKED.en = bakeGlyph('LAYERED  PAPER-CUT', S.F(40, 'ArchivoBlack'), '#ffe7d2', 40);
    // 前景画框（立体纸盒的边）
    BAKED.frame = bake(W + 2 * M, H + 2 * M, '#3e1d48', g => {
      g.beginPath(); g.rect(0, 0, W + 2 * M, H + 2 * M);
      g.moveTo(M + 34, M + 34); g.lineTo(M + 34, M + H - 34); g.lineTo(M + W - 34, M + H - 34); g.lineTo(M + W - 34, M + 34); g.closePath();
      g.fill('evenodd');
    }, { top: 0, shadeLen: H, shadowBlur: 40, shadowY: 0, shadowColor: 'rgba(40,5,30,0.7)' });
  }

  function draw(ctx, t) {
    const { E, seg, clamp, lerp } = S;
    if (!BAKED) init();
    const camX = (t - 2) * 9, camY = (t - 2) * -2;
    ctx.save();
    // 天空
    ctx.drawImage(BAKED.sky, Math.round(-M - camX * 0.05), 0);
    // 太阳缓缓升起
    const sunY = lerp(1080, 735, E.inOut2(seg(t, -0.6, 4.4))), sunX = 560 - camX * 0.1, sun = BAKED.sun;
    ctx.drawImage(sun, Math.round(sunX - sun.width / 2), Math.round(sunY - sun.height / 2));
    // 云
    const CL = [[150, 610, 0], [900, 670, 1], [330, 830, 3], [980, 900, 2]];
    CL.forEach(([x, y, k], i) => { const c = BAKED.clouds[k]; const xx = x + t * (8 + i * 4) - camX * (0.12 + i * 0.03) - c.width / 2; ctx.drawImage(c, Math.round(xx), Math.round(y - c.height / 2 + Math.sin(t * 1.3 + i) * 4)); });

    // 山丘层：在节拍（八分音符）上逐层弹起，立体书式翻起
    BAKED.hills.forEach(({ c, y0, L }, i) => {
      const land = -0.5 + i * 0.25;   // 每半拍落下一层
      const k = seg(t, land - 0.45, land);
      const e = land <= -0.35 ? 1 : (k >= 1 ? 1 : E.outBack(k, 1.9));
      if (k <= 0 && land > -0.35) return;
      const after = t - land, settle = after > 0 ? Math.exp(-after * 7) * Math.sin(after * 22) * 6 : 0;
      const dy = (1 - e) * 820 + settle, sy = lerp(0.55, 1, clamp(e));
      const x = -M - camX * L.depth, y = y0 - camY * L.depth;
      if (sy >= 0.999) ctx.drawImage(c, Math.round(x), Math.round(y + dy));
      else { ctx.save(); ctx.translate(0, y + c.height + dy); ctx.scale(1, sy); ctx.drawImage(c, x, -c.height); ctx.restore(); }
      // 小屋：第 4 层，1.5 拍点翻折立起，2.0 窗灯亮
      if (L.house) {
        const hk = seg(t, 1.25, 1.6), he = hk <= 0 ? 0 : E.outBack(hk, 2.2);
        if (he > 0) {
          const hx = 760, hb = ridge(L, hx) + 6, hc = BAKED.house;
          ctx.save(); ctx.translate(hx + x + M, hb - camY * L.depth + dy); ctx.scale(1, he * sy);
          ctx.drawImage(hc, -hc.width / 2, -hc.height + 22);
          const lit = clamp((t - 2.0) * 6);
          if (lit > 0) {
            ctx.fillStyle = `rgba(255,214,120,${lit})`; ctx.fillRect(-48, -96, 26, 24); ctx.fillRect(26, -96, 26, 24);
            const gw = ctx.createRadialGradient(0, -85, 4, 0, -85, 110); gw.addColorStop(0, `rgba(255,200,110,${0.35 * lit})`); gw.addColorStop(1, 'rgba(255,200,110,0)');
            ctx.fillStyle = gw; ctx.fillRect(-110, -195, 220, 220);
          }
          // 炊烟：纸片小圆依次升起
          for (let q = 0; q < 4; q++) {
            const ph = ((t - 1.6) * 0.9 + q * 0.25) % 1; if (t < 1.6) break;
            const r = 9 + ph * 16;
            ctx.fillStyle = `rgba(255,243,226,${0.85 * (1 - ph)})`; ctx.beginPath(); ctx.arc(41 + Math.sin(ph * 5) * 10, -170 - ph * 120, r, 0, S.TAU); ctx.fill();
          }
          ctx.restore();
        }
      }
    });

    // 纸鸟
    for (let b = 0; b < 4; b++) {
      const bt = t - 1.7 - b * 0.18; if (bt < 0) continue;
      const x = -80 - b * 70 + bt * (300 + b * 25), y = 830 - (b % 2) * 50 - b * 14 - bt * 40 + Math.sin(bt * 3 + b) * 12, fl = Math.sin(bt * 14 + b * 2);
      ctx.save(); ctx.translate(x, y); ctx.scale(1.7 - b * 0.16, 1.7 - b * 0.16);
      ctx.fillStyle = 'rgba(90,20,50,0.25)'; ctx.beginPath(); ctx.moveTo(-26 + 4, 6 + fl * 12); ctx.lineTo(4, 14); ctx.lineTo(30 + 4, 6 + fl * 12); ctx.lineTo(4, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a2350'; ctx.beginPath(); ctx.moveTo(-26, -2 + fl * 12); ctx.lineTo(0, 6); ctx.lineTo(30, -2 + fl * 12); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // ---------- 标题：纸带 + 剪纸字 ----------
    {
      const bk = seg(t, -0.4, 0.15), be = bk >= 1 ? 1 : E.outBack(bk, 1.5);
      const bx = 50 - camX * 0.02, by = 205;
      ctx.save(); ctx.translate(bx + 490, by + 40); ctx.scale(1, Math.max(0.001, be)); ctx.translate(-490, -40);
      ctx.drawImage(BAKED.banner, 0, 0);
      ctx.restore();
      // 中文：逐字落下贴上
      const glyphs = BAKED.zh; let gx = 290;
      glyphs.forEach((gl, i) => {
        const k = seg(t, -0.05 + i * 0.1, 0.3 + i * 0.1), e = k >= 1 ? 1 : E.outBack(k, 2.4);
        if (k > 0) {
          const rot = [-0.04, 0.03, -0.02, 0.04][i] * (1 + (1 - e) * 4);
          ctx.save(); ctx.translate(bx + gx + gl.tw / 2, by + 165 + (1 - e) * -60); ctx.rotate(rot); ctx.scale(e, e); ctx.globalAlpha = clamp(k * 4);
          ctx.drawImage(gl.c, -gl.tw / 2 - 30, -gl.base); ctx.restore();
        }
        gx += gl.tw + 8;
      });
      // 编号徽章
      const nk = seg(t, -0.3, 0.2), ne = nk >= 1 ? 1 : E.outBack(nk, 2);
      if (nk > 0) {
        ctx.save(); ctx.translate(bx + 165, by + 140); ctx.rotate(-0.08 + (1 - ne) * 0.6); ctx.scale(ne, ne);
        ctx.drawImage(BAKED.badge, -130, -130);
        const n0 = BAKED.num[0], n1 = BAKED.num[1], tot = n0.tw + n1.tw + 2;
        ctx.drawImage(n0.c, -tot / 2 - 30, -n0.base + 44); ctx.drawImage(n1.c, -tot / 2 + n0.tw + 2 - 30, -n1.base + 44);
        ctx.restore();
      }
      // 英文纸条
      const ek = seg(t, 0.25, 0.65), ee = E.out3(ek);
      if (ek > 0) {
        ctx.save(); ctx.translate(bx + 300 + (1 - ee) * -80, by + 268); ctx.rotate(0.015); ctx.globalAlpha = clamp(ek * 3);
        ctx.drawImage(BAKED.strip, -20, -30);
        ctx.drawImage(BAKED.en.c, 30 - 30, 61 - BAKED.en.base - 30 + 12);
        ctx.restore();
      }
    }
    // 前景画框
    { const f = BAKED.frame, B = 170;   // 只画四条边带，省掉中间透明区域
      ctx.drawImage(f, 0, 0, f.width, B, -M, -M, f.width, B); ctx.drawImage(f, 0, f.height - B, f.width, B, -M, H + M - B, f.width, B);
      ctx.drawImage(f, 0, B, B, f.height - 2 * B, -M, B - M, B, f.height - 2 * B); ctx.drawImage(f, f.width - B, B, B, f.height - 2 * B, W + M - B, B - M, B, f.height - 2 * B); }
    ctx.restore();
  }

  registerScene({
    n: 21, key: 'papercut', zh: '纸雕层叠', en: 'Layered Paper-cut',
    bg: '#ffb27d', accent: '#8d3a70',
    init: async () => { if (document.fonts && document.fonts.ready) await document.fonts.ready; init(); },
    draw(ctx, t) { draw(ctx, t); },
  });
})();
