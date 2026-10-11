// 04 线条动画 · Single-line Art
// 一根连续的金线：肩 → 侧脸轮廓 → 发髻 → 一缕发丝升起绕成月亮（闭合时金色向内灌满）→ 飞鸟 → 收笔。
// 路径用 Catmull-Rom 采样成稠密折线，再做弧长参数化，绘制速度可控；镜头平滑跟随笔尖，最后拉远全景。
(function () {
  const NAVY = '#0a0f1f';
  const GOLD = [214, 182, 122];     // 低饱和暖金
  const HOT = [255, 246, 226];      // 笔尖刚画过的白热

  // ---------- 路径 ----------
  function catmull(pts, per = 18) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(4, Math.ceil(d / 6));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, e) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }

  // 局部坐标（约 0..1000），之后映射到画面
  const MOON = { x: 192, y: 64, r: 122 };
  function buildPath() {
    const A = [
      [-60, 1012], [80, 1004], [230, 996], [400, 988], [520, 968], [585, 925], [600, 870],
      // 颈前、下巴、唇、鼻、眉、额
      [588, 800], [590, 748], [612, 716], [652, 700], [676, 684], [674, 662], [656, 646], [676, 628], [660, 612],
      [682, 596], [668, 574], [672, 556], [718, 536], [700, 506], [682, 470], [668, 440],
      // 闭眼：从鼻梁弯进去再回来
      [640, 446], [604, 444], [626, 452], [648, 446], [668, 424],
      [672, 396], [664, 350], [640, 290], [598, 238], [530, 202], [450, 190], [376, 210], [326, 252], [304, 306],
      // 发髻漩涡
      [296, 352], [252, 350], [222, 384], [232, 432], [272, 450], [308, 422], [302, 390], [270, 394], [262, 410],
      // 从发髻升起的一缕发丝
      [244, 384], [216, 330], [204, 276], [206, 230],
    ];
    const ang0 = Math.PI * 0.46;
    A.push([MOON.x + Math.cos(ang0) * MOON.r, MOON.y + Math.sin(ang0) * MOON.r]);
    const a = catmull(A);
    const moon = [];
    const N = 240;
    for (let k = 1; k <= N; k++) {
      const ang = ang0 - (k / N) * Math.PI * 2;
      moon.push([MOON.x + Math.cos(ang) * MOON.r, MOON.y + Math.sin(ang) * MOON.r]);
    }
    const last = moon[moon.length - 1];
    // 出月亮 → 越过头顶 → 飞鸟（两翼一身）→ 收笔的长尾
    // 飞鸟（海鸥）：翼尖与身体处用重复点做出尖角
    const bx = 790, by = 16, bw = 140, br = -0.22;
    const G = ([x, y]) => [bx + (x * Math.cos(br) - y * Math.sin(br)) * bw, by + (x * Math.sin(br) + y * Math.cos(br)) * bw];
    const bez = (p0, p1, p2, p3, n = 60) => {
      const o = [];
      for (let k = 1; k <= n; k++) {
        const u = k / n, v = 1 - u;
        o.push([v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
          v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]);
      }
      return o;
    };
    // 飞鸟：从下方进入身体，左翼外缘出、内缘回；右翼同理；再向右下拖出长尾
    const BD = G([0, 0.12]), TL = G([-1.05, 0.02]), B2 = G([-0.02, 0.2]), TR = G([1.05, -0.04]), B3 = G([0.05, 0.22]);
    const b = [
      ...bez(last, [300, 230], [500, 250], G([-0.9, 0.75]), 90),                       // 出月亮，掠过头顶
      ...bez(G([-0.9, 0.75]), G([-0.5, 0.62]), G([-0.12, 0.45]), BD, 30),
      ...bez(BD, G([-0.22, -0.34]), G([-0.68, -0.34]), TL, 60),                       // 左翼外缘
      ...bez(TL, G([-0.7, -0.06]), G([-0.3, 0.06]), B2, 50),                          // 左翼内缘
      ...bez(B2, G([0.24, -0.4]), G([0.7, -0.38]), TR, 60),                           // 右翼外缘
      ...bez(TR, G([0.7, -0.08]), G([0.32, 0.08]), B3, 50),                           // 右翼内缘
      ...bez(B3, G([0.2, 0.5]), G([0.6, 0.85]), G([1.3, 0.92]), 50),                   // 尾
      ...bez(G([1.3, 0.92]), G([1.7, 0.94]), G([2.1, 0.86]), G([2.6, 0.7]), 50),      // 长尾出画
    ];
    const pts = [...a, ...moon, ...b];
    const len = new Float32Array(pts.length);
    for (let i = 1; i < pts.length; i++) len[i] = len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return { pts, len, total: len[len.length - 1], moonStart: len[a.length - 1], moonEnd: len[a.length - 1 + N] };
  }

  let P = null;
  // 局部 → 世界（画面坐标，镜头 1x 时）
  const SC = 1.0, OX = 540 - 530 * SC, OY = 248, MIDY = OY + 475 * SC;
  const wx = x => OX + x * SC, wy = y => OY + y * SC;

  function idxAt(L) {
    const len = P.len; let lo = 0, hi = len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] <= L) lo = m; else hi = m; }
    return lo;
  }
  function pointAt(L) {
    L = Math.max(0, Math.min(P.total, L));
    const i = idxAt(L), j = Math.min(i + 1, P.pts.length - 1), d = P.len[j] - P.len[i] || 1, k = (L - P.len[i]) / d;
    return [P.pts[i][0] + (P.pts[j][0] - P.pts[i][0]) * k, P.pts[i][1] + (P.pts[j][1] - P.pts[i][1]) * k];
  }

  // 弧长随时间：分段关键帧（单调），月亮在 t=2.0 闭合
  function lengthAt(t, S) {
    const K = [[-0.4, 120], [0.0, 520], [1.32, P.moonStart], [2.0, P.moonEnd], [2.3, P.moonEnd + 170], [2.8, P.total]];
    if (t <= K[0][0]) return K[0][1];
    for (let i = 0; i < K.length - 1; i++) {
      const [t0, l0] = K[i], [t1, l1] = K[i + 1];
      if (t <= t1) {
        let k = (t - t0) / (t1 - t0);
        if (i === K.length - 2) k = 1 - Math.pow(1 - k, 1.8);      // 收笔减速
        return l0 + (l1 - l0) * k;
      }
    }
    return P.total;
  }

  const col = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  function strokeRange(ctx, L0, L1) {
    if (L1 <= L0) return;
    const i0 = idxAt(L0), i1 = idxAt(L1);
    const p0 = pointAt(L0), p1 = pointAt(L1);
    ctx.beginPath(); ctx.moveTo(wx(p0[0]), wy(p0[1]));
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(wx(P.pts[i][0]), wy(P.pts[i][1]));
    ctx.lineTo(wx(p1[0]), wy(p1[1]));
    ctx.stroke();
  }

  // 背景：深海军蓝 + 中心微光 + 暗角 + 星尘（全部矢量/渐变，避免整屏贴图）
  let STARS = null, GPAT = null;
  function drawBG(ctx, S) {
    ctx.fillStyle = NAVY; ctx.fillRect(0, 0, 1080, 1920);
    let gr = ctx.createRadialGradient(540, 760, 80, 540, 900, 1250);
    gr.addColorStop(0, 'rgba(34,44,74,0.85)'); gr.addColorStop(0.5, 'rgba(16,22,42,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1080, 1920);
    gr = ctx.createRadialGradient(540, 900, 600, 540, 900, 1300);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,6,0.85)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1080, 1920);
    if (!STARS) { const r = S.rng(404); STARS = Array.from({ length: 140 }, () => [r() * 1080, r() * 1300, r()]); }
    for (const [x, y, s] of STARS) {
      ctx.fillStyle = `rgba(230,210,170,${0.05 + s * 0.18})`;
      ctx.fillRect(x, y, 1 + s * 2, 1 + s * 2);
    }
  }
  function grainFill(ctx, S, seed, a) {
    if (!GPAT) GPAT = ctx.createPattern(S.grainTexture(), 'repeat');
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
    ctx.translate(-((S.hash(seed) * 512) | 0), -((S.hash(seed + 3.3) * 512) | 0));
    ctx.fillStyle = GPAT; ctx.fillRect(0, 0, 1080 + 512, 1920 + 512); ctx.restore();
  }

  // 整幅先画在 CPU 画布上（软件光栅化远快于 SwiftShader 的 GPU 画布），最后一次性贴回
  let CPU = null;
  function cpuCtx() {
    if (!CPU) { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; CPU = c.getContext('2d', { willReadFrequently: true }); }
    const g = CPU;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetX = g.shadowOffsetY = 0; g.setLineDash([]);
    g.lineCap = 'butt'; g.lineJoin = 'miter'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px'; g.lineWidth = 1;
    return g;
  }

  const SMALL = {};
  function smallCtx(k) {
    if (!SMALL[k]) { const c = document.createElement('canvas'); c.width = 270; c.height = 480; SMALL[k] = c.getContext('2d', { willReadFrequently: true }); }
    const g = SMALL[k]; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    return g;
  }

  registerScene({
    n: 4, key: 'line', zh: '线条动画', en: 'Single-line Art',
    bg: NAVY, accent: '#d6b67a',
    init(S) { P = buildPath(); },

    draw(ctx, t, S) {
      const g = cpuCtx(); drawInner(g, t, S); ctx.drawImage(g.canvas, 0, 0);
    },
  });

  function drawInner(ctx, t, S) {
      const { E, clamp, seg, lerp, smooth } = S;
      if (!P) P = buildPath();
      drawBG(ctx, S);

      const L = lengthAt(t, S);
      const tip = pointAt(L);

      // ---------- 镜头：平滑跟随笔尖（过去 0.35s 的加权平均），最后拉远 ----------
      let sx = 0, sy = 0, sw = 0;
      for (let k = 0; k < 8; k++) {
        const w = 1 - k / 9, q = pointAt(lengthAt(t - k * 0.05, S));
        sx += wx(q[0]) * w; sy += wy(q[1]) * w; sw += w;
      }
      sx /= sw; sy /= sw;
      const pull = E.inOut3(seg(t, 2.65, 3.4));
      const zoomIn = 1.42 + 0.06 * Math.sin(t * 1.3);
      const z = lerp(zoomIn, 1.0, pull);
      const cx = lerp(sx, 540, pull), cy = lerp(sy, MIDY, pull);
      const ax = 540, ay = lerp(700, MIDY, pull);       // 笔尖在屏幕上的锚点

      // ---------- 视差金尘（不同景深，镜头移动时产生纵深）----------
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const d = 0.35 + 0.9 * S.hash(i * 3.3);                    // 景深系数：<1 远，>1 近
        const px = S.hash(i * 7.1) * 1300 - 110, py = S.hash(i * 5.7) * 1500 + 60 + Math.sin(t * 0.8 + i) * 12;
        const x = ax + (px - cx) * z * d, y = ay + (py - cy) * z * d;
        const r = (d > 1 ? 16 : 6) * d * (0.8 + 0.4 * S.hash(i));
        const a = (d > 1 ? 0.10 : 0.16) * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7));
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(240,200,130,${a})`); g.addColorStop(1, 'rgba(240,200,130,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.restore();

      const CAM = [ax, ay, z, cx, cy];
      ctx.save();
      ctx.translate(ax, ay); ctx.scale(z, z); ctx.translate(-cx, -cy);

      // ---------- 月亮：闭合后金色向内灌满 ----------
      const fillK = seg(t, 2.0, 2.55);
      const mx = wx(MOON.x), my = wy(MOON.y), mr = MOON.r * SC;
      if (fillK > 0) {
        const inner = mr * (1 - E.out3(fillK));
        ctx.save();
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, S.TAU); ctx.arc(mx, my, Math.max(0, inner), 0, S.TAU, true);
        const g = ctx.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, mr * 0.1, mx, my, mr);
        g.addColorStop(0, '#f3dcaa'); g.addColorStop(0.6, '#d9b36e'); g.addColorStop(1, '#b88d4c');
        ctx.fillStyle = g; ctx.fill('evenodd');
        // 灌入的前沿：一圈亮边
        if (fillK < 1) {
          ctx.strokeStyle = `rgba(255,244,220,${0.9 * (1 - fillK)})`; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(mx, my, Math.max(0, inner), 0, S.TAU); ctx.stroke();
        }
        // 月面上的细线纹理（同一支笔的排线）
        ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr - 3, 0, S.TAU); ctx.arc(mx, my, Math.max(0, inner), 0, S.TAU, true); ctx.clip('evenodd');
        // 环形山（淡）+ 右下的明暗交界
        ctx.fillStyle = 'rgba(150,108,52,0.22)';
        for (const [u, v, r] of [[-0.3, -0.2, 0.22], [0.25, 0.3, 0.16], [0.35, -0.35, 0.1], [-0.1, 0.45, 0.09], [-0.5, 0.25, 0.07]]) {
          ctx.beginPath(); ctx.arc(mx + u * mr, my + v * mr, r * mr, 0, S.TAU); ctx.fill();
        }
        const sh = ctx.createRadialGradient(mx - mr * 0.45, my - mr * 0.45, mr * 0.9, mx - mr * 0.3, my - mr * 0.3, mr * 1.7);
        sh.addColorStop(0, 'rgba(90,60,20,0)'); sh.addColorStop(1, 'rgba(90,60,20,0.45)');
        ctx.fillStyle = sh; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
        ctx.restore();
        ctx.restore();
        // 闭合瞬间的光环
        const ring = seg(t, 2.0, 2.7);
        if (ring > 0 && ring < 1) {
          ctx.strokeStyle = `rgba(255,236,200,${0.55 * (1 - ring)})`; ctx.lineWidth = 3 * (1 - ring) + 1;
          ctx.beginPath(); ctx.arc(mx, my, mr * (1 + E.out3(ring) * 0.9), 0, S.TAU); ctx.stroke();
        }
        // 全景时柔光晕
        const halo = ctx.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 2.6);
        halo.addColorStop(0, `rgba(230,190,120,${0.22 * E.out3(fillK)})`); halo.addColorStop(1, 'rgba(230,190,120,0)');
        ctx.fillStyle = halo; ctx.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
      }

      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // 柔光底（宽、淡、加色）
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col(GOLD, 0.13); ctx.lineWidth = 11; strokeRange(ctx, 0, L);
      ctx.restore();
      // 主线
      ctx.strokeStyle = col(GOLD, 1); ctx.lineWidth = 4.2; strokeRange(ctx, 0, L);
      // 月亮填满后，月内的线改成深色（反白）
      if (fillK > 0.6) {
        ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr - 2.5, 0, S.TAU); ctx.clip();
        ctx.strokeStyle = `rgba(40,30,20,${seg(fillK, 0.6, 1)})`; ctx.lineWidth = 4.2; strokeRange(ctx, 0, L);
        ctx.restore();
      }
      // 冷却的尾巴：越靠近笔尖越白越亮
      const heat = 1 - S.E.inOut2(seg(t, 2.8, 3.4));
      const tail = 520 * heat, steps = 14;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt';
      for (let i = 0; i < steps; i++) {
        const a = L - tail * (1 - i / steps), b = L - tail * (1 - (i + 1) / steps);
        const k = (i + 1) / steps;
        ctx.strokeStyle = col(mix(GOLD, HOT, k * k), (0.10 + 0.5 * k * k) * heat); ctx.lineWidth = 4 + 5 * k * k;
        strokeRange(ctx, Math.max(0, a), Math.max(0, b));
      }
      ctx.restore();
      if (heat > 0) { ctx.strokeStyle = col(mix(GOLD, HOT, heat), 1); ctx.lineWidth = 4.6; strokeRange(ctx, Math.max(0, L - 90), L); }

      const tipA = 1 - seg(t, 2.8, 3.15);
      // 笔尖迸出的金色火星：每 1/40 秒从当时的笔尖位置生出一颗，解析运动
      if (tipA > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const life = 0.55, dt = 1 / 40;
        for (let ts = Math.floor((t - life) / dt) * dt; ts <= t; ts += dt) {
          const id = Math.round(ts / dt), age = t - ts;
          if (age < 0 || age > life || ts > 2.8) continue;
          const q = pointAt(lengthAt(ts, S));
          const ang = S.hash(id) * S.TAU, sp = 30 + 70 * S.hash(id + 0.5);
          const x = wx(q[0]) + Math.cos(ang) * sp * age, y = wy(q[1]) + Math.sin(ang) * sp * age + 60 * age * age;
          const k = 1 - age / life;
          ctx.fillStyle = col(mix(GOLD, HOT, k), 0.8 * k);
          const r = 1 + 2.2 * k;
          ctx.fillRect(x - r / 2, y - r / 2, r, r);
        }
        ctx.restore();
      }
      // 笔尖：亮点 + 节拍脉冲光晕
      if (tipA > 0) {
        const px = wx(tip[0]), py = wy(tip[1]);
        const pu = S.pulse(t, 7);
        const R = 46 + 30 * pu;
        const g = ctx.createRadialGradient(px, py, 0, px, py, R);
        g.addColorStop(0, `rgba(255,250,235,${0.95 * tipA})`); g.addColorStop(0.15, `rgba(255,232,190,${0.55 * tipA})`);
        g.addColorStop(0.5, `rgba(214,170,100,${0.16 * tipA})`); g.addColorStop(1, 'rgba(214,170,100,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
        ctx.fillRect(px - R, py - R, R * 2, R * 2); ctx.restore();
        ctx.fillStyle = `rgba(255,255,248,${tipA})`; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, S.TAU); ctx.fill();
      }
      ctx.restore();

      // ---------- 辉光：只把金线与月亮在 1/4 分辨率上重画、模糊后加色叠回 ----------
      {
        const A = smallCtx('a'), B = smallCtx('b');
        A.clearRect(0, 0, 270, 480); B.clearRect(0, 0, 270, 480);
        A.save(); A.scale(0.25, 0.25); A.translate(CAM[0], CAM[1]); A.scale(CAM[2], CAM[2]); A.translate(-CAM[3], -CAM[4]);
        A.lineCap = 'round'; A.lineJoin = 'round';
        A.strokeStyle = col(GOLD, 0.9); A.lineWidth = 7; strokeRange(A, 0, L);
        A.strokeStyle = col(HOT, 1); A.lineWidth = 12; strokeRange(A, Math.max(0, L - 260 * heat), L);
        if (fillK > 0) { A.fillStyle = col(GOLD, 0.32 * fillK); A.beginPath(); A.arc(mx, my, mr, 0, S.TAU); A.fill(); }
        A.restore();
        B.filter = 'blur(5px)'; B.drawImage(A.canvas, 0, 0); B.filter = 'none';
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75;
        ctx.drawImage(B.canvas, 0, 0, 1080, 1920); ctx.restore();
      }

      // ---------- 画框：细金线角标（屏幕空间）----------
      const fr = E.out3(seg(t, -0.4, 0.4));
      ctx.strokeStyle = col(GOLD, 0.5); ctx.lineWidth = 2;
      const m = 52, cl = 90 * fr;
      for (const [x, y, dx, dy] of [[m, m, 1, 1], [1080 - m, m, -1, 1], [m, 1920 - m, 1, -1], [1080 - m, 1920 - m, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(x + dx * cl, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * cl); ctx.stroke();
      }

      // ---------- 标题（屏幕空间，底部）----------
      const tg = ctx.createLinearGradient(0, 1150, 0, 1920);
      tg.addColorStop(0, 'rgba(8,12,26,0)'); tg.addColorStop(0.26, 'rgba(8,12,26,0.8)'); tg.addColorStop(0.6, 'rgba(8,12,26,0.86)'); tg.addColorStop(1, 'rgba(8,12,26,0.6)');
      ctx.fillStyle = tg; ctx.fillRect(0, 1150, 1080, 770);

      const tIn = t + 0.15;
      // 金线下划线：一笔划过
      const ul = E.inOut3(seg(tIn, 0.0, 0.7));
      ctx.strokeStyle = col(GOLD, 0.9); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(110, 1318); ctx.lineTo(110 + 860 * ul, 1318); ctx.stroke();
      if (ul > 0 && ul < 1) { ctx.fillStyle = col(HOT, 1); ctx.beginPath(); ctx.arc(110 + 860 * ul, 1318, 5, 0, 7); ctx.fill(); }

      const a1 = E.out3(seg(tIn, 0.0, 0.55)), a2 = E.out3(seg(tIn, 0.12, 0.65)), a3 = E.out3(seg(tIn, 0.25, 0.8));
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      if (a1 > 0) {
        ctx.globalAlpha = a1; ctx.font = S.F(250, 'PlayfairBI', 900);
        const ng = ctx.createLinearGradient(0, 1320, 0, 1520); ng.addColorStop(0, '#f1dcae'); ng.addColorStop(1, '#b48a4a');
        ctx.fillStyle = ng; ctx.fillText('04', 96 - 30 * (1 - a1), 1520);
      }
      if (a2 > 0) {
        ctx.globalAlpha = a2; ctx.font = S.F(116, 'NotoSerifSC', 900); ctx.fillStyle = '#efe2c6';
        S.chars(ctx, '线条动画', 420 + 24 * (1 - a2), 'left', 10).forEach(c => ctx.fillText(c.ch, c.x, 1448));
      }
      if (a3 > 0) {
        ctx.globalAlpha = a3; ctx.font = S.F(74, 'InstrumentSerif'); ctx.fillStyle = col(GOLD, 1);
        ctx.fillText('Single-line Art', 424 + 24 * (1 - a3), 1528);
        ctx.globalAlpha = a3 * 0.75; ctx.font = S.F(34, 'InstrumentSerif'); ctx.textAlign = 'right';
        ctx.fillText('one line · never lifted', 970, 1300);
      }
      ctx.globalAlpha = 1;
      grainFill(ctx, S, Math.floor(t * 15), 0.06);
  }
})();
