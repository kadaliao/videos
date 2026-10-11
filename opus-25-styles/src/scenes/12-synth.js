// 12 复古 Synthwave · Retro Synthwave VHS
// 条纹落日 + 线框山 + 棕榈剪影 + 向消失点匀速流动的发光透视网格 + 尾灯霓虹的跑车背影；
// 铬金属分割字标题，霓虹先闪后稳，元素推入即停并白闪；扫描线、色差、噪点、录像机角标与偶发磁带撕裂。
(function () {
  const BG = '#0b0016';
  const MAG = [255, 46, 166], CYA = [40, 236, 255], GOLD = [255, 214, 92], CORAL = [255, 92, 112];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const HY = 1060, VPX = 540;          // 地平线 / 消失点

  let STARS = null, RIDGE_F = null, RIDGE_N = null, GPAT = null, SCAN = null;
  function prep(S) {
    if (STARS) return;
    const r = S.rng(1212);
    STARS = Array.from({ length: 120 }, () => [r() * 1080, r() * 900, r(), r() * 6]);
    const ridge = (seed, base, amp, valley) => {
      const pts = [];
      for (let i = 0; i <= 36; i++) {
        const x = -40 + i * (1160 / 36);
        const v = Math.abs(x - VPX) / 540;
        const env = Math.pow(S.clamp(v * 1.25), valley);
        const n = 0.55 + 0.45 * S.noise2(i * 0.42 + seed, seed * 2.1);
        const jag = (i % 2 ? 0.75 : 1);
        pts.push([x, HY - (base + amp * n * jag) * env]);
      }
      return pts;
    };
    RIDGE_F = ridge(3.3, 40, 230, 1.3);
    RIDGE_N = ridge(7.7, 20, 170, 1.7);
  }

  // ---------- 天空 / 太阳 / 山 ----------
  function sky(ctx, S, t) {
    const g = ctx.createLinearGradient(0, 0, 0, HY);
    g.addColorStop(0, '#07000f'); g.addColorStop(0.45, '#1c0436'); g.addColorStop(0.8, '#470b5e'); g.addColorStop(1, '#7a1667');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, HY + 2);
    for (const [x, y, s, ph] of STARS) {
      const tw = 0.5 + 0.5 * Math.sin(t * (2 + s * 4) + ph);
      ctx.fillStyle = `rgba(255,230,255,${(0.15 + 0.6 * s) * (0.5 + 0.5 * tw) * (1 - y / 1000)})`;
      const z = 1 + s * 2; ctx.fillRect(x, y, z, z);
    }
  }
  function sun(ctx, S, t, push) {
    const cx = VPX, cy = 820 + 30 * (1 - push), r = 300 * (0.9 + 0.1 * push);
    // 光晕
    let g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.1);
    g.addColorStop(0, 'rgba(255,90,140,0.42)'); g.addColorStop(0.4, 'rgba(255,60,160,0.14)'); g.addColorStop(1, 'rgba(255,60,160,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, S.TAU); ctx.clip();
    ctx.beginPath(); ctx.rect(cx - r, cy - r, r * 2, r * 2);
    // 条纹缺口：越往下越宽，缓慢上移
    const sp = (t * 34) % 46;
    for (let k = 0; k < 12; k++) {
      const y = cy - r * 0.05 + k * 46 - sp;
      const f = S.clamp((y - (cy - r * 0.1)) / (r * 1.1));
      const h = 3 + 22 * f;
      if (y > cy - r * 0.1) ctx.rect(cx - r, y, r * 2, h);
    }
    g = ctx.createLinearGradient(0, cy - r, 0, cy + r * 0.8);
    g.addColorStop(0, rgba(GOLD)); g.addColorStop(0.45, '#ff9a5a'); g.addColorStop(0.75, rgba(CORAL)); g.addColorStop(1, '#ff3d8b');
    ctx.fillStyle = g; ctx.fill('evenodd');
    ctx.restore();
  }
  function mountains(ctx, S, t, pts, fill, edge, wire, depth) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], HY);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(pts[pts.length - 1][0], HY); ctx.closePath();
    const g = ctx.createLinearGradient(0, HY - 280, 0, HY);
    g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
    ctx.fillStyle = g; ctx.fill();
    // 线框：峰顶到底边的三角网
    ctx.strokeStyle = wire; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (HY - y0 < 8 && HY - y1 < 8) continue;
      const mx = (x0 + x1) / 2;
      ctx.moveTo(x0, y0); ctx.lineTo(mx + (i % 2 ? 18 : -18), HY);
      ctx.moveTo(x1, y1); ctx.lineTo(mx + (i % 2 ? 18 : -18), HY);
      // 中间一条等高线
      ctx.moveTo(x0, y0 + (HY - y0) * 0.5); ctx.lineTo(x1, y1 + (HY - y1) * 0.5);
    }
    ctx.stroke();
    // 山脊发光边
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[7, 0.18], [2.5, 0.95]]) {
      ctx.strokeStyle = edge.replace('A', a); ctx.lineWidth = w; ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 地面网格 ----------
  function floor(ctx, S, t, speed) {
    const g = ctx.createLinearGradient(0, HY, 0, 1920);
    g.addColorStop(0, '#2a0640'); g.addColorStop(0.25, '#13021f'); g.addColorStop(1, '#05000a');
    ctx.fillStyle = g; ctx.fillRect(0, HY, 1080, 1920 - HY);
    // 地平线辉光
    const hg = ctx.createLinearGradient(0, HY - 50, 0, HY + 90);
    hg.addColorStop(0, 'rgba(255,60,170,0)'); hg.addColorStop(0.36, 'rgba(255,60,170,0.55)'); hg.addColorStop(1, 'rgba(255,60,170,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, HY - 50, 1080, 140);

    const H0 = 1920 - HY, CAM = 260;     // 相机高度（像素当量）
    ctx.save(); ctx.beginPath(); ctx.rect(0, HY, 1080, H0); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const zOff = (t * speed) % 1;
    const path = () => {
      ctx.beginPath();
      // 横线：z = 1..30，等距世界空间，匀速流向镜头
      for (let k = 0; k < 34; k++) {
        const z = (k + 1 - zOff) * 0.9;
        if (z <= 0.05) continue;
        const y = HY + CAM / z;
        if (y > 1930) continue;
        ctx.moveTo(0, y); ctx.lineTo(1080, y);
      }
      // 纵线：从消失点放射
      for (let i = -22; i <= 22; i++) {
        const xb = VPX + i * 120 * 4.2;
        ctx.moveTo(VPX + i * 3.2, HY); ctx.lineTo(xb, 1920 + 600);
      }
    };
    path();
    ctx.strokeStyle = rgba(MAG, 0.16); ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = rgba(MAG, 0.85); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
    // 远处雾化：地平线附近压暗网格
    const fg = ctx.createLinearGradient(0, HY, 0, HY + 120);
    fg.addColorStop(0, 'rgba(60,8,80,0.95)'); fg.addColorStop(1, 'rgba(60,8,80,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, HY, 1080, 120);
  }

  // ---------- 棕榈剪影 ----------
  function palm(ctx, S, x, y, h, lean, flip, t, ph) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
    const sway = Math.sin(t * 1.6 + ph) * 0.03;
    const tx = lean * h, ty = -h;
    ctx.fillStyle = '#0d0118';
    // 树干：二次曲线两侧收窄
    ctx.beginPath();
    const cx = tx * 0.2, cy = -h * 0.55;
    ctx.moveTo(-16, 0); ctx.quadraticCurveTo(cx - 12, cy, tx - 6, ty); ctx.lineTo(tx + 6, ty); ctx.quadraticCurveTo(cx + 12, cy, 16, 0); ctx.closePath(); ctx.fill();
    // 树干环纹（品红轮廓光）
    ctx.strokeStyle = 'rgba(255,60,170,0.35)'; ctx.lineWidth = 2;
    for (let k = 1; k < 14; k++) {
      const u = k / 14, px = (1 - u) * (1 - u) * 0 + 2 * (1 - u) * u * cx + u * u * tx, py = 2 * (1 - u) * u * cy + u * u * ty;
      const w = 16 - 10 * u;
      ctx.beginPath(); ctx.moveTo(px - w, py + 4); ctx.lineTo(px + w, py - 2); ctx.stroke();
    }
    // 叶子：下垂的叶脊 + 两侧向后掠的细羽片
    ctx.translate(tx, ty); ctx.rotate(sway);
    ctx.strokeStyle = '#0d0118'; ctx.lineCap = 'round';
    const leaves = [[-3.05, 1.0, 0.5], [-2.55, 1.1, 0.35], [-2.05, 0.8, 0.2], [-1.55, 0.6, 0.1], [-0.95, 0.8, 0.25], [-0.45, 1.1, 0.4], [0.05, 1.0, 0.55], [-1.25, 0.45, 0.0]];
    for (const [a, L, droop] of leaves) {
      const len = h * 0.5 * L;
      const ca = Math.cos(a), sa = Math.sin(a);
      // 叶脊：二次曲线，末端下垂
      const ex = ca * len, ey = sa * len + droop * len * 0.9 + len * 0.25;
      const qx = ca * len * 0.55, qy = sa * len * 0.55 - len * 0.05;
      const P = u => [2 * (1 - u) * u * qx + u * u * ex, 2 * (1 - u) * u * qy + u * u * ey];
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(qx, qy, ex, ey); ctx.stroke();
      ctx.lineWidth = 3.2; ctx.beginPath();
      for (let k = 2; k <= 16; k++) {
        const u = k / 17, [px, py] = P(u), [nx, ny] = P(u + 0.02);
        const dx = nx - px, dy = ny - py, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
        const fl = len * 0.2 * Math.sin(Math.PI * (0.15 + 0.85 * u)) ;
        for (const side of [-1, 1]) {
          const ox = -uy * side, oy = ux * side;
          ctx.moveTo(px, py); ctx.lineTo(px + (ox * 0.8 + ux * 0.35) * fl, py + (oy * 0.8 + uy * 0.35) * fl + fl * 0.35);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 跑车背影 ----------
  function car(ctx, S, t, x, y, s, glowK) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // 地面倒影 / 尾灯投在网格上的红光
    let g = ctx.createRadialGradient(0, 70, 10, 0, 70, 360);
    g.addColorStop(0, `rgba(255,40,90,${0.45 * glowK})`); g.addColorStop(1, 'rgba(255,40,90,0)');
    ctx.fillStyle = g; ctx.fillRect(-380, -40, 760, 300);
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.ellipse(0, 64, 250, 22, 0, 0, S.TAU); ctx.fill();
    // 轮胎
    ctx.fillStyle = '#050008'; S.rr(ctx, -232, 10, 62, 58, 8); ctx.fill(); S.rr(ctx, 170, 10, 62, 58, 8); ctx.fill();
    // 车身
    ctx.beginPath();
    ctx.moveTo(-240, 40); ctx.lineTo(-246, -14); ctx.lineTo(-222, -46); ctx.lineTo(222, -46); ctx.lineTo(246, -14); ctx.lineTo(240, 40); ctx.closePath();
    g = ctx.createLinearGradient(0, -46, 0, 40); g.addColorStop(0, '#2b0b45'); g.addColorStop(1, '#0c0216');
    ctx.fillStyle = g; ctx.fill();
    // 车舱
    ctx.beginPath(); ctx.moveTo(-170, -46); ctx.lineTo(-120, -112); ctx.lineTo(120, -112); ctx.lineTo(170, -46); ctx.closePath();
    ctx.fillStyle = '#12031f'; ctx.fill();
    // 后挡玻璃：映出落日与网格
    ctx.beginPath(); ctx.moveTo(-148, -52); ctx.lineTo(-110, -104); ctx.lineTo(110, -104); ctx.lineTo(148, -52); ctx.closePath();
    g = ctx.createLinearGradient(0, -104, 0, -52); g.addColorStop(0, '#3a0f5a'); g.addColorStop(0.6, '#b5307a'); g.addColorStop(1, '#ff8a5c');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-90, -98); ctx.lineTo(-40, -58); ctx.stroke();
    // 轮廓光
    ctx.strokeStyle = rgba(CYA, 0.8); ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(-246, -14); ctx.lineTo(-222, -46); ctx.lineTo(-170, -46); ctx.lineTo(-120, -112); ctx.lineTo(120, -112); ctx.lineTo(170, -46); ctx.lineTo(222, -46); ctx.lineTo(246, -14); ctx.stroke();
    // 尾部格栅横条（尾灯从格栅缝里透出）
    ctx.strokeStyle = 'rgba(12,2,22,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); for (let yy = -34; yy <= -10; yy += 6) { ctx.moveTo(-226, yy); ctx.lineTo(226, yy); } ctx.stroke();
    // 尾灯条（霓虹）
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255,40,120,1)'; ctx.shadowBlur = 40 * glowK;
    for (const [w, a, c] of [[34, 0.25 * glowK, MAG], [18, 0.6 * glowK, [255, 50, 100]], [6, 1, [255, 210, 225]]]) {
      ctx.strokeStyle = rgba(c, a); ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-210, -22); ctx.lineTo(-60, -22); ctx.moveTo(60, -22); ctx.lineTo(210, -22); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,90,140,0.9)'; ctx.font = S.F(22, 'Orbitron', 800); ctx.textAlign = 'center'; ctx.fillText('OUTRUN', 0, -14); ctx.textAlign = 'left';
    ctx.restore();
    // 排气管微光
    ctx.fillStyle = 'rgba(255,140,90,0.9)'; ctx.beginPath(); ctx.ellipse(-120, 42, 14, 6, 0, 0, S.TAU); ctx.ellipse(120, 42, 14, 6, 0, 0, S.TAU); ctx.fill();
    // 车牌
    ctx.fillStyle = '#e9e4ff'; ctx.fillRect(-56, 2, 112, 30);
    ctx.fillStyle = '#2a0a44'; ctx.font = S.F(26, 'VT323'); ctx.textAlign = 'center'; ctx.fillText('AI · 12', 0, 26);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ---------- 标题 ----------
  // 铬字：天蓝 → 白 → 地平线暗缝 → 橙 → 白
  function chromeFill(ctx, y0, y1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#1e3d8f'); g.addColorStop(0.2, '#7fd4ff'); g.addColorStop(0.47, '#ffffff');
    g.addColorStop(0.5, '#2a0b3a'); g.addColorStop(0.56, '#6b2a5a'); g.addColorStop(0.75, '#ff9a4a'); g.addColorStop(1, '#fff1c8');
    return g;
  }
  function chromeText(ctx, S, txt, x, y, size, font, weight, spacing, ca) {
    ctx.font = S.F(size, font, weight); ctx.textAlign = 'center'; ctx.letterSpacing = spacing + 'px';
    // 色差：红/青错位
    if (ca > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,0,80,${0.55 * ca})`; ctx.fillText(txt, x - 7 * ca, y);
      ctx.fillStyle = `rgba(0,220,255,${0.55 * ca})`; ctx.fillText(txt, x + 7 * ca, y);
      ctx.restore();
    }
    // 外描边阴影
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12022a'; ctx.lineWidth = size * 0.12; ctx.strokeText(txt, x, y + size * 0.05);
    ctx.fillStyle = chromeFill(ctx, y - size * 0.78, y + size * 0.05); ctx.fillText(txt, x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.strokeText(txt, x, y);
    ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
  }
  function neonText(ctx, S, txt, x, y, size, font, col, on, rot = 0) {
    if (on <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = S.F(size, font); ctx.textAlign = 'center';
    ctx.globalAlpha = on;
    ctx.shadowColor = rgba(col, 1); ctx.shadowBlur = 40;
    ctx.fillStyle = rgba(col, 1); ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 12; ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,235,250,0.9)'; ctx.strokeText(txt, 0, 0);
    ctx.restore();
  }

  function flicker(t, t0, S) {
    // 霓虹点亮：先闪后稳
    const k = t - t0;
    if (k < 0) return 0;
    if (k > 0.42) return 1;
    const pat = [1, 0, 0.2, 1, 0, 0, 1, 0.3, 1, 1, 0, 1];
    return pat[Math.floor(k / 0.035) % pat.length];
  }

  // ---------- 录像机角标 ----------
  function vcr(ctx, S, t) {
    ctx.save();
    ctx.font = S.F(64, 'VT323'); ctx.fillStyle = '#f4f4ff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4;
    ctx.fillText('PLAY', 80, 236);
    ctx.beginPath(); ctx.moveTo(214, 196); ctx.lineTo(244, 214); ctx.lineTo(214, 232); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'right';
    const fr = Math.floor((t + 12.4) * 30);
    const ss = Math.floor(fr / 30), ff = fr % 30;
    ctx.fillText(`00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, 1000, 236);
    ctx.font = S.F(40, 'VT323'); ctx.fillText('SP', 1000, 280);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function scan(ctx, S, t) {
    if (!SCAN) {
      const c = document.createElement('canvas'); c.width = 4; c.height = 4; const g = c.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 4, 2);
      SCAN = ctx.createPattern(c, 'repeat');
    }
    ctx.fillStyle = SCAN; ctx.fillRect(0, 0, 1080, 1920);
    if (!GPAT) GPAT = ctx.createPattern(S.grainTexture(), 'repeat');
    ctx.save(); ctx.globalAlpha = 0.13; ctx.globalCompositeOperation = 'overlay';
    const sd = Math.floor(t * 30);
    ctx.translate(-((S.hash(sd) * 512) | 0), -((S.hash(sd + 2) * 512) | 0));
    ctx.fillStyle = GPAT; ctx.fillRect(0, 0, 1080 + 512, 1920 + 512); ctx.restore();
    // 底部跟踪噪声带
    const ty = 1700 + Math.sin(t * 0.7) * 60;
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, ty, 1080, 10);
    for (let i = 0; i < 30; i++) {
      const x = S.hash2(sd, i) * 1080, w = 10 + S.hash2(i, sd) * 70;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.3 * S.hash(i + sd)})`; ctx.fillRect(x, ty + S.hash(i * 3 + sd) * 10, w, 2);
    }
  }

  function scene(ctx, t, S) {
    const { E, clamp, seg } = S;
    const push0 = E.outExpo(seg(t, -0.4, 0.3));
    // 强拍 2.0：整幅推近后停住
    const pz = t >= 2.0 ? 1 + 0.07 * (1 - E.outExpo(seg(t, 2.0, 2.4))) : 1;
    ctx.save(); ctx.translate(540, 900); ctx.scale(pz, pz); ctx.translate(-540, -900);
    sky(ctx, S, t);
    sun(ctx, S, t, push0);
    mountains(ctx, S, t, RIDGE_F, ['#3a0a5a', '#22063a'], 'rgba(40,236,255,A)', 'rgba(40,236,255,0.18)');
    mountains(ctx, S, t, RIDGE_N, ['#1d0533', '#0e0219'], 'rgba(255,46,166,A)', 'rgba(255,46,166,0.22)');
    const speed = 1.6 + 1.2 * E.out3(seg(t, 2.0, 2.2)) * (1 - seg(t, 2.6, 3.2));
    // 匀速：用积分形式避免变速时网格跳动
    const dist = t * 1.6 + 1.2 * Math.max(0, Math.min(t, 3.2) - 2.0) * 0.8;
    floor(ctx, S, dist, 1);
    palm(ctx, S, 186, HY + 4, 250, 0.1, 1, t, 1.3);
    palm(ctx, S, 900, HY + 4, 230, 0.12, -1, t, 0.7);
    palm(ctx, S, 40, HY + 40, 470, 0.2, 1, t, 0);
    palm(ctx, S, 1050, HY + 40, 520, 0.22, -1, t, 2.1);
    // 跑车：1.0 推入即停（带过冲）
    const ck = E.outBack(seg(t, 0.95, 1.35), 1.2);
    const bob = Math.sin(t * 9) * 1.5 + S.pulse(t, 10) * 3;
    if (t > 0.95) car(ctx, S, t, VPX, 1440 + (1 - ck) * 520 + bob, 1.05, 0.7 + 0.3 * S.pulse(t, 6));

    // ---------- 标题 ----------
    // 12 + 复古：t=0 推入
    const a = E.outExpo(seg(t, 0.0, 0.3));
    if (t >= 0) {
      ctx.save(); ctx.translate(540, 400); const sc = 1 + 0.7 * (1 - a); ctx.scale(sc, sc); ctx.translate(-540, -400);
      ctx.globalAlpha = clamp(a * 2);
      neonText(ctx, S, '12', 300, 470, 220, 'Monoton', MAG, 1);
      chromeText(ctx, S, '复古', 690, 462, 190, 'NotoSansSC', 900, 14, 0.6 + 0.4 * S.pulse(t, 8));
      ctx.restore();
    }
    // SYNTHWAVE：t=0.5 推入
    const b = E.outExpo(seg(t, 0.5, 0.8));
    if (t >= 0.5) {
      ctx.save(); ctx.translate(540, 640); const sc = 1 + 0.8 * (1 - b); ctx.scale(sc, sc); ctx.translate(-540, -640);
      ctx.globalAlpha = clamp(b * 2);
      chromeText(ctx, S, 'SYNTHWAVE', 540, 690, 112, 'Orbitron', 800, 2, 0.5 + 0.5 * S.pulse(t, 8));
      ctx.restore();
    }
    // Retro：霓虹闪烁点亮
    neonText(ctx, S, 'Retro', 560, 586, 128, 'Pacifico', CYA, flicker(t, 0.9, S), -0.12);
    ctx.restore();
  }

  // 整幅先画在 CPU 画布上（软件光栅化远快于 SwiftShader 的 GPU 画布），最后一次性贴回
  const CPU = {};
  function cpuCtx(key) {
    if (!CPU[key]) { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; CPU[key] = c.getContext('2d', { willReadFrequently: true }); }
    const g = CPU[key];
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetX = g.shadowOffsetY = 0; g.setLineDash([]);
    g.lineCap = 'butt'; g.lineJoin = 'miter'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px'; g.lineWidth = 1;
    return g;
  }

  function chroma(ctx, S, d) {
    const R = cpuCtx('ca-r'), G = cpuCtx('ca-gb');
    R.drawImage(ctx.canvas, 0, 0); R.globalCompositeOperation = 'multiply'; R.fillStyle = '#ff0000'; R.fillRect(0, 0, 1080, 1920);
    G.drawImage(ctx.canvas, 0, 0); G.globalCompositeOperation = 'multiply'; G.fillStyle = '#00ffff'; G.fillRect(0, 0, 1080, 1920);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'copy'; ctx.drawImage(G.canvas, -d * 0.5, 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(R.canvas, d * 0.5, 0);
    ctx.restore();
  }

  registerScene({
    n: 12, key: 'synth', zh: '复古 Synthwave', en: 'Retro Synthwave',
    bg: BG, accent: '#ff2ea6',
    init(S) { prep(S); },
    draw(out, t, S) {
      prep(S);
      const ctx = cpuCtx('main');
      const { E, clamp, seg } = S;
      // 偶发磁带撕裂：画到离屏层再按条带错位
      const tear = (t > 1.42 && t < 1.56) ? 1 : (t > 3.08 && t < 3.2) ? 0.8 : 0;
      if (tear) {
        const g = cpuCtx('tear'), L = g.canvas;
        scene(g, t, S);
        ctx.fillStyle = BG; ctx.fillRect(0, 0, 1080, 1920);
        const sd = Math.floor(t * 30);
        let y = 0;
        while (y < 1920) {
          const h = 30 + Math.floor(S.hash2(sd, y) * 200);
          const r = S.hash2(sd + 1, y);
          const dx = r > 0.55 ? (S.hash2(sd + 2, y) - 0.3) * 160 * tear : 0;
          ctx.drawImage(L, 0, y, 1080, h, dx, y, 1080, h);
          if (dx) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, y, 1080, 2); }
          y += h;
        }
      } else {
        scene(ctx, t, S);
      }
      vcr(ctx, S, t);
      // 全幅色差：红通道右移、青通道左移（拍点上加大）
      chroma(ctx, S, 3 + 5 * S.pulse(t, 9) + (tear ? 8 : 0));
      scan(ctx, S, t);
      // 推入即停的白闪：0, 0.5, 2.0
      const fl = Math.max(0.55 * Math.exp(-14 * Math.max(0, t - 0.3) ) * (t >= 0.3 ? 1 : 0), 0.5 * Math.exp(-14 * Math.max(0, t - 0.8)) * (t >= 0.8 ? 1 : 0), 0.7 * Math.exp(-10 * Math.max(0, t - 2.0)) * (t >= 2.0 ? 1 : 0), 0.35 * Math.exp(-14 * Math.max(0, t - 1.35)) * (t >= 1.35 ? 1 : 0));
      if (fl > 0.01) { ctx.fillStyle = `rgba(255,240,255,${fl})`; ctx.fillRect(0, 0, 1080, 1920); }
      out.drawImage(ctx.canvas, 0, 0);
    },
  });
})();
