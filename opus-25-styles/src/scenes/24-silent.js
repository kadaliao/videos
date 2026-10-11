// 24 · 黑白默片：1900 年代的放映质感 —— 字幕卡（装饰艺术双线框）→ 硬切到《月球旅行记》致敬镜头：
// 画出来的月亮脸、子弹形炮弹飞进它的眼睛（落在第二小节强拍）。全片 16fps 的步进运动、逐帧颗粒、划痕、灰尘、曝光闪烁、片门晃动、暗角。
(function () {
  const W = 1080, H = 1920;
  const CPU = { willReadFrequently: true };
  const CUT = 1.4, HIT = 2.0;
  let grainC = null, gate = null, stars = null, moonBody = null;

  function makeGrain(S) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d', CPU);
    const im = g.createImageData(512, 512), r = S.rng(2424);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.max(0, Math.min(255, 128 + (r() + r() + r() - 1.5) * 150)); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); return c;
  }
  function makeGate() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    const rg = g.createRadialGradient(W / 2, H * 0.47, H * 0.22, W / 2, H * 0.47, H * 0.62);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.25)'); rg.addColorStop(1, 'rgba(0,0,0,0.92)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // 圆角片门
    g.fillStyle = '#000'; g.beginPath(); g.rect(-10, -10, W + 20, H + 20); g.roundRect(26, 30, W - 52, H - 60, 64); g.fill('evenodd');
    g.filter = 'blur(6px)'; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 26; g.beginPath(); g.roundRect(26, 30, W - 52, H - 60, 64); g.stroke(); g.filter = 'none';
    return c;
  }

  // ---------- 字幕卡 ----------
  function decoCorner(g, x, y, sx, sy) {
    g.save(); g.translate(x, y); g.scale(sx, sy);
    g.strokeStyle = '#f2efe6'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, 34 + i * 16, 0, Math.PI / 2); g.stroke(); }
    g.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const a = (i + 0.5) / 7 * Math.PI / 2; g.beginPath(); g.moveTo(Math.cos(a) * 16, Math.sin(a) * 16); g.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); g.stroke(); }
    g.fillStyle = '#f2efe6'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
    // 阶梯
    g.lineWidth = 3; g.beginPath(); g.moveTo(130, 0); g.lineTo(130, 14); g.lineTo(150, 14); g.lineTo(150, 28); g.lineTo(190, 28); g.stroke();
    g.beginPath(); g.moveTo(0, 130); g.lineTo(14, 130); g.lineTo(14, 150); g.lineTo(28, 150); g.lineTo(28, 190); g.stroke();
    g.restore();
  }
  function fan(g, x, y, r, dir) {
    g.save(); g.translate(x, y); g.scale(1, dir);
    g.strokeStyle = '#f2efe6'; g.lineWidth = 2.5;
    for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
    g.beginPath(); g.arc(0, 0, r, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(0, 0, r + 12, Math.PI, 0); g.stroke();
    g.fillStyle = '#f2efe6'; g.beginPath(); g.arc(0, 0, 12, Math.PI, 0); g.fill();
    g.restore();
  }
  function divider(g, cx, y, w) {
    g.strokeStyle = '#f2efe6'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - w, y); g.lineTo(cx - 26, y); g.moveTo(cx + 26, y); g.lineTo(cx + w, y); g.stroke();
    g.beginPath(); g.moveTo(cx - w, y + 7); g.lineTo(cx - 40, y + 7); g.moveTo(cx + 40, y + 7); g.lineTo(cx + w, y + 7); g.stroke();
    g.fillStyle = '#f2efe6'; g.beginPath(); g.moveTo(cx, y - 13); g.lineTo(cx + 15, y + 3); g.lineTo(cx, y + 19); g.lineTo(cx - 15, y + 3); g.closePath(); g.fill();
  }
  function frameBox(g, x, y, w, h, big) {
    g.strokeStyle = '#f2efe6';
    g.lineWidth = big ? 7 : 5; g.strokeRect(x, y, w, h);
    const i1 = big ? 20 : 13; g.lineWidth = 2; g.strokeRect(x + i1, y + i1, w - i1 * 2, h - i1 * 2);
    // 切角
    const k = big ? 34 : 22; g.fillStyle = '#0c0b09';
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { g.beginPath(); g.arc(cx, cy, k, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 2.5;
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { g.beginPath(); g.arc(cx, cy, k - 8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill(); }
  }
  function intertitle(g, S, t) {
    g.fillStyle = '#0c0b09'; g.fillRect(-20, -20, W + 40, H + 40);
    const x = 90, y = 330, w = 900, h = 1150;
    frameBox(g, x, y, w, h, true);
    decoCorner(g, x + 34, y + 34, 1, 1); decoCorner(g, x + w - 34, y + 34, -1, 1);
    decoCorner(g, x + 34, y + h - 34, 1, -1); decoCorner(g, x + w - 34, y + h - 34, -1, -1);
    fan(g, W / 2, y + 2, 70, -1); fan(g, W / 2, y + h - 2, 70, 1);
    // 文字（老式字幕卡里的字略有“手摇曝光”的抖）
    g.textAlign = 'center'; g.fillStyle = '#f2efe6';
    g.font = S.F(62, 'NotoSerifSC', 900); g.letterSpacing = '18px'; g.fillText('第 24 种', W / 2 + 9, y + 210); g.letterSpacing = '0px';
    divider(g, W / 2, y + 270, 250);
    g.font = S.F(178, 'NotoSerifSC', 900); g.fillText('黑白默片', W / 2, y + 500);
    divider(g, W / 2, y + 580, 330);
    g.font = S.F(118, 'PlayfairBI'); g.fillText('Silent Film', W / 2, y + 760);
    g.font = S.F(40, 'NotoSerifSC', 900); g.letterSpacing = '10px'; g.fillStyle = '#cfcabd';
    g.fillText('致敬《月球旅行记》· 1902', W / 2 + 5, y + 900); g.letterSpacing = '0px';
    g.font = S.F(34, 'PlayfairBI'); g.fillStyle = '#bdb8aa'; g.fillText('— Opus Pictures presents —', W / 2, y + 980);
  }

  // ---------- 月亮镜头 ----------
  function star(g, x, y, r, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fillStyle = '#e8e4da'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#55524c'; g.stroke();
    g.restore();
  }
  // 月亮本体：渐变 + 环形山 + 铜版画式排线阴影（预渲染）
  function makeMoonBody(S) {
    const R = 330, c = document.createElement('canvas'); c.width = c.height = R * 2 + 20; const g = c.getContext('2d', CPU);
    g.translate(R + 10, R + 10);
    const body = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
    body.addColorStop(0, '#f4f1ea'); body.addColorStop(0.65, '#cdc9bf'); body.addColorStop(1, '#8a867d');
    g.fillStyle = body; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.save(); g.clip();
    // 排线：越靠右下越密越深
    g.strokeStyle = '#3a3731'; g.lineCap = 'round';
    for (let k = -R * 2; k < R * 2; k += 9) {
      for (let s2 = -R; s2 < R; s2 += 14) {
        const x = k * 0.7 + s2 * 0.7, y = -k * 0.7 + s2 * 0.7, d = (x * 0.6 + y * 0.8) / R;
        const a = S.clamp((d - 0.05) * 0.9) * 0.55; if (a < 0.03) continue;
        g.globalAlpha = a; g.lineWidth = 1.2 + a * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9.6, y + 9.6); g.stroke();
      }
    }
    g.globalAlpha = 1;
    const cr = [[-0.55, -0.55, 0.12], [0.5, -0.62, 0.09], [0.66, 0.2, 0.13], [-0.7, 0.3, 0.08], [0.28, 0.72, 0.1], [-0.35, 0.78, 0.07], [0.05, -0.82, 0.06], [0.78, -0.25, 0.06]];
    for (const [u, v, s] of cr) {
      g.fillStyle = 'rgba(70,66,60,0.3)'; g.beginPath(); g.arc(u * R, v * R, s * R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(40,38,34,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.arc(u * R, v * R, s * R, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.strokeStyle = 'rgba(250,248,240,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(u * R + 2, v * R + 2, s * R, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
    }
    g.restore();
    g.lineWidth = 6; g.strokeStyle = '#3f3d38'; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
    return c;
  }
  function moonFace(g, S, cx, cy, R, ex, look) {
    // ex: 0 微笑 → 1 龇牙咧嘴
    g.save(); g.translate(cx, cy);
    g.drawImage(moonBody, -R - 10, -R - 10, R * 2 + 20, R * 2 + 20);
    g.strokeStyle = '#2a2824'; g.lineCap = 'round';
    // 眉毛
    const brow = (x, s) => { g.lineWidth = 9; g.beginPath(); g.moveTo(x - 60 * s, -R * 0.36 - 6 + ex * 26 * (s > 0 ? 1 : -1) * 0); g.quadraticCurveTo(x, -R * 0.48 + ex * 30, x + 60 * s, -R * 0.36 + ex * 34); g.stroke(); };
    brow(-R * 0.33, 1); brow(R * 0.33, -1);
    // 右眼（观众视角右）：睁 → 痛得眯成一条缝
    const eye = (x, open) => {
      g.fillStyle = '#f8f6f0'; g.beginPath(); g.ellipse(x, -R * 0.18, 46, 34 * open + 3, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 5; g.stroke();
      if (open > 0.3) { g.fillStyle = '#1d1b18'; g.beginPath(); g.arc(x + look * 16, -R * 0.18 + 4, 15 * Math.min(1, open), 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + look * 16 - 5, -R * 0.18 - 2, 4, 0, Math.PI * 2); g.fill(); }
    };
    eye(R * 0.33, 1 - ex * 0.9);
    if (ex < 0.01) eye(-R * 0.33, 1);
    else { // 被击中的那只眼：凹陷的黑洞 + 放射裂纹
      g.fillStyle = '#1b1a17'; g.beginPath(); g.ellipse(-R * 0.33, -R * 0.18, 52, 40, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, L = 70 + S.hash(i) * 40; g.beginPath(); g.moveTo(-R * 0.33 + Math.cos(a) * 50, -R * 0.18 + Math.sin(a) * 38); g.lineTo(-R * 0.33 + Math.cos(a) * L, -R * 0.18 + Math.sin(a) * L * 0.8); g.stroke(); }
    }
    // 鼻子
    g.lineWidth = 5; g.beginPath(); g.moveTo(-6, -R * 0.08); g.quadraticCurveTo(-30, R * 0.16, -4, R * 0.2); g.quadraticCurveTo(14, R * 0.22, 22, R * 0.16); g.stroke();
    g.fillStyle = 'rgba(60,56,50,0.18)'; g.beginPath(); g.ellipse(-24, R * 0.13, 20, 30, 0.3, 0, Math.PI * 2); g.fill();
    // 腮红（灰）
    g.fillStyle = 'rgba(80,74,66,0.16)';
    g.beginPath(); g.arc(-R * 0.55, R * 0.18, 50, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(R * 0.55, R * 0.18, 50, 0, Math.PI * 2); g.fill();
    // 嘴：上扬微笑 → 歪斜张开的痛苦
    const mw = 130, my = R * 0.42;
    g.lineWidth = 7;
    if (ex < 0.01) {
      g.beginPath(); g.moveTo(-mw, my - 30); g.quadraticCurveTo(0, my + 70, mw, my - 30); g.stroke();
      g.beginPath(); g.moveTo(-mw - 14, my - 40); g.lineTo(-mw + 8, my - 20); g.moveTo(mw + 14, my - 40); g.lineTo(mw - 8, my - 20); g.stroke();
    } else {
      g.fillStyle = '#1d1b18';
      g.beginPath(); g.moveTo(-mw, my + 10 - ex * 30); g.quadraticCurveTo(-20, my - 30 * ex, mw * 0.9, my - 20 + ex * 10);
      g.quadraticCurveTo(mw * 0.4, my + 40 + ex * 60, -mw, my + 10 - ex * 30); g.closePath(); g.fill(); g.stroke();
      // 牙齿
      g.fillStyle = '#f2efe6';
      for (let i = 0; i < 6; i++) { const x = -mw * 0.7 + i * 38; g.fillRect(x, my - 18 * ex + i * 2 - 4, 24, 20 * ex); }
    }
    g.restore();
  }
  function rocket(g, x, y, ang, s) {
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    // 子弹形炮弹：尖头 + 铆钉筒身 + 尾环
    const body = g.createLinearGradient(0, -40, 0, 40);
    body.addColorStop(0, '#9a968c'); body.addColorStop(0.3, '#f2efe6'); body.addColorStop(0.6, '#bdb8ac'); body.addColorStop(1, '#4a4741');
    g.fillStyle = body; g.strokeStyle = '#26241f'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-120, -38); g.lineTo(20, -38); g.bezierCurveTo(80, -38, 120, -14, 140, 0); g.bezierCurveTo(120, 14, 80, 38, 20, 38); g.lineTo(-120, 38); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 3;
    for (const xx of [-90, -40, 10]) { g.beginPath(); g.moveTo(xx, -38); g.lineTo(xx, 38); g.stroke(); }
    g.fillStyle = '#26241f';
    for (const xx of [-100, -50, 0]) for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(xx, k * 14, 2.6, 0, Math.PI * 2); g.fill(); }
    // 舷窗
    g.fillStyle = '#2b2925'; g.beginPath(); g.arc(-62, -6, 15, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#f2efe6'; g.lineWidth = 3; g.stroke();
    // 尾环
    g.fillStyle = '#6a665e'; g.strokeStyle = '#26241f'; g.lineWidth = 4; g.fillRect(-140, -44, 22, 88); g.strokeRect(-140, -44, 22, 88);
    g.restore();
  }
  function cloud(g, x, y, s, shade) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const blobs = [[-120, 10, 70], [-50, -20, 90], [40, -10, 80], [120, 15, 60], [0, 30, 90]];
    g.fillStyle = shade; g.strokeStyle = '#2f2d29'; g.lineWidth = 4;
    g.beginPath(); for (const [bx, by, r] of blobs) { g.moveTo(bx + r, by); g.arc(bx, by, r, 0, Math.PI * 2); } g.fill();
    for (const [bx, by, r] of blobs) { g.beginPath(); g.arc(bx, by, r, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    g.restore();
  }
  function moonShot(g, S, t) {
    // 画布景：深灰夜空 + 刷痕
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1d1c19'); sky.addColorStop(0.6, '#3a3833'); sky.addColorStop(1, '#55524b');
    g.fillStyle = sky; g.fillRect(-20, -20, W + 40, H + 40);
    // 星星（舞台道具，按拍子闪）
    stars.forEach(([x, y, r, ph], i) => { const k = 1 + 0.18 * Math.sin(t * 7 + ph) + (i % 3 === 0 ? 0.25 * S.pulse(t, 9) : 0); star(g, x, y, r * k, ph * 0.3); });
    // 月亮：缓慢上下浮动（戏台吊威亚的感觉）
    const ex = t < HIT ? 0 : S.clamp((t - HIT) / 0.25);
    const shake = t >= HIT && t < HIT + 0.35 ? Math.sin((t - HIT) * 90) * 14 * (1 - (t - HIT) / 0.35) : 0;
    const mx = 560 + shake, my = 700 + Math.sin(t * 2) * 8, R = 330;
    const look = t < HIT ? -0.6 - 0.4 * S.clamp((t - CUT) / 0.6) : 0.2;
    // 云层在月亮下沿
    cloud(g, 180, 1080, 1.3, '#8c887e'); cloud(g, 900, 1060, 1.2, '#7e7a70');
    moonFace(g, S, mx, my, R, ex, look);
    cloud(g, 520, 1150, 1.5, '#a29d92');
    // 炮弹：从左下飞入，命中左眼（第二小节强拍）
    const eyeX = mx - R * 0.33, eyeY = my - R * 0.18;
    const sx = -180, sy = 1080;
    if (t < HIT) {
      const k = S.clamp((t - CUT) / (HIT - CUT)), e = k * k * (3 - 2 * k) * 0.3 + k * 0.7;
      const x = sx + (eyeX - 90 - sx) * e, y = sy + (eyeY + 50 - sy) * e - Math.sin(k * Math.PI) * 120;
      // 烟迹
      for (let i = 1; i <= 9; i++) {
        const kk = Math.max(0, k - i * 0.05), ee = kk * kk * (3 - 2 * kk) * 0.3 + kk * 0.7;
        const px = sx + (eyeX - 90 - sx) * ee, py = sy + (eyeY + 50 - sy) * ee - Math.sin(kk * Math.PI) * 120;
        g.fillStyle = `rgba(225,221,210,${0.55 - i * 0.05})`; g.beginPath(); g.arc(px, py, 20 + i * 7, 0, Math.PI * 2); g.fill();
      }
      const ang = Math.atan2(eyeY + 50 - sy, eyeX - 90 - sx) - 0.5 * Math.cos(k * Math.PI) * 0.6;
      rocket(g, x, y, ang, 1.05);
    } else {
      // 插在眼睛里，尾部露在外面
      const ang = Math.atan2(eyeY + 50 - sy, eyeX - 90 - sx) - 0.18;
      rocket(g, eyeX - 70 + shake * 0.5, eyeY + 36, ang, 0.9);
      // 眼里流出的“泪”
      const d = S.clamp((t - HIT - 0.2) / 1.6);
      g.fillStyle = '#ece8dd'; g.strokeStyle = 'rgba(47,45,41,0.6)'; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const L = d * (90 + i * 60), x = eyeX + 30 + i * 22;
        g.beginPath(); g.moveTo(x - 9, eyeY + 30); g.lineTo(x - 7, eyeY + 30 + L); g.arc(x, eyeY + 30 + L, 9, Math.PI, 0, true); g.lineTo(x + 9, eyeY + 30); g.fill(); g.stroke();
      }
      // 撞击星芒
      const q = S.clamp((t - HIT) / 0.4);
      if (q < 1) {
        g.strokeStyle = `rgba(250,248,240,${1 - q})`; g.lineWidth = 8;
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = 60 + q * 120, r1 = r0 + 80; g.beginPath(); g.moveTo(eyeX + Math.cos(a) * r0, eyeY + Math.sin(a) * r0); g.lineTo(eyeX + Math.cos(a) * r1, eyeY + Math.sin(a) * r1); g.stroke(); }
      }
    }
    // 底部字幕框：标题在整个镜头里保持可见
    const bx = 110, by = 1230, bw = 860, bh = 300;
    g.fillStyle = 'rgba(12,11,9,0.92)'; g.fillRect(bx, by, bw, bh);
    frameBox(g, bx, by, bw, bh, false);
    g.textAlign = 'center'; g.fillStyle = '#f2efe6';
    g.font = S.F(96, 'NotoSerifSC', 900); g.fillText('24 · 黑白默片', W / 2, by + 125);
    g.font = S.F(74, 'PlayfairBI'); g.fillText('Silent Film', W / 2, by + 252);
    divider(g, W / 2, by + 165, 160);
  }

  registerScene({
    n: 24, key: 'silent', zh: '黑白默片', en: 'Silent Film',
    bg: '#0c0b09', accent: '#f2efe6',
    init: async (S) => {
      grainC = makeGrain(S); gate = makeGate(); moonBody = makeMoonBody(S);
      const r = S.rng(240); stars = [];
      for (let i = 0; i < 16; i++) {
        const x = 70 + r() * 940, y = 120 + r() * 1100, d = Math.hypot(x - 560, y - 700);
        if (d < 400) continue; stars.push([x, y, 14 + r() * 26, r() * 6]);
      }
    },
    draw(ctx, t, S) {
      const M = S.layer('s24-main', W, H), g = M.getContext('2d', CPU);
      const fr = Math.round((t + 0.4) * 30), tq = Math.floor((t + 0.4) * 16) / 16 - 0.4;  // 16fps 步进
      g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#0c0b09'; g.fillRect(0, 0, W, H);
      // 片门晃动
      const wx = Math.round((S.hash(fr * 1.31) - 0.5) * 6), wy = Math.round((S.noise2(fr * 0.3, 2.2)) * 7 + (S.hash(fr * 2.7) - 0.5) * 3);
      g.save(); g.translate(wx, wy);
      if (t < CUT) intertitle(g, S, tq); else moonShot(g, S, tq);
      g.restore();
      // 撞击过曝的一帧
      if (t >= HIT && t < HIT + 0.07) { g.fillStyle = 'rgba(255,253,245,0.8)'; g.fillRect(0, 0, W, H); }
      // 镜头光晕：高光往外溢
      const Hl = S.layer('s24-hal', 270, 480), hg = Hl.getContext('2d', CPU);
      hg.imageSmoothingEnabled = true; hg.imageSmoothingQuality = 'high'; hg.drawImage(M, 0, 0, 270, 480);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.28; g.drawImage(Hl, 0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // 颗粒（每帧换位置）
      g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.42;
      const ox = Math.floor(S.hash(fr) * 512), oy = Math.floor(S.hash(fr + 7.7) * 512);
      for (let y = -oy; y < H; y += 1024) for (let x = -ox; x < W; x += 1024) g.drawImage(grainC, x, y, 1024, 1024);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // 竖向划痕
      const r = S.rng(fr * 97 + 13);
      const ns = 1 + Math.floor(r() * 3);
      for (let i = 0; i < ns; i++) {
        const x = 60 + r() * (W - 120), y0 = r() * H * 0.5, L = H * (0.3 + r() * 0.7), light = r() < 0.6;
        g.strokeStyle = light ? `rgba(240,236,225,${0.25 + r() * 0.35})` : `rgba(0,0,0,${0.3 + r() * 0.4})`; g.lineWidth = 1 + r() * 2.2;
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (r() - 0.5) * 6, y0 + L); g.stroke();
      }
      // 一道贯穿全片的长划痕（缓慢漂移）
      g.strokeStyle = 'rgba(230,226,215,0.22)'; g.lineWidth = 1.5;
      const lx = 760 + Math.sin(t * 1.3) * 30 + (S.hash(fr) - 0.5) * 4; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx + 4, H); g.stroke();
      // 灰尘 / 毛发
      const nd = 3 + Math.floor(r() * 6);
      for (let i = 0; i < nd; i++) {
        const x = r() * W, y = r() * H, s = 2 + r() * 7, dark = r() < 0.7;
        g.fillStyle = dark ? 'rgba(10,9,8,0.85)' : 'rgba(245,242,232,0.8)';
        if (r() < 0.75) { g.beginPath(); g.ellipse(x, y, s, s * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2); g.fill(); }
        else { g.strokeStyle = g.fillStyle; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30 * r() - 15, y + 30, x + 40 * r() - 20, y + 50, x + 40 * r() - 20, y + 70 + r() * 40); g.stroke(); }
      }
      // 曝光闪烁
      const fl = (S.hash(fr * 3.3) - 0.5) * 0.16 + Math.sin(fr * 1.7) * 0.03;
      g.fillStyle = fl > 0 ? `rgba(255,250,235,${fl})` : `rgba(0,0,0,${-fl})`; g.fillRect(0, 0, W, H);
      // 暗角 + 圆角片门
      g.drawImage(gate, 0, 0);
      // 棕褐色调
      g.globalCompositeOperation = 'multiply'; g.fillStyle = '#f3e3c6'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      // 偶尔的片头记号（齿孔一侧的暗边）
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
      g.restore();
      ctx.drawImage(M, 0, 0);
    },
  });
})();
