// 20 孔版印刷 Risograph Print —— 三色专色（荧光粉 / 中蓝 / 黄）正片叠底套印：窗边的猫与龟背竹。
// 每个色版各自一层：矢量 + 网点 → 油墨颗粒/不均匀覆盖 → multiply 叠印，带套准偏移；动画一拍二（15fps 步进）。
(function () {
  const PAPER = '#f3eee2', PINK = '#ff48b0', BLUE = '#0078bf', YEL = '#ffe800';
  const TAU = Math.PI * 2, SW = { willReadFrequently: true };
  const INK = { Y: YEL, B: BLUE, P: PINK };
  let paper = null; const tex = {};

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const outBack = (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
  const out3 = k => 1 - Math.pow(1 - k, 3);
  const step = t => Math.floor(t * 15 + 1e-6) / 15;   // 一拍二：15fps 步进

  // ---------- 网点 ----------
  // 在当前路径/区域内按 density(x,y)∈[0,1] 画旋转网格网点
  function halftone(g, x0, y0, x1, y1, cell, ang, dens) {
    const ca = Math.cos(ang), sa = Math.sin(ang), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + cell;
    g.beginPath();
    for (let v = -R; v <= R; v += cell) for (let u = -R; u <= R; u += cell) {
      const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
      if (x < x0 - cell || x > x1 + cell || y < y0 - cell || y > y1 + cell) continue;
      const d = dens(x, y); if (d <= 0.02) continue;
      const r = cell * 0.56 * Math.sqrt(Math.min(1, d));
      g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
    }
    g.fill();
  }

  // ---------- 插画几何 ----------
  const SUN = { x: 560, y: 800, r: 270 };
  function archPath(g, inset = 0) { // 拱形窗
    const x0 = 150 + inset, x1 = 930 - inset, yb = 1290, r = (x1 - x0) / 2, yc = 520 + inset + r;
    g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, yc); g.arc((x0 + x1) / 2, yc, r, Math.PI, TAU); g.lineTo(x1, yb); g.closePath();
  }
  function catPath(g, tq) {
    g.beginPath();
    g.moveTo(612, 1290); g.bezierCurveTo(588, 1160, 636, 1010, 690, 972); g.lineTo(778, 972);   // 身体（梨形）
    g.bezierCurveTo(852, 1012, 902, 1170, 874, 1290); g.closePath();
    g.moveTo(820, 905); g.arc(730, 905, 90, 0, TAU);               // 头
    // 耳朵
    g.moveTo(662, 860); g.lineTo(668, 760); g.lineTo(722, 822); g.closePath();
    g.moveTo(752, 818); g.lineTo(808, 762); g.lineTo(812, 860); g.closePath();
  }
  function tail(g, tq) {
    const sw = Math.sin(tq * 5.2) * 40 + (tq > 2.5 && tq < 2.9 ? Math.sin((tq - 2.5) * 16) * 50 : 0);
    g.beginPath(); g.moveTo(850, 1272);
    g.bezierCurveTo(950, 1290, 990, 1190, 960 + sw * 0.4, 1110);
    g.bezierCurveTo(925 + sw, 1050, 900 + sw, 1030, 905 + sw * 1.2, 990);
    g.stroke();
  }
  // 龟背竹叶：心形 + 开裂（destination-out 切口）
  const LEAVES = [[300, 900, 105, -0.5], [210, 1030, 92, -1.1], [410, 1000, 96, 0.35], [330, 760, 80, -0.05], [450, 860, 70, 0.7]];
  function leafPath(g, x, y, s, a) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s / 100, s / 100);
    g.moveTo(0, 95); g.bezierCurveTo(-120, 40, -110, -90, -10, -80); g.lineTo(0, -60); g.lineTo(10, -80); g.bezierCurveTo(110, -90, 120, 40, 0, 95);
    g.restore();
  }
  function leafSway(i, tq) { return Math.sin(tq * 3 + i * 1.7) * 0.06; }

  // ---------- 每个色版的内容 ----------
  // ink: 'Y' | 'B' | 'P'；part: 'ill'（插画）| 'title'
  function drawInk(g, ink, part, tq, t) {
    g.fillStyle = INK[ink]; g.strokeStyle = INK[ink];
    if (part === 'title') return drawTitle(g, ink, t);
    if (ink === 'Y') {
      // 太阳
      g.beginPath(); g.arc(SUN.x, SUN.y, SUN.r, 0, TAU); g.fill();
      // 叶片高光网点（叠蓝 → 绿）
      g.save(); g.beginPath(); LEAVES.forEach(([x, y, s, a], i) => leafPath(g, x, y, s, a + leafSway(i, tq))); g.clip();
      halftone(g, 90, 640, 560, 1150, 12, 0.3, (x, y) => 0.25 + 0.75 * clamp((1100 - y) / 420));
      g.restore();
      // 花盆（叠粉 → 橙红）
      g.beginPath(); g.moveTo(222, 1110); g.lineTo(438, 1110); g.lineTo(412, 1290); g.lineTo(248, 1290); g.closePath(); g.fill();
      // 猫眼
      if (!(tq >= 3.0 && tq < 3.14)) { g.beginPath(); g.ellipse(700, 905, 20, 13, 0, 0, TAU); g.ellipse(768, 905, 20, 13, 0, 0, TAU); g.fill(); }
      // 窗台下沿
      g.fillRect(90, 1322, 900, 10);
      return;
    }
    if (ink === 'B') {
      // 拱窗：双线
      g.lineWidth = 12; archPath(g, 0); g.stroke(); g.lineWidth = 4; archPath(g, 26); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(540, 520); g.lineTo(540, 1290); g.moveTo(150, 720); g.lineTo(930, 720); g.stroke();
      // 窗台
      g.fillRect(90, 1290, 900, 34);
      // 叶 + 茎
      g.lineWidth = 9; g.lineCap = 'round';
      LEAVES.forEach(([x, y, s, a], i) => { g.beginPath(); g.moveTo(330, 1110); g.quadraticCurveTo(330 + (x - 330) * 0.2, y + 120, x, y + s * 0.6); g.stroke(); });
      g.beginPath(); LEAVES.forEach(([x, y, s, a], i) => leafPath(g, x, y, s, a + leafSway(i, tq))); g.fill();
      // 开裂切口
      g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 9;
      LEAVES.forEach(([x, y, s, a], i) => {
        g.save(); g.translate(x, y); g.rotate(a + leafSway(i, tq)); g.scale(s / 100, s / 100);
        for (const k of [-1, 1]) for (let j = 0; j < 3; j++) { g.beginPath(); g.moveTo(k * 100, -40 + j * 40); g.lineTo(k * 38, -30 + j * 34); g.stroke(); }
        g.beginPath(); g.moveTo(0, 80); g.lineTo(0, -50); g.lineWidth = 5; g.stroke(); g.lineWidth = 9;
        g.restore();
      });
      g.restore();
      // 猫的阴影网点（叠粉 → 紫）
      g.save(); catPath(g, tq); g.clip();
      halftone(g, 600, 800, 900, 1300, 11, 0.8, (x, y) => clamp((x - 690) / 170) * 0.9 + clamp((y - 1150) / 200) * 0.5);
      g.restore();
      // 猫瞳孔 + 胡须
      if (!(tq >= 3.0 && tq < 3.14)) { g.beginPath(); g.ellipse(704, 905, 5, 12, 0, 0, TAU); g.ellipse(772, 905, 5, 12, 0, 0, TAU); g.fill(); }
      else { g.lineWidth = 5; g.beginPath(); g.moveTo(682, 905); g.lineTo(718, 905); g.moveTo(750, 905); g.lineTo(786, 905); g.stroke(); }
      g.lineWidth = 3; g.beginPath(); g.moveTo(690, 945); g.lineTo(610, 935); g.moveTo(690, 952); g.lineTo(612, 962); g.moveTo(775, 945); g.lineTo(850, 932); g.moveTo(775, 952); g.lineTo(852, 960); g.stroke();
      // 地面网点渐变
      halftone(g, 90, 1326, 990, 1352, 10, 0.25, (x, y) => 0.55 - (y - 1326) / 60);
      return;
    }
    if (ink === 'P') {
      // 猫
      catPath(g, tq); g.fill();
      g.lineWidth = 46; g.lineCap = 'round'; tail(g, tq);
      // 花盆
      g.beginPath(); g.moveTo(222, 1110); g.lineTo(438, 1110); g.lineTo(412, 1290); g.lineTo(248, 1290); g.closePath(); g.fill();
      g.fillRect(206, 1100, 248, 36);
      // 太阳下半网点（叠黄 → 橙）
      g.save(); g.beginPath(); g.arc(SUN.x, SUN.y, SUN.r, 0, TAU); g.clip();
      halftone(g, SUN.x - SUN.r, SUN.y - SUN.r, SUN.x + SUN.r, SUN.y + SUN.r, 13, 0.6, (x, y) => (y - SUN.y + 60) / (SUN.r + 60));
      g.restore();
      // 第二遍：天空网点（2.0 起滚筒自上而下印出）
      const sweep = clamp((t - 2.0) / 0.45);
      if (sweep > 0) {
        const yb = 520 + 780 * out3(sweep);
        g.save(); archPath(g, 26); g.clip(); g.beginPath(); g.rect(0, 0, 1080, yb); g.clip();
        halftone(g, 170, 540, 910, 1290, 15, 0.26, (x, y) => 0.55 - (y - 540) / 900 - (Math.hypot(x - SUN.x, y - SUN.y) < SUN.r + 30 ? 1 : 0));
        g.restore();
      }
    }
  }

  function drawTitle(g, ink, t) {
    if (ink === 'P') {
      g.font = '900 172px "NotoSansSC"'; g.textBaseline = 'alphabetic'; g.fillText('孔版印刷', 74, 372);
      g.font = '22px "JetBrainsMono"'; g.fillText('3-COLOUR STENCIL DUPLICATOR', 78, 516);
      // 色样
      g.beginPath(); g.arc(880, 248, 52, 0, TAU); g.fill();
      return;
    }
    if (ink === 'B') {
      g.font = '900 172px "NotoSansSC"'; g.textBaseline = 'alphabetic';
      g.save(); g.globalAlpha = 1; g.fillText('孔版印刷', 74 + 12, 372 + 10); g.restore();
      g.font = '50px "RubikMonoOne"'; g.fillText('RISOGRAPH PRINT', 76, 464);
      g.beginPath(); g.arc(920, 300, 52, 0, TAU); g.fill();
      g.font = '22px "JetBrainsMono"'; g.fillText('ZINE · VOL.20 · 2026', 640, 1486);
      g.fillText('粉·蓝·黄  3 INKS', 640, 1516);
      g.lineWidth = 3; g.strokeRect(632, 1374, 300, 154);
      return;
    }
    if (ink === 'Y') {
      g.beginPath(); g.arc(840, 300, 52, 0, TAU); g.fill();
      g.font = '300px "ArchivoBlack"'; g.textBaseline = 'alphabetic'; g.fillText('20', 66, 1540);
      g.font = '24px "JetBrainsMono"'; g.fillRect(632, 1374, 300, 66);
      return;
    }
  }

  // 粉色版里的 "20" 错版阴影 + 黄色"ISSUE"字
  function extraTitle(g, ink) {
    if (ink === 'P') { g.font = '300px "ArchivoBlack"'; g.lineWidth = 6; g.strokeText('20', 66 + 14, 1540 - 10); g.font = '30px "RubikMonoOne"'; g.fillText('ISSUE', 648, 1424); }
  }

  // ---------- 合成 ----------
  function inkLayer(S, ink, t, tq, offIll, offTitle) {
    const c = S.layer('s20-' + ink, S.W, S.H), g = c.getContext('2d', SW);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, S.W, S.H);
    g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.save(); g.translate(offIll[0], offIll[1]); drawInk(g, ink, 'ill', tq, t); g.restore();
    g.save(); g.translate(offTitle[0], offTitle[1]); g.fillStyle = INK[ink]; g.strokeStyle = INK[ink]; drawTitle(g, ink, t); extraTitle(g, ink); g.restore();
    // 油墨颗粒 + 不均匀覆盖
    g.globalCompositeOperation = 'destination-out'; g.drawImage(tex[ink], 0, 0, S.W, S.H);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // 每层的入场：从画外滑入，落在略不准的套准位置；之后每拍微小跳动（步进）
  const ENTRY = {
    Y: { ill: [-0.32, [-1200, 0]], title: [-0.25, [0, 700]], reg: [3, 2] },
    P: { ill: [0.18, [0, -1500]], title: [0.0, [1200, 0]], reg: [7, -4] },
    B: { ill: [0.68, [1200, 0]], title: [0.2, [-1200, 0]], reg: [-5, 6] },
  };
  function offset(ink, part, tq) {
    const [t0, from] = ENTRY[ink][part], reg = ENTRY[ink].reg;
    const k = clamp((tq - t0) / 0.33), e = outBack(k, 1.25);
    let jx = 0, jy = 0;
    if (tq >= 2.0) { const b = Math.floor(tq / 0.5); jx = (S.hash2(b, ink.charCodeAt(0)) - 0.5) * 12; jy = (S.hash2(ink.charCodeAt(0), b) - 0.5) * 10; }
    return [from[0] * (1 - e) + reg[0] + jx, from[1] * (1 - e) + reg[1] + jy];
  }

  registerScene({
    n: 20, key: 'riso', zh: '孔版印刷', en: 'Risograph Print',
    bg: PAPER, accent: PINK,
    init(S) {
      // 纸：底色 + 纤维 + 颗粒
      paper = document.createElement('canvas'); paper.width = S.W; paper.height = S.H;
      const g = paper.getContext('2d', SW), r = S.rng(2020);
      g.fillStyle = PAPER; g.fillRect(0, 0, S.W, S.H);
      const im = g.getImageData(0, 0, S.W, S.H), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      g.putImageData(im, 0, 0);
      for (let i = 0; i < 1400; i++) {
        const x = r() * S.W, y = r() * S.H, a = r() * TAU, l = 8 + r() * 30;
        g.strokeStyle = r() < 0.5 ? 'rgba(120,100,70,0.1)' : 'rgba(255,255,255,0.35)'; g.lineWidth = 0.8 + r();
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.8) * l * 0.5, y + Math.sin(a + 0.8) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
      // 每色版：半分辨率的擦除纹理（颗粒脱墨 + 大尺度不均 + 滚筒条纹）
      const w = S.W / 2, h = S.H / 2;
      ['Y', 'B', 'P'].forEach((ink, n) => {
        const c = document.createElement('canvas'); c.width = w; c.height = h; const cg = c.getContext('2d', SW);
        const id = cg.createImageData(w, h), q = id.data, rr = S.rng(77 + n * 13);
        const GW = 28, GH = 50, grid = new Float32Array((GW + 1) * (GH + 1)); for (let i = 0; i < grid.length; i++) grid[i] = rr();
        for (let y = 0; y < h; y++) {
          const gy = y / h * GH, iy = Math.floor(gy), fy = gy - iy, band = 0.5 + 0.5 * Math.sin(y * 0.09 + n * 2);
          for (let x = 0; x < w; x++) {
            const gx = x / w * GW, ix = Math.floor(gx), fx = gx - ix;
            const a = grid[iy * (GW + 1) + ix], b = grid[iy * (GW + 1) + ix + 1], c2 = grid[(iy + 1) * (GW + 1) + ix], d2 = grid[(iy + 1) * (GW + 1) + ix + 1];
            const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
            const low = (a + (b - a) * sx) + ((c2 + (d2 - c2) * sx) - (a + (b - a) * sx)) * sy;
            const f = rr();
            let e = Math.max(0, low - 0.45) * 0.55 + f * 0.16 + band * 0.04;
            if (f > 0.965) e = 0.75 + rr() * 0.25;
            const k = (y * w + x) * 4; q[k] = q[k + 1] = q[k + 2] = 0; q[k + 3] = Math.min(255, e * 255);
          }
        }
        cg.putImageData(id, 0, 0); tex[ink] = c;
      });
    },
    draw(ctx, t, S) {
      const tq = step(t);
      // 走纸抖动（2.0 拍）
      const d = tq - 2.0, shake = d >= 0 && d < 0.6 ? Math.exp(-6 * d) * Math.sin(d * 46) : 0;
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, S.W, S.H);
      ctx.save(); ctx.translate(shake * 6, shake * 26);
      ctx.drawImage(paper, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      for (const ink of ['Y', 'P', 'B']) {
        const L = inkLayer(S, ink, t, tq, offset(ink, 'ill', tq), offset(ink, 'title', tq));
        ctx.drawImage(L, 0, 0);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    },
  });
})();
