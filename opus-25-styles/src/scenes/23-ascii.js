// 23 · 字符画终端：严格字符网格（18×34）上的磷光绿终端。打字的命令行、方块字横幅、VT100 倍高倍宽标题、
// 真 3D（逐格 z-buffer）的 donut.c 旋转圆环、扫描线、辉光与暗角。
(function () {
  const W = 1080, H = 1920, CW = 18, CH = 34, COLS = 60, ROWS = 56;
  const CPU = { willReadFrequently: true };
  const GREEN = '#33ff66', DIM = '#139a3c', FAINT = '#0b5a24', AMBER = '#ffb000', BG = '#020b05';
  const RAMP = '.,-~:;=!*#$@';
  const FONT = S => S.F(30, 'JetBrainsMono');

  let banner = null, scan = null, vig = null, cols = null;

  // 用大字渲染「23」，按每格覆盖率映射到 █▓▒░
  function makeBanner(S) {
    const bc = 40, br = 10, sx = 6, sy = 11, c = document.createElement('canvas');
    c.width = bc * sx; c.height = br * sy; const g = c.getContext('2d', CPU);
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = S.F(136, 'ArchivoBlack'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(c.width / 2, c.height / 2 + 6); g.scale(1.16, 1); g.fillText('23', 0, 0); g.restore();
    const d = g.getImageData(0, 0, c.width, c.height).data, out = [];
    for (let r = 0; r < br; r++) {
      let line = '';
      for (let q = 0; q < bc; q++) {
        let s = 0; for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) s += d[((r * sy + y) * c.width + q * sx + x) * 4];
        const v = s / (sx * sy * 255);
        line += v > 0.6 ? '@' : v > 0.36 ? '#' : v > 0.16 ? '+' : ' ';
      }
      out.push(line);
    }
    return out;
  }
  function makeStatics() {
    scan = document.createElement('canvas'); scan.width = W; scan.height = H; const g = scan.getContext('2d', CPU);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(0, y + 2, W, 2); }
    for (let x = 0; x < W; x += 3) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 2, 0, 1, H); }
    vig = document.createElement('canvas'); vig.width = W; vig.height = H; const v = vig.getContext('2d', CPU);
    const rg = v.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.68);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(0.7, 'rgba(0,0,0,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0.9)');
    v.fillStyle = rg; v.fillRect(0, 0, W, H);
    // 圆角屏框
    v.fillStyle = '#000'; v.beginPath(); v.rect(0, 0, W, H); v.roundRect(10, 10, W - 20, H - 20, 70); v.fill('evenodd');
    // 玻璃弧面高光
    const gl = v.createLinearGradient(0, 0, W * 0.6, H * 0.35);
    gl.addColorStop(0, 'rgba(180,255,200,0.07)'); gl.addColorStop(1, 'rgba(180,255,200,0)');
    v.fillStyle = gl; v.beginPath(); v.ellipse(W * 0.3, H * 0.12, W * 0.55, H * 0.16, -0.3, 0, Math.PI * 2); v.fill();
    // 亮度 → 颜色（暗绿 → 磷光绿 → 近白）
    cols = { g: [], a: [] };
    for (let i = 0; i < 12; i++) {
      const k = i / 11;
      cols.g.push(`rgb(${Math.round(20 + 170 * k * k)},${Math.round(110 + 145 * Math.sqrt(k))},${Math.round(50 + 150 * k * k)})`);
      cols.a.push(`rgb(${Math.round(150 + 105 * Math.sqrt(k))},${Math.round(70 + 150 * k)},${Math.round(10 + 120 * k * k)})`);
    }
  }

  // 逐字放在网格上
  function put(g, text, col, row, color, scale = 1) {
    g.fillStyle = color;
    let c = col;
    for (const ch of text) {
      const wide = ch.charCodeAt(0) > 0x2e80;
      if (ch !== ' ') {
        if (wide) { g.font = `500 ${Math.round(30 * scale * 1.0)}px "NotoSansSCM", "NotoSansSC", sans-serif`; }
        else g.font = scale === 1 ? cur.font : `${Math.round(30 * scale)}px "JetBrainsMono", "NotoSansSC", monospace`;
        g.fillText(ch, (c + (wide ? 1 : 0.5) * scale) * CW, (row + 0.55 * scale) * CH);
      }
      c += (wide ? 2 : 1) * scale;
    }
    return c;
  }
  const cur = { font: '' };

  // donut.c：圆环在格子里的投影 + z-buffer + 亮度字符
  function donut(A, B, gc, gr) {
    const out = new Int8Array(gc * gr).fill(-1), zb = new Float32Array(gc * gr);
    const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
    const R1 = 1, R2 = 2, K2 = 5, K1x = gc * K2 * 3 / (8 * (R1 + R2)) * 1.0, K1y = K1x * CW / CH;
    for (let th = 0; th < 6.283; th += 0.05) {
      const ct = Math.cos(th), st = Math.sin(th);
      for (let ph = 0; ph < 6.283; ph += 0.014) {
        const cp = Math.cos(ph), sp = Math.sin(ph);
        const cx = R2 + R1 * ct, cy = R1 * st;
        const x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB;
        const y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB;
        const ooz = 1 / (K2 + cA * cx * sp + cy * sA);
        const xp = Math.floor(gc / 2 + K1x * ooz * x), yp = Math.floor(gr / 2 - K1y * ooz * y);
        if (xp < 0 || xp >= gc || yp < 0 || yp >= gr) continue;
        const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
        const o = yp * gc + xp;
        if (ooz > zb[o]) { zb[o] = ooz; out[o] = L > 0 ? Math.min(11, Math.floor(L * 8)) : 0; }
      }
    }
    return out;
  }

  const CMD = './render --style ascii --id 23';
  const LOGS = [
    ['[ ok ]', ' charset ', RAMP],
    ['[ ok ]', ' z-buffer ', '52x22 · 30fps'],
    ['[ >> ]', ' spin torus ', 'R1=1 R2=2 K2=5'],
  ];
  const HEX = '0123456789abcdef';

  registerScene({
    n: 23, key: 'ascii', zh: '字符画终端', en: 'ASCII Terminal',
    bg: BG, accent: GREEN,
    init: async (S) => { banner = makeBanner(S); makeStatics(); },
    draw(ctx, t, S) {
      const M = S.layer('s23-main', W, H), g = M.getContext('2d', CPU);
      g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = BG; g.fillRect(0, 0, W, H);
      cur.font = FONT(S); g.font = cur.font; g.textAlign = 'center'; g.textBaseline = 'middle';
      const blink = Math.floor(t * 4) % 2 === 0, fr = Math.max(0, Math.round((t + 0.4) * 30));
      // 第二小节强拍：整行错位 + 琥珀高亮
      const glitch = t >= 2 && t < 2.1, amber = t >= 2 && t < 2.5;

      // 顶栏
      g.fillStyle = '#0a3a18'; g.fillRect(0, 0, W, CH * 1.6);
      put(g, '● ● ●', 2, 0.25, DIM);
      put(g, 'tty23 — ascii@opus: ~/styles — 60×56', 13, 0.25, GREEN);
      // 上一条命令的残留（t≤0 也不空）
      put(g, '$ ./render --style neon --id 22', 3, 3, FAINT);
      put(g, '[done] 22 neon  4.00s  120 frames', 3, 4, FAINT);

      // 命令行：t 0→0.3 打完，0.3 回车
      const typed = t < 0 ? 0 : Math.min(CMD.length, Math.floor(t / 0.3 * CMD.length));
      let c = put(g, '$ ', 3, 6, AMBER);
      c = put(g, CMD.slice(0, typed), c, 6, GREEN);
      if (t < 0.32 && blink || t < 0) { g.fillStyle = GREEN; g.fillRect(c * CW + 1, 6 * CH + 3, CW - 2, CH - 6); }

      // 方块字横幅「23」：逐行打印
      const bRows = t < 0.3 ? 0 : Math.min(banner.length, Math.floor((t - 0.3) / 0.025) + 1);
      const bc0 = Math.floor((COLS - banner[0].length) / 2);
      for (let r = 0; r < bRows; r++) {
        const row = 7.3 + r, sh = glitch ? Math.round((S.hash(r + fr) - 0.5) * 6) : 0;
        // 阴影（右下错一格的暗色）
        g.fillStyle = '#0a3a18';
        for (let q = 0; q < banner[r].length; q++) if (banner[r][q] !== ' ') g.fillText('/', (bc0 + q + 1.5 + sh) * CW, (row + 1 + 0.55) * CH);
        g.fillStyle = amber ? AMBER : ['#d8ffe0', '#b0ffc4', '#86ffa6', '#5cff86', '#44ff74', '#33ff66', '#2be85a', '#24d050', '#1eb846', '#19a03c'][r];
        for (let q = 0; q < banner[r].length; q++) { const ch = banner[r][q]; if (ch !== ' ') g.fillText(ch, (bc0 + q + 0.5 + sh) * CW, (row + 0.55) * CH); }
      }

      // 中文标题：VT100 倍高倍宽 ×3，逐字出现
      const zh = '字符画终端', zn = t < 0.34 ? 0 : Math.min(5, Math.floor((t - 0.34) / 0.05) + 1);
      if (t >= 0.34) {
        const row = 17.8, s = 2.6, c0 = (COLS - 14 * s) / 2, sh = glitch ? 2 : 0;
        put(g, '[', c0, row, AMBER, s);
        const cc = put(g, zh.slice(0, zn), c0 + 2 * s + sh, row, GREEN, s);
        if (zn < 5 && blink) { g.fillStyle = GREEN; g.fillRect(cc * CW, row * CH + 4, CW * s, CH * s - 8); }
        put(g, ']', c0 + 13 * s, row, AMBER, s);
      }
      // 英文名：倍宽
      const en = 'ASCII TERMINAL', ek = t < 0.45 ? 0 : Math.min(en.length, Math.floor((t - 0.45) / 0.012) + 1);
      if (ek > 0) { const s = 2; put(g, '> ' + en.slice(0, ek), (COLS - (en.length + 2) * s) / 2, 20.9, amber ? AMBER : '#9dffb8', s); }

      // 日志：按拍子一行一行刷出来
      LOGS.forEach(([tag, k, v], i) => {
        if (t < 0.5 + i * 0.5) return;
        const row = 23.3 + i;
        let cc = put(g, tag, 4, row, i === 2 ? AMBER : GREEN);
        cc = put(g, k, cc, row, DIM);
        put(g, v, cc, row, i === 0 ? '#9dffb8' : GREEN);
      });

      // 旋转圆环（逐格 z-buffer）
      const gc = 52, gr = 20, gx0 = 4, gy0 = 26.6;
      if (t > 0.45) {
        const appear = S.clamp((t - 0.45) / 0.4), spin = t + 0.6 * S.E.outExpo(S.clamp((t - 2) / 0.6));
        const A = 0.9 + spin * 1.6, B = 0.4 + spin * 0.7;
        const D = donut(A, B, gc, gr), pz = S.pulse(t, 7);
        const pal = amber ? cols.a : cols.g;
        for (let r = 0; r < gr; r++) {
          if (r / gr > appear * 1.05) break;
          const sh = glitch ? Math.round((S.hash(r * 3 + fr) - 0.5) * 4) : 0;
          for (let q = 0; q < gc; q++) {
            const v = D[r * gc + q]; if (v < 0) continue;
            const li = Math.min(11, v + (pz > 0.4 ? 1 : 0));
            g.fillStyle = pal[li];
            g.fillText(RAMP[v], (gx0 + q + 0.5 + sh) * CW, (gy0 + r + 0.55) * CH);
          }
        }
      } else {
        // 等待中：转圈的加载符
        put(g, ['|', '/', '-', '\\'][((Math.floor(t * 12) % 4) + 4) % 4] + ' loading torus…', 22, 36, DIM);
      }

      // 状态栏
      const pr = S.clamp((t - 0.5) / 3.2), bars = Math.round(pr * 16);
      let cc = put(g, `frame ${String(fr).padStart(4, '0')} `, 3, 47.5, DIM);
      cc = put(g, '█'.repeat(bars), cc, 47.5, GREEN);
      cc = put(g, '░'.repeat(16 - bars), cc, 47.5, FAINT);
      put(g, ` ${String(Math.round(pr * 100)).padStart(3, ' ')}%`, cc, 47.5, GREEN);
      if (t > 0.32 && blink) { g.fillStyle = GREEN; g.fillRect(56 * CW, 47.5 * CH + 3, CW - 2, CH - 6); }
      // 底部滚动的十六进制转储（装饰，被界面遮住也无妨）
      for (let r = 0; r < 6; r++) {
        const line = Math.floor(t * 10) + r, row = 49.2 + r;
        let s = (0x2300 + line * 16).toString(16).padStart(6, '0') + '  ';
        for (let k = 0; k < 12; k++) s += HEX[Math.floor(S.hash(line * 13 + k) * 16)] + HEX[Math.floor(S.hash(line * 7 + k * 3) * 16)] + ' ';
        put(g, s, 3, row, r === 5 ? DIM : FAINT);
      }
      // 刷新带：一条亮线往下扫
      const sy = ((t * 0.9) % 1.2) * H;
      const sg = g.createLinearGradient(0, sy - 160, 0, sy);
      sg.addColorStop(0, 'rgba(60,255,120,0)'); sg.addColorStop(1, 'rgba(60,255,120,0.06)');
      g.fillStyle = sg; g.fillRect(0, sy - 160, W, 160);

      // 辉光：缩小→再缩小→放大叠加
      const G1 = S.layer('s23-g1', 270, 480), g1 = G1.getContext('2d', CPU);
      g1.globalCompositeOperation = 'source-over'; g1.imageSmoothingEnabled = true; g1.imageSmoothingQuality = 'high';
      g1.drawImage(M, 0, 0, 270, 480);
      const G2 = S.layer('s23-g2', 135, 240), g2 = G2.getContext('2d', CPU);
      g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high'; g2.drawImage(G1, 0, 0, 135, 240);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.55; g.drawImage(G1, 0, 0, W, H);
      g.globalAlpha = 0.7; g.drawImage(G2, 0, 0, W, H);
      g.globalAlpha = 1;
      // 扫描线 + 暗角 + 闪烁
      g.globalCompositeOperation = 'multiply'; g.drawImage(scan, 0, 0);
      g.globalCompositeOperation = 'source-over';
      const fl = 0.04 + 0.04 * S.hash(fr * 1.7);
      g.fillStyle = `rgba(0,0,0,${fl})`; g.fillRect(0, 0, W, H);
      g.drawImage(vig, 0, 0);
      g.restore();
      ctx.drawImage(M, 0, 0);
    },
  });
})();
