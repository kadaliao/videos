// 25 · 生成艺术 · 粒子（压轴）
// 一万多颗粒子沿旋度噪声流场流动（轨迹在 init 里按固定步长一次积分好，逐帧只查表 → 纯函数），
// 加色混合的长拖尾，按速度/位置上色（青 → 紫 → 品红 → 金），第二小节强拍汇聚成巨大的「25」与标题，同时迸发。
(function () {
  const W = 1080, H = 1920, CPU = { willReadFrequently: true };
  const T0 = -0.9, T1 = 4.45, HZ = 60, STEPS = Math.ceil((T1 - T0) * HZ) + 2;
  const N_FREE = 3200, N_NUM = 9000, N_TTL = 2600, N_FLOW = N_FREE + N_NUM + N_TTL, N_BURST = 2600;
  const HIT = 2.0, TRAIL = 7, TH = 1.6 / HZ;
  const TITLE_Y = 330, EN_Y = 432, NUM_Y = 960;

  let traj = null, tgt = null, delay = null, tcol = null, burst = null, lut = null, acc = null, img = null, outline = null, glowNum = null;

  // 调色：青 → 紫 → 品红 → 金
  function makeLUT() {
    const stops = [[0, [34, 225, 255]], [0.36, [123, 92, 255]], [0.68, [255, 63, 180]], [1, [255, 201, 74]]];
    const L = new Float32Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const u = i / 255; let k = 0; while (k < stops.length - 2 && u > stops[k + 1][0]) k++;
      const [u0, c0] = stops[k], [u1, c1] = stops[k + 1], f = (u - u0) / (u1 - u0);
      for (let j = 0; j < 3; j++) L[i * 3 + j] = (c0[j] + (c1[j] - c0[j]) * f) / 255;
    }
    return L;
  }

  // 旋度噪声场（网格预计算，双线性采样）
  function makeField(S) {
    const gs = 12, gw = Math.ceil(W / gs) + 3, gh = Math.ceil(H / gs) + 3, vx = new Float32Array(gw * gh), vy = new Float32Array(gw * gh);
    const psi = (x, y) => S.fbm(x * 0.0013, y * 0.0013, 4.2, 3) + 0.22 * S.noise3(x * 0.0045, y * 0.0045, 9.1);
    const e = 2;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const x = (i - 1) * gs, y = (j - 1) * gs;
      const dy = (psi(x, y + e) - psi(x, y - e)) / (2 * e), dx = (psi(x + e, y) - psi(x - e, y)) / (2 * e);
      vx[j * gw + i] = dy; vy[j * gw + i] = -dx;
    }
    // 归一到典型速度
    let m = 0; for (let i = 0; i < vx.length; i++) m += Math.hypot(vx[i], vy[i]); m /= vx.length;
    const k = 300 / m; for (let i = 0; i < vx.length; i++) { vx[i] *= k; vy[i] *= k; }
    return { gs, gw, gh, vx, vy };
  }
  function sample(F, x, y, out) {
    const fx = x / F.gs + 1, fy = y / F.gs + 1;
    let i = Math.floor(fx), j = Math.floor(fy);
    if (i < 0) i = 0; if (j < 0) j = 0; if (i > F.gw - 2) i = F.gw - 2; if (j > F.gh - 2) j = F.gh - 2;
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fy - j)), a = j * F.gw + i;
    out[0] = (F.vx[a] * (1 - u) + F.vx[a + 1] * u) * (1 - v) + (F.vx[a + F.gw] * (1 - u) + F.vx[a + F.gw + 1] * u) * v;
    out[1] = (F.vy[a] * (1 - u) + F.vy[a + 1] * u) * (1 - v) + (F.vy[a + F.gw] * (1 - u) + F.vy[a + F.gw + 1] * u) * v;
  }

  function targets(S) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = S.F(660, 'ArchivoBlack'); g.fillText('25', W / 2, NUM_Y);
    const d1 = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.font = S.F(104, 'NotoSansSC', 900); g.fillText('生成艺术 · 粒子', W / 2, TITLE_Y);
    const d2 = g.getImageData(0, 0, W, H).data;
    const r = S.rng(2525), pick = (d, n, step) => {
      const pts = [];
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 140) pts.push([x + (r() - 0.5) * step, y + (r() - 0.5) * step]);
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
      const out = []; for (let i = 0; i < n; i++) out.push(pts[i % pts.length]); return out;
    };
    return pick(d1, N_NUM, 3).concat(pick(d2, N_TTL, 2));
  }

  function precompute(S) {
    const F = makeField(S), r = S.rng(77), v = [0, 0];
    traj = new Float32Array(N_FLOW * STEPS * 2);
    const dt = 1 / HZ;
    for (let p = 0; p < N_FLOW; p++) {
      let x = r() * (W + 200) - 100, y = r() * (H + 200) - 100;
      const sp = 0.7 + r() * 0.6, drift = 70 + r() * 50;
      for (let s = 0; s < STEPS; s++) {
        const o = (p * STEPS + s) * 2; traj[o] = x; traj[o + 1] = y;
        // RK2
        sample(F, x, y, v); const mx = x + v[0] * dt * 0.5 * sp, my = y + v[1] * dt * 0.5 * sp;
        sample(F, mx, my, v); x += (v[0] * sp + drift * 0.3) * dt; y += (v[1] * sp - drift) * dt;
        if (x < -120) x += W + 240; else if (x > W + 120) x -= W + 240;
        if (y < -120) y += H + 240; else if (y > H + 120) y -= H + 240;
      }
    }
    const T = targets(S);
    tgt = new Float32Array(N_FLOW * 2); delay = new Float32Array(N_FLOW); tcol = new Uint8Array(N_FLOW);
    for (let p = N_FREE; p < N_FLOW; p++) {
      const [x, y] = T[p - N_FREE]; tgt[p * 2] = x; tgt[p * 2 + 1] = y;
      delay[p] = 1.4 + r() * 0.35;
      tcol[p] = Math.max(0, Math.min(255, Math.round(((x - 110) / 860 * 0.85 + (y - 600) / 900 * 0.15) * 255)));
    }
    // 迸发粒子：从「25」上的点向外炸开
    burst = new Float32Array(N_BURST * 5);
    for (let i = 0; i < N_BURST; i++) {
      const [x, y] = T[Math.floor(r() * N_NUM)], a = Math.atan2(y - NUM_Y, x - W / 2) + (r() - 0.5) * 1.2, s = 500 + r() * 1500;
      burst.set([x, y, Math.cos(a) * s, Math.sin(a) * s, r()], i * 5);
    }
  }

  // 第 p 颗流场粒子在时刻 t 的位置（查表插值），越界返回 null
  const P = [0, 0];
  function flowAt(p, t) {
    let f = (t - T0) * HZ; if (f < 0) f = 0; if (f > STEPS - 1.001) f = STEPS - 1.001;
    const i = Math.floor(f), u = f - i, o = (p * STEPS + i) * 2;
    const x0 = traj[o], y0 = traj[o + 1], x1 = traj[o + 2], y1 = traj[o + 3];
    if (Math.abs(x1 - x0) > 300 || Math.abs(y1 - y0) > 300) { P[0] = x0; P[1] = y0; return P; }
    P[0] = x0 + (x1 - x0) * u; P[1] = y0 + (y1 - y0) * u; return P;
  }
  const inOut3 = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function posAt(S, p, t, out) {
    flowAt(p, t); let x = P[0], y = P[1];
    if (p >= N_FREE && t > delay[p]) {
      const d = delay[p], w = inOut3(Math.min(1, (t - d) / (HIT - d)));
      let tx = tgt[p * 2], ty = tgt[p * 2 + 1];
      // 落位后的微颤（让字在呼吸、闪烁）
      if (t > HIT - 0.2) { const ph = p * 1.7; tx += Math.sin(t * 3.1 + ph) * 2.2; ty += Math.cos(t * 2.7 + ph * 1.3) * 2.2; }
      // 汇聚的路径带一点旋：绕目标转进来
      const sw = (1 - w) * w * 2.2, ang = sw * (p % 2 ? 1 : -1);
      const dx = x - tx, dy = y - ty, ca = Math.cos(ang), sa = Math.sin(ang);
      x = tx + (dx * ca - dy * sa) * (1 - w); y = ty + (dx * sa + dy * ca) * (1 - w);
      out[2] = w;
    } else out[2] = 0;
    out[0] = x; out[1] = y; return out;
  }

  // 加色光栅：线段 DDA 累加
  function seg(x0, y0, x1, y1, r, g, b, i0, i1) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.max(Math.abs(dx), Math.abs(dy)), n = Math.min(60, Math.max(1, Math.ceil(len)));
    // 运动模糊的能量守恒：走得越快，单个像素越暗（避免汇聚时一片过曝）
    const ec = Math.min(1, 14 / (len + 0.001)); i0 *= ec; i1 *= ec;
    for (let k = 0; k < n; k++) {
      const u = k / n, x = (x0 + dx * u) | 0, y = (y0 + dy * u) | 0;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const o = (y * W + x) * 3, it = i0 + (i1 - i0) * u;
      acc[o] += r * it; acc[o + 1] += g * it; acc[o + 2] += b * it;
    }
  }
  function dot(x, y, r, g, b, it) {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) return;
    let o = (y * W + x) * 3; acc[o] += r * it; acc[o + 1] += g * it; acc[o + 2] += b * it;
    o += 3; acc[o] += r * it * 0.5; acc[o + 1] += g * it * 0.5; acc[o + 2] += b * it * 0.5;
    o += W * 3 - 3; acc[o] += r * it * 0.5; acc[o + 1] += g * it * 0.5; acc[o + 2] += b * it * 0.5;
  }

  function makeOutline(S) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = S.F(660, 'ArchivoBlack');
    const gr = g.createLinearGradient(110, 0, 970, 0);
    gr.addColorStop(0, '#22e1ff'); gr.addColorStop(0.4, '#7b5cff'); gr.addColorStop(0.75, '#ff3fb4'); gr.addColorStop(1, '#ffc94a');
    g.strokeStyle = gr; g.lineWidth = 4; g.setLineDash([14, 10]); g.strokeText('25', W / 2, NUM_Y);
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const g2 = c2.getContext('2d', CPU);
    g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.font = S.F(660, 'ArchivoBlack'); g2.fillStyle = gr; g2.fillText('25', W / 2, NUM_Y);
    const small = document.createElement('canvas'); small.width = 270; small.height = 480; const sg = small.getContext('2d', CPU);
    sg.filter = 'blur(10px)'; sg.drawImage(c2, 0, 0, 270, 480);
    outline = c; glowNum = small;
  }

  registerScene({
    n: 25, key: 'particles', zh: '生成艺术 · 粒子', en: 'Generative Particles',
    bg: '#05040c', accent: '#ff3fb4',
    init: async (S) => {
      lut = makeLUT(); precompute(S); makeOutline(S);
      acc = new Float32Array(W * H * 3);
    },
    draw(ctx, t, S) {
      acc.fill(0);
      const o3 = [0, 0, 0], q3 = [0, 0, 0];
      const beat = S.pulse(t, 6), formed = S.smooth(1.85, 2.05, t);
      // 流场粒子（含将要汇聚的）
      for (let p = 0; p < N_FLOW; p++) {
        posAt(S, p, t, o3);
        let x = o3[0], y = o3[1], w = o3[2];
        // 颜色：速度 → 调色板；汇聚后按目标位置上色
        posAt(S, p, t - TH, q3);
        const sp = Math.min(1, Math.hypot(x - q3[0], y - q3[1]) / (TH * 900));
        const uf = Math.min(1, Math.max(0, 0.5 * x / W + 0.25 * (1 - y / H) + 0.45 * sp - 0.12));
        const u = p < N_FREE ? uf : (1 - w) * uf + w * tcol[p] / 255;
        const ci = Math.max(0, Math.min(255, Math.round(u * 255))) * 3, r = lut[ci], g = lut[ci + 1], b = lut[ci + 2];
        const base = p < N_FREE ? 0.75 : 0.2 + 0.1 * S.smooth(delay[p] - 0.6, delay[p], t) + 0.35 * w;
        if (w > 0.98) {  // 落位：亮点 + 极短的颤动尾
          const tw = 0.75 + 0.25 * Math.sin(t * 9 + p * 2.3);
          dot(x, y, r, g, b, (0.9 + beat * 0.6) * tw);
          seg(q3[0], q3[1], x, y, r, g, b, 0.0, 0.5);
          continue;
        }
        let px = x, py = y, pi = base;
        for (let k = 1; k <= TRAIL; k++) {
          posAt(S, p, t - TH * k * 1.6, q3);
          const ni = base * (1 - k / (TRAIL + 1));
          if (Math.abs(q3[0] - px) < 260 && Math.abs(q3[1] - py) < 260) seg(q3[0], q3[1], px, py, r, g, b, ni, pi);
          px = q3[0]; py = q3[1]; pi = ni;
        }
      }
      // 迸发：第二小节强拍
      if (t >= HIT) {
        const tau = t - HIT, kd = 2.6;
        for (let i = 0; i < N_BURST; i++) {
          const o = i * 5, x0 = burst[o], y0 = burst[o + 1], vx = burst[o + 2], vy = burst[o + 3], rnd = burst[o + 4];
          const life = Math.exp(-tau * (1.2 + rnd)); if (life < 0.03) continue;
          const f = (1 - Math.exp(-kd * tau)) / kd, f2 = (1 - Math.exp(-kd * Math.max(0, tau - 0.05))) / kd;
          const x = x0 + vx * f, y = y0 + vy * f + 60 * tau * tau, xb = x0 + vx * f2, yb = y0 + vy * f2 + 60 * Math.max(0, tau - 0.05) ** 2;
          const ci = Math.round(150 + rnd * 105) * 3;
          seg(xb, yb, x, y, lut[ci], lut[ci + 1], lut[ci + 2], 0, 1.6 * life);
        }
      }

      // 色调映射（Reinhard）→ ImageData
      const L = S.layer('s25-p', W, H), lg = L.getContext('2d', CPU);
      if (!img) img = lg.createImageData(W, H);
      const d = img.data, ex = 1.0 + beat * 0.2;
      for (let i = 0, j = 0; i < acc.length; i += 3, j += 4) {
        const r = acc[i] * ex, g = acc[i + 1] * ex, b = acc[i + 2] * ex;
        d[j] = 255 * r / (1 + r); d[j + 1] = 255 * g / (1 + g); d[j + 2] = 255 * b / (1 + b); d[j + 3] = 255;
      }
      lg.putImageData(img, 0, 0);

      const M = S.layer('s25-main', W, H), g = M.getContext('2d', CPU);
      g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // 深色背景：暗紫渐变 + 星尘
      const bgG = g.createRadialGradient(W / 2, NUM_Y, 100, W / 2, NUM_Y, 1300);
      bgG.addColorStop(0, '#140c2a'); bgG.addColorStop(0.6, '#08061a'); bgG.addColorStop(1, '#030208');
      g.fillStyle = bgG; g.fillRect(0, 0, W, H);
      // 「25」虚线轮廓：开场就在，等粒子来填
      // 汇聚后的柔光字底
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * formed + 0.25 * formed * beat; g.drawImage(glowNum, 0, 0, W, H);
      g.globalAlpha = 1;
      // 粒子层（加色）+ 两级辉光
      g.drawImage(L, 0, 0);
      const G1 = S.layer('s25-g1', 270, 480), g1 = G1.getContext('2d', CPU);
      g1.globalCompositeOperation = 'source-over'; g1.imageSmoothingEnabled = true; g1.imageSmoothingQuality = 'high'; g1.drawImage(L, 0, 0, 270, 480);
      const G2 = S.layer('s25-g2', 90, 160), g2 = G2.getContext('2d', CPU);
      g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high'; g2.drawImage(G1, 0, 0, 90, 160);
      g.globalAlpha = 0.9; g.drawImage(G1, 0, 0, W, H);
      g.globalAlpha = 0.8; g.drawImage(G2, 0, 0, W, H);
      // 「25」虚线轮廓：开场就在，等粒子来填
      const ok = S.clamp((t + 0.1) / 0.6);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = ok * (0.85 - 0.75 * formed); g.drawImage(outline, 0, 0);
      g.globalCompositeOperation = 'lighter';
      // 冲击波环
      if (t >= HIT && t < HIT + 0.8) {
        const k = (t - HIT) / 0.8, R = 80 + 900 * S.E.out3(k);
        g.globalAlpha = (1 - k) * 0.8; g.lineWidth = 6 * (1 - k) + 1;
        const rg = g.createRadialGradient(W / 2, NUM_Y, R * 0.9, W / 2, NUM_Y, R);
        g.strokeStyle = '#ffd9f2'; g.beginPath(); g.arc(W / 2, NUM_Y, R, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = (1 - k) * 0.35; g.fillStyle = 'rgba(255,120,220,0.5)'; g.beginPath(); g.arc(W / 2, NUM_Y, R * 0.6, 0, Math.PI * 2); g.fill();
      }
      if (t >= HIT && t < HIT + 0.1) { g.globalAlpha = 1 - (t - HIT) / 0.1; g.fillStyle = 'rgba(255,240,250,0.55)'; g.fillRect(0, 0, W, H); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

      // 标题：细腻的白字 + 渐变英文（开场 0–0.6 内入场）
      const tk = S.clamp((t + 0.05) / 0.5), ek = S.clamp((t - 0.15) / 0.45);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.globalAlpha = S.E.out3(tk) * (0.92 - 0.25 * formed);
      g.shadowColor = 'rgba(160,120,255,0.9)'; g.shadowBlur = 30;
      g.font = S.F(104, 'NotoSansSC', 900); g.letterSpacing = `${(1 - S.E.out3(tk)) * 40}px`; g.fillStyle = '#f4f0ff';
      g.fillText('生成艺术 · 粒子', W / 2, TITLE_Y); g.letterSpacing = '0px';
      g.restore();
      g.save(); g.globalAlpha = S.E.out3(ek);
      g.font = S.F(52, 'SpaceGrotesk', 700); g.letterSpacing = '14px';
      const eg = g.createLinearGradient(220, 0, 860, 0);
      eg.addColorStop(0, '#22e1ff'); eg.addColorStop(0.4, '#7b5cff'); eg.addColorStop(0.75, '#ff3fb4'); eg.addColorStop(1, '#ffc94a');
      g.fillStyle = eg; g.shadowColor = 'rgba(255,63,180,0.6)'; g.shadowBlur = 20;
      g.fillText('GENERATIVE PARTICLES', W / 2 + 7, EN_Y); g.letterSpacing = '0px';
      g.restore();
      // 底部的终章小字
      g.save(); g.globalAlpha = S.clamp((t - 0.3) / 0.5) * 0.85;
      g.font = S.F(34, 'SpaceGrotesk', 700); g.letterSpacing = '10px'; g.fillStyle = '#b8a8ff';
      g.fillText('STYLE 25 / 25  ·  FINALE', W / 2 + 5, 1470); g.letterSpacing = '0px';
      g.fillStyle = 'rgba(184,168,255,0.5)'; g.fillRect(W / 2 - 160, 1505, 320 * S.clamp((t - 0.3) / 1.2), 2);
      g.restore();
      g.restore();
      ctx.drawImage(M, 0, 0);
    },
  });
})();
