// 13 · 16-bit 像素风
// 全部画进 180×320 的像素缓冲（Uint32），统一 ×6 最近邻放大：视差卷轴、手绘精灵、棋盘格抖动、调色板硬切换。
// 最后用预计算的桶形映射表在 JS 里逐像素做 CRT（弧面、扫描线、荧光栅、暗角圆角），再叠一层泛光。
(function () {
  const LW = 180, LH = 320, OW = 1080, OH = 1920;
  const GY = 240;              // 地面顶
  const CX = 30;               // 主角 x
  const SPD = 56;              // 地面卷动速度（低分辨率像素/秒）
  const HIT = 2.0;             // 顶砖时刻（第二小节强拍）

  // ---------- 颜色 ----------
  const U32 = new Map();
  const c32 = h => { let v = U32.get(h); if (v === undefined) { const n = parseInt(h.slice(1), 16); v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16 & 255)) >>> 0; U32.set(h, v); } return v; };

  const PAL = [
    { // 白天
      sky: ['#3d7cf0', '#4f98ff', '#6cb2ff', '#8fcaff', '#b8e0ff'], sun: '#fff27a', sunHi: '#ffffff', cloud: '#ffffff', cloudSh: '#a9d2ff',
      far: ['#7a8ee0', '#5b6cc0', '#43509a'], snow: '#f4f8ff', hill: ['#6ad060', '#3c9a48', '#2a7438', '#1e5a2e'], tree: ['#2f9a46', '#1f7236', '#134d26', '#7a4a2a'],
      grass: ['#c8f86a', '#6fd040', '#3aa032'], dirt: ['#e0884a', '#b9622e', '#86401e', '#ffb070'], ink: '#1a1030', flower: '#ff6aa0',
      hud: '#ffffff', t1: ['#ffffff', '#fff27a', '#ffd23a', '#ff9a1a', '#e85a10'], t2: '#ffffff', box: '#2038a8', boxHi: '#4a6ae8',
    },
    { // 黄昏
      sky: ['#2a1650', '#5a2468', '#a8386a', '#ec6a50', '#ffb860'], sun: '#ffe066', sunHi: '#fff6c0', cloud: '#ffc08a', cloudSh: '#c45a6a',
      far: ['#8a4280', '#66306c', '#46204e'], snow: '#ffd0b0', hill: ['#a8486a', '#7a3058', '#5a2248', '#3a1434'], tree: ['#5a2448', '#3e1838', '#280e26', '#2a1020'],
      grass: ['#ffd070', '#e08a3a', '#a8502e'], dirt: ['#a8503a', '#7e3630', '#561e24', '#d27a4a'], ink: '#1a0818', flower: '#fff06a',
      hud: '#fff0c8', t1: ['#ffffff', '#ffe066', '#ffb040', '#ff7a2a', '#d0402a'], t2: '#fff0c8', box: '#5a1a48', boxHi: '#8a2a6a',
    },
    { // 夜晚
      sky: ['#040616', '#080c2a', '#0e1640', '#162258', '#203070'], sun: '#f2eec0', sunHi: '#ffffff', cloud: '#3a4c90', cloudSh: '#22306a',
      far: ['#26367a', '#1c2a5e', '#121c42'], snow: '#a8bcff', hill: ['#284a9a', '#1a3068', '#122452', '#0a173a'], tree: ['#10224e', '#0a1838', '#060e26', '#0a0a1e'],
      grass: ['#7ae0ff', '#2a8ae0', '#1a52a8'], dirt: ['#3a3a8a', '#2a2a6a', '#1a1848', '#5a5ab0'], ink: '#02020c', flower: '#9ef0ff',
      hud: '#c8f4ff', t1: ['#ffffff', '#c8f8ff', '#7ae0ff', '#3aa0ff', '#2a5ae0'], t2: '#c8f4ff', box: '#0a1a5a', boxHi: '#1a3aa0',
    },
  ];
  const palAt = t => t < 1 ? 0 : t < 2 ? 1 : 2;

  // ---------- 像素缓冲 ----------
  const buf = new Uint32Array(LW * LH);
  function rect(x, y, w, h, c) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(LW, (x + w) | 0), y1 = Math.min(LH, (y + h) | 0);
    if (x1 <= x0) return;
    for (let j = y0; j < y1; j++) buf.fill(c, j * LW + x0, j * LW + x1);
  }
  const px = (x, y, c) => { if (x >= 0 && x < LW && y >= 0 && y < LH) buf[y * LW + x] = c; };
  function shade(x, y, w, h, k) { // 变暗（影子）
    for (let j = Math.max(0, y); j < Math.min(LH, y + h); j++) for (let i = Math.max(0, x); i < Math.min(LW, x + w); i++) {
      const v = buf[j * LW + i]; buf[j * LW + i] = (0xff000000 | (((v >> 16 & 255) * k) << 16) | (((v >> 8 & 255) * k) << 8) | ((v & 255) * k)) >>> 0;
    }
  }
  function blit(rows, x, y, cmap, flip = false) {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j], yy = y + j; if (yy < 0 || yy >= LH) continue;
      for (let i = 0; i < r.length; i++) {
        const ch = r[flip ? r.length - 1 - i : i]; if (ch === '.') continue;
        const c = cmap[ch]; if (c !== undefined) px(x + i, yy, c);
      }
    }
  }
  const cmapOf = o => { const m = {}; for (const k in o) m[k] = c32(o[k]); return m; };

  // ---------- 手绘精灵（22×27 主角） ----------
  const HEAD = [
    '......kkkkkkkk........',
    '....kkrrrrrrrrkk......',
    '...krrrrrrrrrrrrk.....',
    '..krrrrrrwwwwrrrrk....',
    '..krrrrrwwrrwwrrrrk...',
    '..krrrrrwwrrwwrrrrrk..',
    '..kRRRRRRRRRRRRRRRRRRk',
    '..kRRkkkkkkkkkkkkkkkk.',
    '.knnnnsssssssskssk....',
    '.knnnssssssssskssssk..',
    '.knnssSssssssssssssk..',
    '..knnsSsssssssssssk...',
    '...kksssssssskkkkk....',
    '....kksssssssssk......',
    '......kkkkkkkkk.......',
  ];
  const BODY = {
    a: [
      '.....kkrrbbrrk........',
      '....krrrrbbbrrrk......',
      '...krrrrbbbbbrrrkk....',
      '..kssrrkbybbybkrrssk..',
      '..ksskkbbbbbbbbkkssk..',
      '...kk.kbbbbbbbbbk.kk..',
      '......kbbbbbbbbbbk....',
      '.....kbbbbk.kbbbbbk...',
      '....kbbbbk...kbbbbk...',
      '...knnnnk.....knnnnk..',
      '..knnnnnk.....knnnnnk.',
      '..kkkkkk.......kkkkkk.',
    ],
    b: [
      '.....kkrrbbrrk........',
      '....krrrrbbbrrk.......',
      '....krrrbbbbbrrk......',
      '....ksrkbybbybkk......',
      '....kssbbbbbbbbk......',
      '.....kkbbbbbbbbk......',
      '......kbbbbbbbbk......',
      '......kbbbkbbbk.......',
      '......kbbk.kbbk.......',
      '.....knnnk.knnnk......',
      '.....knnnnkknnnnk.....',
      '......kkkkk.kkkkk.....',
    ],
    c: [
      '.....kkrrbbrrk........',
      '....krrrrbbbrrrk......',
      '...krrrrbbbbbrrrk.....',
      '...krrrkbybbybkssk....',
      '...ksskbbbbbbbbkssk...',
      '....kkkbbbbbbbbbkk....',
      '......kbbbbbbbbbk.....',
      '.....kbbbbkkbbbbk.....',
      '....kbbbbk..kbbbk.....',
      '...knnnnk...knnnk.....',
      '...knnnnnk..knnnnk....',
      '....kkkkk....kkkkk....',
    ],
    j: [
      '.....kkrrbbrrk..kssk..',
      '....krrrrbbbrrkkssk...',
      '...kssrrbbbbbrrrkk....',
      '..ksskrkbybbybkk......',
      '...kk.kbbbbbbbbk......',
      '......kbbbbbbbbbk.....',
      '......kbbbbbbbbbbk....',
      '.....kbbbbk.kbbbbk....',
      '....kbbbk....kbbbk....',
      '...knnnnk....knnnk....',
      '...knnnk......knnnnk..',
      '....kk.........kkkk...',
    ],
  };
  const HERO_COL = [
    cmapOf({ k: '#1a1030', r: '#18b8a0', R: '#0a7a78', w: '#fff27a', n: '#3a2418', s: '#ffc890', S: '#e0905a', b: '#ff8a1a', y: '#ffffff' }),
    cmapOf({ k: '#1a0818', r: '#20c0a0', R: '#0a6a6a', w: '#ffe066', n: '#3a1a14', s: '#ffb080', S: '#d07050', b: '#ff7a3a', y: '#fff0c8' }),
    cmapOf({ k: '#02020c', r: '#2ad0c0', R: '#0a6a8a', w: '#ffffff', n: '#1a1028', s: '#d8b8d8', S: '#9a7aa8', b: '#e06a8a', y: '#c8f4ff' }),
  ];
  const CLOUD = [
    '.......wwww...........',
    '.....wwwwwwww..www....',
    '...wwwwwwwwwwwwwwwww..',
    '..wwwwwwwwwwwwwwwwwww.',
    '.wwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'ssssswwwwwwssswwwwssss',
    '.sssssssssssssssssss..',
  ];
  const PINE = [
    '....3....',
    '...303...',
    '...000...',
    '..30003..',
    '..00100..',
    '.3000003.',
    '..00110..',
    '.3001003.',
    '300011000',
    '.0011100.',
    '300011003',
    '000111100',
    '....4....',
    '....4....',
  ];
  const BUSH = [
    '...0000.....',
    '.00330000...',
    '0033000000..',
    '03000001100.',
    '000001111100',
  ];
  const COIN = [
    ['..kkkk..', '.kyyyyk.', 'kyywyyyk', 'kyywyyok', 'kyywyyok', 'kyyyyyok', '.kyooook', '..kkkk..'],
    ['..kkk...', '.kyyyk..', '.kywyok.', '.kywyok.', '.kywyok.', '.kyyyok.', '.kyoook.', '..kkk...'],
    ['...kk...', '...kwk..', '...kyk..', '...kyk..', '...kyk..', '...kyk..', '...kok..', '...kk...'],
  ];
  const coinFrame = (t, i) => { const f = ((Math.floor(t * 10 + i) % 4) + 4) % 4; return COIN[[0, 1, 2, 1][f]]; };
  const COIN_COL = cmapOf({ k: '#3a1a08', y: '#ffd23a', w: '#fffbe0', o: '#e08a10' });
  const QMARK = ['.kkkk.', 'kk..kk', '....kk', '...kk.', '..kk..', '......', '..kk..'];
  const COINS = [56, 70, 84, 98, 112, 126];
  const BLOCK_X = 145, BLOCK_Y = 174;  // 被顶的那块 ? 的左上（世界坐标 x）

  // ---------- 像素字：小字号渲染后阈值化 → 硬边点阵遮罩 ----------
  const txtCache = new Map();
  function pixText(text, font, thr = 120) {
    const key = text + '|' + font + '|' + thr;
    if (txtCache.has(key)) return txtCache.get(key);
    const size = parseInt(font.match(/(\d+)px/)[1]);
    const c = document.createElement('canvas'), g0 = c.getContext('2d', { willReadFrequently: true }); g0.font = font;
    const w = Math.max(1, Math.ceil(g0.measureText(text).width) + 4), h = Math.ceil(size * 1.5) + 4;
    c.width = w; c.height = h;
    g0.font = font; g0.fillStyle = '#fff'; g0.fillText(text, 2, Math.round(size * 1.1) + 2);
    const d = g0.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    let y0 = h, y1 = 0;
    for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] >= thr) { m[i] = 1; const y = (i / w) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const out = { m, w, h, y0, y1 }; txtCache.set(key, out); return out;
  }
  // 描边 + 投影 + 分色带本体
  function label(text, font, colors, x, y, ink, align = 'center', outline = true, shadow = 1) {
    const T = pixText(text, font), cols = colors.map(c32), ik = c32(ink);
    const X = align === 'center' ? Math.round(x - T.w / 2) : align === 'right' ? Math.round(x - T.w) : Math.round(x), Y = Math.round(y - T.y0);
    const { m, w, y0, y1 } = T;
    const put = (dx, dy, c) => { for (let j = y0; j <= y1; j++) for (let i = 0; i < w; i++) if (m[j * w + i]) px(X + i + dx, Y + j + dy, c); };
    for (let k = 1; k <= shadow; k++) put(k + (outline ? 1 : 0), k + (outline ? 1 : 0), ik);
    if (outline) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) put(dx, dy, ik);
    const span = y1 - y0 + 1;
    for (let j = y0; j <= y1; j++) { const c = cols[Math.min(cols.length - 1, Math.floor((j - y0) / span * cols.length))]; for (let i = 0; i < w; i++) if (m[j * w + i]) px(X + i, Y + j, c); }
    return { X, Y: Y + y0, w, h: span };
  }

  // ---------- 世界 ----------
  function drawSky(t, S, P, pi) {
    const bands = P.sky.map(c32), bh = GY / bands.length;
    for (let i = 0; i < bands.length; i++) rect(0, Math.round(i * bh), LW, Math.ceil(bh) + 1, bands[i]);
    // 色带之间的棋盘格抖动
    for (let i = 1; i < bands.length; i++) {
      const y = Math.round(i * bh), up = bands[i - 1], dn = bands[i];
      for (let x = 0; x < LW; x++) {
        if ((x & 1) === 0) px(x, y, up);
        if ((x & 1) === 1) px(x, y - 1, dn);
        if ((x & 3) === 0) px(x, y + 1, up);
        if ((x & 3) === 2) px(x, y - 2, dn);
      }
    }
    if (pi === 2) { // 星
      const w = c32('#ffffff'), b = c32('#7a8ad0'), cr = c32('#9fb4ff');
      for (let i = 0; i < 60; i++) {
        const x = Math.floor(S.hash(i * 3.1) * LW), y = Math.floor(6 + S.hash(i * 7.7) * 190), tw = ((Math.floor(t * 6 + i * 2.3) % 5) + 5) % 5;
        px(x, y, tw === 0 ? b : w);
        if (i % 6 === 0 && tw > 1) { px(x - 1, y, cr); px(x + 1, y, cr); px(x, y - 1, cr); px(x, y + 1, cr); }
      }
    }
    // 云
    const cm = { w: c32(P.cloud), s: c32(P.cloudSh) };
    for (let i = 0; i < 4; i++) {
      const span = 260, cx = ((Math.floor(-t * (2 + i) - i * 67 + 300) % span) + span) % span - 40, cy = [158, 132, 176, 146][i];
      blit(CLOUD, cx, cy, cm, i % 2 === 1);
    }
    // 太阳 / 月亮（在云前面）
    const sx = pi === 0 ? 142 : pi === 1 ? 120 : 140, sy = pi === 0 ? 190 : pi === 1 ? 206 : 186, R = pi === 1 ? 18 : 12;
    const sun = c32(P.sun), hi = c32(P.sunHi), crat = c32('#c8c39a'), stripe = c32(P.sky[3]);
    for (let y = -R - 5; y <= R + 5; y++) for (let x = -R - 5; x <= R + 5; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= R) {
        let c = (x + y < -R * 0.7) ? hi : sun;
        if (pi === 2 && ((x - 3) ** 2 + (y + 3) ** 2 < 10 || (x + 4) ** 2 + (y - 4) ** 2 < 6 || (x - 5) ** 2 + (y - 6) ** 2 < 3)) c = crat;
        if (pi === 1 && y > 2 && (y % 4 === 0 || (y % 4 === 1 && y > 8))) c = stripe; // 落日条纹
        px(sx + x, sy + y, c);
      } else if (d <= R + 4 && ((x + y) & 1) === 0 && d > R + 1) px(sx + x, sy + y, pi === 2 ? stripe : sun);
    }
  }
  function drawFar(t, S, P) {
    const fo = Math.floor(t * 4 + 100), a = c32(P.far[0]), b = c32(P.far[1]), d = c32(P.far[2]), sn = c32(P.snow), yb = 222;
    for (let x = 0; x < LW; x++) {
      const wx = x + fo; let best = 999, lit = true;
      for (let k = Math.floor(wx / 46) - 2; k <= Math.floor(wx / 46) + 2; k++) {
        const pcx = k * 46 + Math.floor(S.hash(k * 1.7) * 20), ph = 168 + Math.floor(S.hash(k * 3.3) * 22);
        const y = ph + Math.floor(Math.abs(wx - pcx) * 0.8);
        if (y < best) { best = y; lit = wx < pcx; }
      }
      if (best >= yb) continue;
      rect(x, best, 1, yb - best, lit ? a : b);
      if (best < 182) rect(x, best, 1, Math.min(4 + Math.floor(S.hash(wx * 0.37) * 3), 184 - best), sn);
      for (let y = yb - 12; y < yb; y++) if (y > best && (((x + y) & 1) === 0 || y > yb - 4)) px(x, y, d);
    }
  }
  function drawHills(t, S, P) {
    const ho = Math.floor(t * 14 + 50), h0 = c32(P.hill[0]), h1 = c32(P.hill[1]), h2 = c32(P.hill[2]), h3 = c32(P.hill[3]);
    for (let x = 0; x < LW; x++) {
      const wx = x + ho, ph = Math.floor(wx / 60), lx = wx - ph * 60 - 30, rad = 26 + Math.floor(S.hash(ph * 5.1) * 10);
      const hgt = Math.abs(lx) < rad ? Math.floor(Math.sqrt(rad * rad - lx * lx) * 0.75) : 0, y = 224 - hgt;
      rect(x, y, 1, GY - y, h1);
      if (hgt > 2) { rect(x, y, 1, 2, h0); if (lx < -4) rect(x, y + 2, 1, 2, h0); }
      if (hgt > 8 && S.hash(wx * 3.7) > 0.86) { px(x, y + 6, h2); px(x, y + 7, h2); }
      for (let yy = 226; yy < GY; yy++) if (((x + yy) & 1) === 0 || yy > 232) px(x, yy, yy > 236 ? h3 : h2);
    }
  }
  function drawTrees(t, S, P) {
    const to = Math.floor(t * 32), base = Math.floor(to / 22), off = ((to % 22) + 22) % 22;
    const tm = { 0: c32(P.tree[0]), 1: c32(P.tree[1]), 3: c32(P.tree[2]), 4: c32(P.tree[3]) };
    for (let k = -1; k < 10; k++) {
      const kk = k + base; if (S.hash(kk * 2.3) < 0.3) continue;
      const xx = k * 22 + Math.floor(S.hash(kk * 9.1 + 3) * 8) - off, tall = S.hash(kk * 4.4) > 0.5;
      blit(PINE, xx, GY - 14 - (tall ? 5 : 0), tm);
      if (tall) rect(xx + 4, GY - 5, 1, 5, tm[4]);
    }
    // 前景灌木 + 小花
    const bo = Math.floor(t * SPD) + 400, bb = Math.floor(bo / 40), bof = bo % 40, fl = c32(P.flower);
    const bm = { 0: c32(P.hill[0]), 1: c32(P.hill[2]), 3: c32(P.grass[0]) };
    for (let k = -1; k < 6; k++) {
      const kk = k + bb, x = k * 40 + Math.floor(S.hash(kk * 7.3) * 20) - bof;
      blit(BUSH, x, GY - 5, bm);
      if (S.hash(kk * 1.9) > 0.4) { px(x + 3, GY - 6, fl); px(x + 8, GY - 4, fl); }
    }
  }
  function drawGround(t, S, P) {
    const gs = Math.floor(t * SPD + 400), d0 = c32(P.dirt[0]), d1 = c32(P.dirt[1]), d2 = c32(P.dirt[2]), d3 = c32(P.dirt[3]);
    rect(0, GY, LW, LH - GY, d1);
    for (let row = 0; row < 6; row++) {
      const y = GY + 5 + row * 16, off = (row & 1) * 8;
      for (let x = -32; x < LW + 32; x += 16) {
        const X = x - ((gs + off) % 16), id = Math.floor((gs + off) / 16) + x / 16;
        rect(X + 1, y, 14, 1, d3); rect(X, y + 1, 1, 13, d3);
        rect(X + 1, y + 1, 14, 2, d0);
        rect(X, y + 15, 16, 1, d2); rect(X + 15, y, 1, 16, d2);
        for (let i = 0; i < 3; i++) { const h = S.hash(id * 7 + row * 13 + i); rect(X + 3 + Math.floor(h * 10), y + 5 + i * 3, 2, 1, d2); }
      }
    }
    const g0 = c32(P.grass[0]), g1 = c32(P.grass[1]), g2 = c32(P.grass[2]);
    rect(0, GY, LW, 2, g0); rect(0, GY + 2, LW, 3, g1);
    for (let x = 0; x < LW; x++) {
      const h = S.hash((x + gs) * 0.91); if (h > 0.45) rect(x, GY + 5, 1, h > 0.8 ? 2 : 1, g2);
      const h2 = S.hash((x + gs) * 1.37 + 9); if (h2 > 0.8) px(x, GY - 1, g0); if (h2 > 0.94) px(x, GY - 2, g0);
    }
  }

  function drawBlocks(t, S, P) {
    const gs = Math.floor(t * SPD), ink = c32(P.ink);
    for (let i = 0; i < 4; i++) {
      const X = BLOCK_X - 16 + i * 16 - gs; if (X < -16 || X > LW) continue;
      const isQ = i === 1 || i === 3, hitThis = i === 1;
      let Y = BLOCK_Y;
      if (hitThis && t >= HIT && t < HIT + 0.16) Y -= [3, 5, 4, 2, 1][Math.floor((t - HIT) / 0.033)] || 0;
      rect(X, Y, 16, 16, ink);
      if (isQ && !(hitThis && t >= HIT)) {
        const glow = c32(['#ffd23a', '#ffe680', '#ffd23a', '#e8a020'][((Math.floor(t * 6) % 4) + 4) % 4]);
        rect(X + 1, Y + 1, 14, 14, c32('#c86a10')); rect(X + 1, Y + 1, 13, 13, glow);
        rect(X + 1, Y + 1, 13, 1, c32('#fff6c0')); rect(X + 1, Y + 1, 1, 13, c32('#fff6c0'));
        for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px(X + a, Y + b, c32('#7a3a08'));
        blit(QMARK, X + 5, Y + 4, { k: c32('#7a3a08') });
      } else if (isQ) {
        rect(X + 1, Y + 1, 14, 14, c32('#8a5a3a'));
        rect(X + 14, Y + 1, 1, 14, c32('#5a3420')); rect(X + 1, Y + 14, 14, 1, c32('#5a3420'));
        for (const [a, b] of [[3, 3], [12, 3], [3, 12], [12, 12]]) px(X + a, Y + b, c32('#3a2010'));
      } else {
        rect(X + 1, Y + 1, 14, 14, c32(P.dirt[1])); rect(X + 1, Y + 1, 14, 1, c32(P.dirt[0]));
        rect(X + 1, Y + 8, 14, 1, ink); rect(X + 8, Y + 1, 1, 7, ink); rect(X + 4, Y + 9, 1, 6, ink); rect(X + 12, Y + 9, 1, 6, ink);
        rect(X + 1, Y + 9, 3, 1, c32(P.dirt[3])); rect(X + 9, Y + 2, 6, 1, c32(P.dirt[3]));
      }
    }
    // 金币弹出
    if (t >= HIT && t < HIT + 0.6) {
      const k = t - HIT, X = BLOCK_X - gs + 4, y = Math.round(BLOCK_Y - 10 - 36 * Math.sin(Math.min(1, k / 0.6) * Math.PI * 0.9));
      blit(coinFrame(t * 2, 0), X, y, COIN_COL);
    }
  }

  const JUMPS = [[1.62, HIT, 2.4, 23], [2.85, 3.2, 3.6, 30]];
  function jumpAt(t) {
    for (const [a, m, b, h] of JUMPS) if (t > a && t < b) { const u = t < m ? (m - t) / (m - a) : (t - m) / (b - m); return Math.round(h * (1 - u * u)); }
    return 0;
  }
  function heroState(t) {
    const jump = jumpAt(t);
    if (jump > 0 || JUMPS.some(([a, , b]) => t > a && t < b)) return { jump, frame: BODY.j, f: -1 };
    const f = ((Math.floor(t * 12) % 4) + 4) % 4;
    return { jump: 0, frame: [BODY.a, BODY.b, BODY.c, BODY.b][f], f };
  }
  // 第二跳沿途的金币弧：每枚金币恰好放在主角经过时头部的位置
  const ARC = [2.9, 3.05, 3.2, 3.35, 3.5].map(tc => ({ tc, wx: Math.floor(CX + 12 + tc * SPD), y: 213 - jumpAt(tc) - 2 }));

  function drawCoinsAndHero(t, S, P, pi) {
    const gs = Math.floor(t * SPD), wht = c32('#ffffff'), pale = c32('#fff6c0');
    COINS.forEach((wx, i) => {
      const X = wx - gs;
      if (X > CX + 12) blit(coinFrame(t, i), X, 224 - ((i % 2) ? 2 : 0), COIN_COL);
      else {
        const k = (CX + 12 - X) / SPD;
        if (k < 0.25) {
          const f = Math.floor(k / 0.0625), cx = CX + 16, cy = 220 - f * 3, r = 2 + f, c = f % 2 ? pale : wht;
          rect(cx, cy - r, 1, r * 2 + 1, c); rect(cx - r, cy, r * 2 + 1, 1, c); rect(cx - 1, cy - 1, 3, 3, c);
        }
      }
    });
    // 第二跳的金币弧（跳过去时收走）
    ARC.forEach((c, i) => {
      const X = c.wx - gs;
      if (X > CX + 12) { if (X < LW) blit(coinFrame(t, i + 3), X, c.y, COIN_COL); }
      else {
        const k = t - c.tc;
        if (k < 0.2) { const f = Math.floor(k / 0.05), cx = X + 4, cy = c.y + 2 - f * 3, r = 2 + f, col = f % 2 ? pale : wht;
          rect(cx, cy - r, 1, r * 2 + 1, col); rect(cx - r, cy, r * 2 + 1, 1, col); rect(cx - 1, cy - 1, 3, 3, col); }
      }
    });
    // 流星（夜）
    if (t > 3.55 && t < 4.0) {
      const k = Math.floor((t - 3.55) * 30), x0 = 150 - k * 6, y0 = 60 + k * 3;
      for (let i = 0; i < 10; i++) px(x0 + i * 2, y0 - i, i < 2 ? wht : c32(i < 5 ? '#c8f4ff' : '#5a7ad0'));
      for (let i = 0; i < 10; i++) px(x0 + i * 2 + 1, y0 - i, i < 4 ? c32('#c8f4ff') : c32('#2a3a8a'));
    }
    const { jump, frame, f } = heroState(t);
    const bob = frame === BODY.b ? -1 : 0, y = GY - 27 - jump + bob;
    if (jump > 0) { const w = Math.max(6, 18 - (jump >> 2)); shade(CX + 11 - (w >> 1), GY, w, 2, 0.55); }
    else {
      const g = c32(P.grass[0]);
      if (f === 0) { rect(CX + 1, GY - 3, 2, 2, g); px(CX - 2, GY - 5, g); }
      if (f === 1) { px(CX - 1, GY - 4, g); px(CX - 4, GY - 6, g); }
    }
    const cm = HERO_COL[pi];
    blit(HEAD, CX, y, cm); blit(frame, CX, y + 15, cm);
  }

  function drawHUD(t, S, P) {
    const gs = Math.floor(t * SPD), got = COINS.filter(wx => wx - gs <= CX + 12).length + (t >= HIT ? 1 : 0) + ARC.filter(c => c.wx - gs <= CX + 12).length;
    const score = 12800 + got * 100 + (t >= HIT ? 1000 : 0), f8 = '8px "PressStart2P"';
    label('SCORE', f8, [P.hud], 14, 26, P.ink, 'left', false, 1);
    label(String(score).padStart(6, '0'), f8, [P.hud], 14, 36, P.ink, 'left', false, 1);
    blit(COIN[0], 72, 35, COIN_COL);
    label('x' + String(got + 7).padStart(2, '0'), f8, [P.hud], 82, 36, P.ink, 'left', false, 1);
    label('TIME', f8, [P.hud], 166, 26, P.ink, 'right', false, 1);
    label(String(400 - Math.max(0, Math.floor(t * 2.5))), f8, [P.hud], 166, 36, P.ink, 'right', false, 1);
  }

  function drawTitle(t, S, P) {
    // 「13」：从天而降，量化到 15fps 的整格弹跳
    const tq = Math.floor(t * 15) / 15;
    let dy = 0;
    if (tq < 0.55) { const k = S.clamp((tq + 0.1) / 0.65); dy = -Math.round((1 - S.E.outBounce(k)) * 100); }
    const hop = (t > 0.7 && Math.floor(t / 0.5) % 2 === 0 && S.beatPhase(t) < 0.12) ? -2 : 0;
    label('STAGE', '8px "PressStart2P"', [P.t1[1]], 90, 50 + dy, P.ink, 'center', true, 0);
    label('13', '40px "PressStart2P"', P.t1, 90, 63 + dy + hop, P.ink, 'center', true, 3);
    // 中文名：对话框 + 逐字打出
    const zh = '16-bit 像素风', ZF = '600 20px "NotoSansSC"';
    const n = t < 0.18 ? 0 : Math.min(zh.length, Math.floor((t - 0.18) / 0.045) + 1);
    const full = pixText(zh, ZF), bw = full.w + 10, bx = Math.round(90 - bw / 2), by = 114, bh = 30;
    const openK = S.clamp((t - 0.05) / 0.15), ow = Math.max(2, Math.round(bw * openK));
    if (t > 0.05) {
      const ox = Math.round(90 - ow / 2), ink = c32(P.ink), w = c32('#ffffff');
      rect(ox - 1, by - 1, ow + 2, bh + 2, ink); rect(ox, by, ow, bh, c32(P.box));
      rect(ox, by, ow, 4, c32(P.boxHi));
      rect(ox + 1, by + 1, ow - 2, 1, w); rect(ox + 1, by + bh - 2, ow - 2, 1, w); rect(ox + 1, by + 1, 1, bh - 2, w); rect(ox + ow - 2, by + 1, 1, bh - 2, w);
      px(ox, by, ink); px(ox + ow - 1, by, ink); px(ox, by + bh - 1, ink); px(ox + ow - 1, by + bh - 1, ink);
    }
    if (n > 0 && openK >= 1) {
      const part = zh.slice(0, n), r = label(part, ZF, [P.t2], bx + 5, by + 6, P.ink, 'left', false, 1);
      if (n < zh.length || Math.floor(t * 4) % 2 === 0) rect(r.X + pixText(part, ZF).w - 1, by + bh - 6, 5, 2, c32(P.t1[2]));
    }
    // 英文名：逐字出现
    const en = '16-BIT PIXEL ART', vis = Math.max(0, Math.floor((t - 0.5) / 0.025));
    if (vis > 0) label(en.slice(0, vis), '8px "PressStart2P"', [P.t1[1], P.t1[3]], 90 - 64, 153, P.ink, 'left', true, 1);
  }

  // ---------- CRT：预计算桶形映射 + 扫描线/荧光栅/暗角 ----------
  let MAP = null, FAC = null, BEZ = null;
  function buildCRT() {
    MAP = new Int32Array(OW * OH); FAC = new Uint8Array(OW * OH); BEZ = new Uint32Array(OW * OH);
    const kx = 0.055, ky = 0.03, rad = 7;
    for (let Y = 0; Y < OH; Y++) {
      const v = (Y + 0.5) / OH * 2 - 1;
      for (let X = 0; X < OW; X++) {
        const u = (X + 0.5) / OW * 2 - 1, i = Y * OW + X;
        const su = u * (1 + kx * v * v) * 1.012, sv = v * (1 + ky * u * u) * 1.008;
        const sx = (su + 1) / 2 * LW, sy = (sv + 1) / 2 * LH;
        const qx = Math.abs(sx - LW / 2) - (LW / 2 - rad), qy = Math.abs(sy - LH / 2) - (LH / 2 - rad);
        const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
        const e = Math.min(1, Math.max(0, -dist));
        const bz = dist > 0 ? Math.max(0, 22 - dist * 1.5) * (0.4 + 0.6 * Math.max(0, -v)) : 0;
        const bc = (8 + bz) | 0; BEZ[i] = (0xff000000 | ((bc + 2) << 16) | (bc << 8) | bc) >>> 0;
        if (dist > 0 || sx < 0 || sy < 0 || sx >= LW || sy >= LH) { MAP[i] = -1; continue; }
        MAP[i] = (sy | 0) * LW + (sx | 0);
        const fy = sy - Math.floor(sy), fx = sx - Math.floor(sx);
        const scan = 1 - 0.5 * Math.pow(Math.max(0, Math.abs(fy - 0.45) * 2 - 0.25) / 0.75, 1.6);
        const mask = fx > 0.84 ? 0.86 : 1;
        const r2 = su * su * 0.9 + sv * sv * 0.7, vig = Math.max(0, 1 - 0.32 * r2 * r2);
        FAC[i] = Math.round(255 * Math.max(0, Math.min(1, scan * mask * vig * Math.min(1, e * 1.2 + 0.25))));
      }
    }
  }
  let outID = null;

  registerScene({
    n: 13, key: 'pixel', zh: '16-bit 像素风', en: '16-bit Pixel Art',
    bg: '#3d7cf0', accent: '#ffd23a',
    draw(ctx, t, S) {
      if (!MAP) buildCRT();
      const pi = palAt(t), P = PAL[pi];
      drawSky(t, S, P, pi);
      drawFar(t, S, P);
      drawHills(t, S, P);
      drawTrees(t, S, P);
      drawBlocks(t, S, P);
      drawGround(t, S, P);
      drawCoinsAndHero(t, S, P, pi);
      drawHUD(t, S, P);
      drawTitle(t, S, P);
      // 唯一的白闪（第二小节强拍）
      if (t >= HIT && t < HIT + 0.034) buf.fill(0xffffffff);
      else if (t >= HIT + 0.034 && t < HIT + 0.1) for (let i = 0; i < buf.length; i++) if (((i % LW) + ((i / LW) | 0)) & 1) buf[i] = 0xffffffff;

      // 低分辨率层（给泛光用）
      const L = S.layer('s13-lo', LW, LH), lg = L.getContext('2d', { willReadFrequently: true });
      lg.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer.slice(0)), LW, LH), 0, 0);
      const B = S.layer('s13-bloom', LW, LH), bg = B.getContext('2d', { willReadFrequently: true });
      bg.globalCompositeOperation = 'source-over'; bg.globalAlpha = 1; bg.filter = 'blur(2.5px) brightness(1.2) saturate(1.3)';
      bg.clearRect(0, 0, LW, LH); bg.drawImage(L, 0, 0); bg.filter = 'none';

      // CRT 合成（逐像素查表），泛光与玻璃反光也在 CPU 画布上叠好，最后一次贴到舞台
      const O = S.layer('s13-crt', OW, OH), og = O.getContext('2d', { willReadFrequently: true });
      if (!outID) outID = og.createImageData(OW, OH);
      const out = new Uint32Array(outID.data.buffer);
      for (let i = 0; i < out.length; i++) {
        const m = MAP[i];
        if (m < 0) { out[i] = BEZ[i]; continue; }
        const c = buf[m], f = FAC[i];
        out[i] = 0xff000000 | ((((c >> 16) & 255) * f >> 8) << 16) | ((((c >> 8) & 255) * f >> 8) << 8) | (((c & 255) * f) >> 8);
      }
      og.putImageData(outID, 0, 0);
      og.save();
      og.globalCompositeOperation = 'screen'; og.globalAlpha = 0.42; og.imageSmoothingEnabled = true;
      og.drawImage(B, 30, 30, OW - 60, OH - 60);
      og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
      const gl = og.createRadialGradient(300, 260, 10, 300, 260, 520);
      gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      og.fillStyle = gl; og.beginPath(); og.ellipse(320, 300, 460, 280, -0.55, 0, Math.PI * 2); og.fill();
      og.restore();
      ctx.drawImage(O, 0, 0);
    },
  });
})();
