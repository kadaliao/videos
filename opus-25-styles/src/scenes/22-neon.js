// 22 霓虹灯牌 · Neon Sign
// 雨夜砖墙上的一组霓虹灯：玻璃灯管 = 白热灯芯 + 饱和色管 + 大范围柔光（离屏降采样模糊叠加）。
// 灯管按拍逐段点亮并闪烁，“灯”字一直嗡嗡接触不良；鸡尾酒图标 3 帧交替（真实霓虹的逐帧动画）；
// 有固定卡子、涂黑的过渡管、变压器箱与电缆；下方湿地面水洼倒影 + 细雨 + 薄雾。
(function () {
  const BG = '#120c10';
  const PINK = [255, 52, 150], CYAN = [40, 225, 255], WARM = [255, 214, 160], LIME = [170, 255, 60], RED = [255, 70, 50];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const hot = (c, k = 0.72) => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
  const GROUND = 1560;

  const CPU = {};
  function cpu(key, w = 1080, h = 1920) {
    if (!CPU[key]) { const c = document.createElement('canvas'); c.width = w; c.height = h; CPU[key] = c.getContext('2d', { willReadFrequently: true }); }
    const g = CPU[key];
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetX = g.shadowOffsetY = 0; g.setLineDash([]);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px'; g.lineWidth = 1;
    return g;
  }

  // ---------- 砖墙（静态，预渲染）----------
  let WALL = null;
  function makeWall(S) {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#0e0a0b'; g.fillRect(0, 0, 1080, 1920);   // 砂浆
    const bw = 120, bh = 46, r = S.rng(2222);
    for (let row = 0; row * bh < GROUND + bh; row++) {
      const off = (row % 2) * bw / 2;
      for (let x = -bw; x < 1080 + bw; x += bw) {
        const v = r(), y = row * bh;
        const L = 9 + v * 8, R0 = 30 + v * 18;
        g.fillStyle = `rgb(${R0 | 0},${(L + 6) | 0},${(L + 4) | 0})`;
        const bx = x + off + 3 + (r() - 0.5) * 2, by = y + 3;
        g.beginPath(); g.roundRect(bx, by, bw - 6, bh - 6, 3); g.fill();
        // 砖面斑驳 + 顶边高光
        for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.15})`; g.fillRect(bx + r() * (bw - 20), by + r() * (bh - 12), 6 + r() * 16, 3 + r() * 6); }
        g.fillStyle = 'rgba(255,200,190,0.05)'; g.fillRect(bx + 2, by + 1, bw - 10, 2);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(bx + 2, by + bh - 9, bw - 10, 3);
      }
    }
    // 湿痕：竖向水渍条
    for (let k = 0; k < 26; k++) {
      const x = r() * 1080, w = 8 + r() * 30, y0 = r() * 600, len = 300 + r() * 900;
      const gr = g.createLinearGradient(0, y0, 0, y0 + len);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(180,190,220,${0.012 + r() * 0.02})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x, y0, w, len);
    }
    // 暗角
    const vg = g.createRadialGradient(540, 820, 300, 540, 900, 1250);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    g.fillStyle = vg; g.fillRect(0, 0, 1080, GROUND);
    // 地面：湿沥青
    const gg = g.createLinearGradient(0, GROUND, 0, 1920);
    gg.addColorStop(0, '#0b0809'); gg.addColorStop(1, '#040304');
    g.fillStyle = gg; g.fillRect(0, GROUND, 1080, 1920 - GROUND);
    for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * 1080, GROUND + r() * 360, 2, 2); }
    // 墙根 / 路缘
    g.fillStyle = '#231a1c'; g.fillRect(0, GROUND - 26, 1080, 26);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, GROUND - 26, 1080, 2);
    return c;
  }

  // ---------- 图形定义 ----------
  // 每个元素：{ kind:'path'|'text', ... , color, ig: 点亮时间 }
  const TITLE = { txt: '霓虹灯牌', size: 178, y: 668, xs: [], color: PINK };
  function layoutTitle(g, S) {
    g.font = S.F(TITLE.size, 'ZCOOLQingKe');
    TITLE.xs = S.chars(g, TITLE.txt, 540, 'center', 12);
  }

  // 鸡尾酒（马天尼）图标
  const CK = { x: 300, y: 800 };
  function cocktailPaths(state) {
    const { x, y } = CK;
    const P = [];
    // 杯身 + 杯脚 + 底座（青）
    P.push({ c: CYAN, pts: [[x - 140, y + 20], [x + 140, y + 20], [x, y + 170], [x - 140, y + 20]] });
    P.push({ c: CYAN, pts: [[x, y + 170], [x, y + 300]] });
    P.push({ c: CYAN, pts: [[x - 78, y + 318], [x - 30, y + 302], [x + 30, y + 302], [x + 78, y + 318]] });
    // 酒面（粉）
    P.push({ c: PINK, pts: [[x - 104, y + 56], [x + 104, y + 56]] });
    // 签子 + 橄榄（青柠绿），三帧：橄榄沿签子下滑 / 气泡上升 / 光芒交替
    const op = [[0, 0], [8, 12], [16, 24]][state];
    P.push({ c: LIME, pts: [[x - 70 + op[0] * 0.3, y - 60 + op[1] * 0.3], [x + 40 + op[0], y + 100 + op[1]]] });
    const oc = [x + 10 + op[0], y + 58 + op[1]];
    const ol = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2; ol.push([oc[0] + Math.cos(a) * 24, oc[1] + Math.sin(a) * 20]); }
    P.push({ c: LIME, pts: ol });
    // 气泡
    const bub = [[[-40, 120], [-20, 96]], [[-46, 100], [-14, 76]], [[-36, 82], [-22, 60]]][state];
    for (const [bx, by] of bub) { const o = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2; o.push([x + bx + Math.cos(a) * 7, y + by + Math.sin(a) * 7]); } P.push({ c: PINK, pts: o, thin: 1 }); }
    // 光芒：两组交替
    const rays = state % 2 === 0 ? [[-170, -30, -200, -60], [170, -30, 200, -60], [-190, 40, -230, 40]] : [[-160, -60, -175, -100], [160, -60, 175, -100], [190, 40, 230, 40]];
    for (const [a, b, c2, d] of rays) P.push({ c: WARM, pts: [[x + a, y + b], [x + c2, y + d]] });
    return P;
  }
  const OPEN = { x: 600, y: 800, w: 330, h: 170 };
  const SIGN = { txt: 'NEON SIGN', y: 1300 };

  // ---------- 点亮/闪烁 ----------
  function ignite(t, t0, S, seed) {
    const k = t - t0;
    if (k < 0) return 0;
    if (k > 0.3) return 1;
    // 点亮过程中的不规则闪烁
    const f = Math.floor(k / 0.03);
    return S.hash2(seed, f) > 0.45 ? (0.6 + 0.4 * S.hash2(seed + 1, f)) : 0.05;
  }
  function buzz(t, S, seed) {
    // 接触不良：大部分时间亮，偶发一串快速掉电
    const w = Math.floor(t * 9);
    const bad = S.hash2(seed, w) > 0.72;
    if (!bad) return 0.95 + 0.05 * Math.sin(t * 120);
    const f = Math.floor(t * 50);
    return S.hash2(seed + 3, f) > 0.5 ? 0.85 : 0.08;
  }

  // ---------- 灯管描画 ----------
  function strokePts(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
  function unlitPts(g, pts, w = 11) {
    g.strokeStyle = 'rgba(120,110,125,0.32)'; g.lineWidth = w; strokePts(g, pts);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; g.save(); g.translate(-2, -2); strokePts(g, pts); g.restore();
  }
  function litPts(g, glow, pts, c, on, w = 11) {
    g.strokeStyle = rgba(c, 0.55 + 0.45 * on); g.lineWidth = w; strokePts(g, pts);
    g.strokeStyle = rgba(hot(c, 0.75), on); g.lineWidth = w * 0.42; strokePts(g, pts);
    glow.strokeStyle = rgba(c, on); glow.lineWidth = w * 1.8; strokePts(glow, pts);
  }
  function tubeText(g, glow, S, txt, x, y, font, c, on, w = 9, align = 'center', spacing = 0) {
    for (const k of [g, glow]) { k.font = font; k.textAlign = align; k.letterSpacing = spacing + 'px'; }
    if (on <= 0.02) {
      g.strokeStyle = 'rgba(120,110,125,0.32)'; g.lineWidth = w; g.strokeText(txt, x, y);
      g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2; g.strokeText(txt, x - 2, y - 2);
    } else {
      g.strokeStyle = rgba(c, 0.55 + 0.45 * on); g.lineWidth = w; g.strokeText(txt, x, y);
      g.strokeStyle = rgba(hot(c, 0.78), on); g.lineWidth = w * 0.4; g.strokeText(txt, x, y);
      glow.strokeStyle = rgba(c, on); glow.lineWidth = w * 1.8; glow.strokeText(txt, x, y);
    }
    for (const k of [g, glow]) { k.textAlign = 'left'; k.letterSpacing = '0px'; }
  }
  function clip(g, x, y, ang = 0) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = '#5a5458'; g.fillRect(-9, -4, 18, 8);
    g.fillStyle = '#2a2628'; g.fillRect(-3, 4, 6, 14);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-9, -4, 18, 2);
    g.restore();
  }
  // 涂黑过渡管（背面走线）
  function blackout(g, pts) {
    g.strokeStyle = '#0c0a0b'; g.lineWidth = 11; strokePts(g, pts);
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 2; g.save(); g.translate(-2, -2); strokePts(g, pts); g.restore();
  }

  function draw(ctx, t, S) {
    const { clamp, E, seg } = S;
    if (!WALL) WALL = makeWall(S);
    ctx.drawImage(WALL, 0, 0);
    const glow = cpu('glow'); glow.clearRect(0, 0, 1080, 1920);
    const g = cpu('tubes'); g.clearRect(0, 0, 1080, 1920);
    if (!TITLE.xs.length) layoutTitle(g, S);
    const beat = 0.88 + 0.12 * S.pulse(t, 6);
    const surge = 1 + 0.25 * Math.exp(-6 * Math.max(0, t - 2)) * (t >= 2 ? 1 : 0);

    // ---------- 标题背后的金属线槽 ----------
    ctx.fillStyle = '#242022'; ctx.fillRect(150, 590, 780, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(150, 590, 780, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(150, 624, 780, 8);
    for (let x = 170; x < 930; x += 95) { ctx.fillStyle = '#4a4447'; ctx.beginPath(); ctx.arc(x, 607, 4, 0, S.TAU); ctx.fill(); }
    // 变压器箱 + 电缆
    ctx.strokeStyle = '#070506'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(880, 1400); ctx.bezierCurveTo(900, 1200, 960, 900, 900, 640); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(860, 1400); ctx.bezierCurveTo(820, 1300, 760, 1150, 760, 980); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(850, 1420); ctx.bezierCurveTo(600, 1480, 380, 1400, 300, 1128); ctx.stroke();
    ctx.fillStyle = '#3a3638'; ctx.fillRect(812, 1392, 128, 118);
    ctx.fillStyle = '#4b4649'; ctx.fillRect(812, 1392, 128, 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(822, 1408, 108, 92);
    ctx.fillStyle = '#e8c21c'; ctx.beginPath(); ctx.moveTo(876, 1420); ctx.lineTo(898, 1458); ctx.lineTo(854, 1458); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = S.F(26, 'InterXB', 800); ctx.textAlign = 'center'; ctx.fillText('!', 876, 1454);
    ctx.font = S.F(16, 'JetBrainsMono'); ctx.fillStyle = '#b8b0b4'; ctx.fillText('15 kV · 30mA', 876, 1486); ctx.textAlign = 'left';

    // ---------- 22：圆框 + 数字（青，开场即亮）----------
    const on22 = Math.max(ignite(t, -0.35, S, 22), 0) * beat;
    const ring = []; for (let k = 0; k <= 64; k++) { const a = -Math.PI / 2 + k / 64 * Math.PI * 2 * 0.93 + 0.2; ring.push([540 + Math.cos(a) * 96, 330 + Math.sin(a) * 96]); }
    on22 > 0.02 ? litPts(g, glow, ring, CYAN, on22, 9) : unlitPts(g, ring, 9);
    tubeText(g, glow, S, '22', 540, 380, S.F(150, 'ZCOOLQingKe'), CYAN, on22, 7);
    clip(g, 540 - 96, 330); clip(g, 540 + 96, 330);
    // 两侧装饰短管
    const side = (on22 > 0.02 ? 1 : 0) * clamp((t - 0.2) / 0.3) * beat;
    for (const s of [-1, 1]) {
      const pts = [[540 + s * 130, 330], [540 + s * 330, 330]];
      side > 0.02 ? litPts(g, glow, pts, WARM, side, 6) : unlitPts(g, pts, 6);
      const dots = [[540 + s * 360, 330], [540 + s * 362, 330]];
      side > 0.02 ? litPts(g, glow, dots, PINK, side, 12) : unlitPts(g, dots, 12);
    }

    // ---------- 标题：霓虹灯牌（逐字点亮，“灯”一直嗡嗡）----------
    g.font = S.F(TITLE.size, 'ZCOOLQingKe');
    TITLE.xs.forEach((c, i) => {
      let on = ignite(t, 0.0 + i * 0.12, S, 30 + i);
      if (i === 2 && t > 0.5) on *= buzz(t, S, 77);
      on *= beat * surge;
      tubeText(g, glow, S, c.ch, c.cx, TITLE.y, S.F(TITLE.size, 'ZCOOLQingKe'), PINK, Math.min(1, on), 9);
      clip(g, c.cx - 44, 618); clip(g, c.cx + 44, 618);
      // 字与字之间涂黑的过渡管
      if (i < TITLE.xs.length - 1) {
        const n = TITLE.xs[i + 1];
        blackout(g, [[c.cx + c.w * 0.32, TITLE.y + 12], [c.cx + c.w * 0.5, TITLE.y + 26], [n.cx - n.w * 0.5, TITLE.y + 26], [n.cx - n.w * 0.32, TITLE.y + 12]]);
      }
    });

    // ---------- 鸡尾酒：0.5 点亮，之后每拍换帧 ----------
    const onCk = ignite(t, 0.5, S, 50) * beat * surge;
    const state = t < 0.5 ? 0 : (S.beatIndex(t) % 3);
    for (const p of cocktailPaths(state)) {
      const w = p.thin ? 6 : 10;
      onCk > 0.02 ? litPts(g, glow, p.pts, p.c, Math.min(1, onCk), w) : unlitPts(g, p.pts, w);
    }
    blackout(g, [[CK.x - 140, CK.y + 20], [CK.x - 150, CK.y - 10], [CK.x - 70, CK.y - 60]]);
    clip(g, CK.x - 120, CK.y + 30, 0); clip(g, CK.x + 120, CK.y + 30, 0); clip(g, CK.x, CK.y + 240, Math.PI / 2);

    // ---------- OPEN：1.0 边框点亮，字母随后；字母 N 偶发闪 ----------
    const { x: ox, y: oy, w: ow, h: oh } = OPEN;
    const onB = ignite(t, 1.0, S, 60) * beat * surge;
    const rr = []; const R = 34;
    const arc = (cx, cy, a0) => { for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * Math.PI / 2; rr.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } };
    arc(ox + ow - R, oy + R, -Math.PI / 2); arc(ox + ow - R, oy + oh - R, 0); arc(ox + R, oy + oh - R, Math.PI / 2); arc(ox + R, oy + R, Math.PI); rr.push(rr[0]);
    onB > 0.02 ? litPts(g, glow, rr, CYAN, Math.min(1, onB), 9) : unlitPts(g, rr, 9);
    const letters = 'OPEN';
    for (let i = 0; i < 4; i++) {
      let on = ignite(t, 1.12 + i * 0.07, S, 70 + i) * beat * surge;
      if (i === 3 && t > 1.6) on *= (S.hash2(91, Math.floor(t * 6)) > 0.8 ? buzz(t, S, 93) : 1);
      tubeText(g, glow, S, letters[i], ox + 62 + i * 69, oy + 116, S.F(104, 'Inter'), RED, Math.min(1, on), 8);
    }
    clip(g, ox + 20, oy + oh / 2, Math.PI / 2); clip(g, ox + ow - 20, oy + oh / 2, Math.PI / 2);
    // 追逐箭头（2.0 起依次点亮）
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const x0 = ox + ow - 30 - i * 74, y0 = oy + oh + 76;
      const pts = [[x0, y0 - 26], [x0 - 34, y0], [x0, y0 + 26]];
      const ch = t < 2.0 ? 0 : ((Math.floor((t - 2) / 0.125) % segs) === i ? 1 : 0.18);
      const on = ch * clamp((t - 2.0) / 0.05);
      on > 0.02 ? litPts(g, glow, pts, LIME, on, 9) : unlitPts(g, pts, 9);
    }

    // ---------- NEON SIGN：1.5 点亮（暖白）----------
    const onS = ignite(t, 1.5, S, 80) * beat * surge;
    tubeText(g, glow, S, 'Neon Sign', 540, SIGN.y, S.F(150, 'Pacifico'), WARM, Math.min(1, onS), 6);
    clip(g, 330, SIGN.y - 30); clip(g, 750, SIGN.y - 30);

    // ---------- 合成：墙面受光 → 柔光 → 灯管本体 ----------
    const sm = cpu('glow-s', 270, 480); sm.clearRect(0, 0, 270, 480);
    sm.filter = 'blur(5px)'; sm.drawImage(glow.canvas, 0, 0, 270, 480); sm.filter = 'none';
    const lg = cpu('glow-l', 135, 240); lg.clearRect(0, 0, 135, 240);
    lg.filter = 'blur(9px)'; lg.drawImage(glow.canvas, 0, 0, 135, 240); lg.filter = 'none';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1; ctx.drawImage(lg.canvas, 0, 0, 1080, 1920);       // 墙面大范围受光
    ctx.globalAlpha = 0.6; ctx.drawImage(lg.canvas, 0, 0, 1080, 1920);
    ctx.globalAlpha = 0.85; ctx.drawImage(sm.canvas, 0, 0, 1080, 1920);      // 管周光晕
    ctx.restore();
    // 灯管在墙上的投影（管子离墙几厘米）
    ctx.save(); ctx.globalAlpha = 0.42; ctx.globalCompositeOperation = 'multiply';
    ctx.filter = 'brightness(0)'; ctx.drawImage(g.canvas, 6, 10); ctx.filter = 'none';
    ctx.restore();
    ctx.drawImage(g.canvas, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
    ctx.drawImage(sm.canvas, 0, 0, 1080, 1920);
    ctx.restore();

    // ---------- 地面倒影：翻转 + 波纹错位 + 压暗 ----------
    ctx.save();
    ctx.beginPath(); ctx.rect(0, GROUND, 1080, 1920 - GROUND); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let y = GROUND; y < 1920; y += 3) {
      const d = y - GROUND;                       // 距地面
      const srcY = GROUND - d * 1.6;               // 倒影对应墙上的高度
      const dx = Math.sin(y * 0.09 + t * 5) * (2 + d * 0.02) + Math.sin(y * 0.031 - t * 2.3) * 3;
      const fade = 0.75 * (1 - d / 420);
      if (fade <= 0) break;
      ctx.globalAlpha = fade;
      ctx.drawImage(sm.canvas, 0, srcY / 4, 270, 1.6 * 3 / 4, dx, y, 1080, 3);
      ctx.globalAlpha = fade * 0.28;
      ctx.drawImage(g.canvas, 0, srcY, 1080, 1.6 * 3, dx * 1.5, y, 1080, 3);
    }
    ctx.restore();
    // 水洼边缘：亮边高光
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(420, 1700, 360, 60, 0, 0, S.TAU); ctx.stroke();

    // ---------- 细雨 + 薄雾 ----------
    ctx.save(); ctx.strokeStyle = 'rgba(220,220,255,0.18)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const sp = 1500 + S.hash(i) * 600, x0 = S.hash(i + 0.3) * 1180 - 50;
      const y = ((S.hash(i + 0.7) * 2200 + (t + 1) * sp) % 2200) - 140;
      const x = x0 - (y + 140) * 0.12;
      ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 44);
    }
    ctx.stroke(); ctx.restore();
    const hz = ctx.createLinearGradient(0, 1100, 0, GROUND);
    hz.addColorStop(0, 'rgba(255,120,200,0)'); hz.addColorStop(1, 'rgba(255,120,200,0.06)');
    ctx.fillStyle = hz; ctx.fillRect(0, 1100, 1080, GROUND - 1100);
    // 雨滴打在水洼上的涟漪
    for (let i = 0; i < 6; i++) {
      const period = 0.7, ph = S.hash(i * 9.1) * period, k = S.fract((t + 1 + ph) / period);
      const n = Math.floor((t + 1 + ph) / period);
      const x = 120 + S.hash2(i, n) * 820, y = 1620 + S.hash2(n, i) * 240;
      ctx.strokeStyle = `rgba(255,200,230,${0.25 * (1 - k)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(x, y, 6 + k * 40, (6 + k * 40) * 0.25, 0, 0, S.TAU); ctx.stroke();
    }
  }

  let GPAT = null;
  registerScene({
    n: 22, key: 'neon', zh: '霓虹灯牌', en: 'Neon Sign',
    bg: BG, accent: '#ff3496',
    init(S) { WALL = makeWall(S); },
    draw(out, t, S) {
      const ctx = cpu('main');
      draw(ctx, t, S);
      if (!GPAT) GPAT = ctx.createPattern(S.grainTexture(), 'repeat');
      ctx.save(); ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = 'overlay';
      ctx.translate(-((S.hash(Math.floor(t * 24)) * 512) | 0), -((S.hash(Math.floor(t * 24) + 2) * 512) | 0));
      ctx.fillStyle = GPAT; ctx.fillRect(0, 0, 1080 + 512, 1920 + 512); ctx.restore();
      out.drawImage(ctx.canvas, 0, 0);
    },
  });
})();
