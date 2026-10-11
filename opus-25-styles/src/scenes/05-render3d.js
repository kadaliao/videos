// 05 3D 渲染 —— WebGL2 光线步进：糖釉气球般饱满的物体落进一片粉彩小珠田，压陷、回弹、涟漪扩散，橙色从接触点向外蔓延。
(function () {
  const GW = 540, GH = 960;           // GL 分辨率（再放大到 1080×1920）
  // 珠田：每颗珠子一个纹素（高度、颜色蔓延量）
  const SX = 0.106, SZ = 0.0918;
  const I0 = -31, I1 = 31, J0 = -48, J1 = 27, TW = I1 - I0, TH = J1 - J0;
  const HERO = '#ff6a2b';

  // ---------- 物理（CPU 端解析式，t 的纯函数） ----------
  const G = 12;
  // 落体 + 两次回弹（第一次回弹恰好一拍），返回 {y, sy(压扁), impacts:[{t,s}]}
  function dropper(t, ti, rest, h0 = 9) {
    const imp = [{ t: ti, s: 1 }, { t: ti + 0.5, s: 0.45 }, { t: ti + 0.75, s: 0.18 }];
    let y;
    if (t < ti) y = rest + 0.5 * G * (ti - t) * (ti - t);
    else if (t < ti + 0.5) { const u = t - ti - 0.25; y = rest + 0.375 - 0.5 * G * u * u; }
    else if (t < ti + 0.75) { const u = t - ti - 0.625; y = rest + 0.09375 - 0.5 * G * u * u; }
    else y = rest;
    y = Math.min(y, rest + h0);
    // 压扁：每次触地一个阻尼振荡
    let sq = 0;
    for (const m of imp) { const d = t - m.t; if (d >= 0) sq += m.s * 0.32 * Math.exp(-d * 9) * Math.cos(d * 26); }
    // 下落时略微拉长
    if (t < ti) sq -= Math.min(0.12, (ti - t) * 0.25);
    return { y, sq, imp };
  }

  // ---------- 着色器 ----------
  const FS = `#version 300 es
precision highp float;
__DEFS__
out vec4 fragColor;
uniform vec2 uR;
uniform float uT;
uniform float uTop;
uniform vec3 uCam, uTgt;
uniform vec4 uObjP[3];   // xyz 位置, w 偏航角
uniform vec4 uObjS[3];   // xyz 缩放, w 倾斜
uniform vec4 uBeadB;     // 飞溅小珠包围球
uniform sampler2D uField;
uniform vec4 uFieldRect; // i0 j0 w h

const float BR = 0.045, SX = 0.106, SZ = 0.0918;
// SwiftShader 下，内联函数里直接引用 uniform 会让每个像素的开销暴涨；先拷到全局标量变量里
vec3 gP0, gP1, gP2, gS0, gS1, gS2; mat2 gR0, gR1; vec4 gFR, gBB; float gK0, gK1, gK2;
const vec3 HERO = vec3(1.0, 0.40, 0.15);
const vec3 PINK = vec3(0.98, 0.70, 0.82);
const vec3 SKYT = vec3(0.86, 0.83, 1.08);
const vec3 SKYH = vec3(1.1, 1.0, 1.04);
const vec3 LDIR = vec3(-0.5263, 0.8134, -0.2871);

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec4 cellAt(vec2 cid){
  ivec2 q = ivec2(cid) - ivec2(gFR.xy);
  if (q.x < 0 || q.y < 0 || q.x >= int(gFR.z) || q.y >= int(gFR.w)) return vec4(0.);
  return texelFetch(uField, q, 0);
}

// 三个主体（不含飞溅小珠），mat: 1 橙方块 2 甜甜圈 3 铬球
float obj3(vec3 p, out float mat){
  // 0 圆角方块
  vec3 q = p - gP0; q.xz = gR0 * q.xz;
  vec3 b = abs(q / gS0) - 0.24;
  float d = (length(max(b, 0.)) + min(max(b.x, max(b.y, b.z)), 0.) - 0.26) * gK0;
  mat = 1.;
  // 1 甜甜圈
  q = p - gP1; q.yz = gR1 * q.yz; q /= gS1;
  float d2 = (length(vec2(length(q.xz) - 0.33, q.y)) - 0.165) * gK1;
  if (d2 < d) { d = d2; mat = 2.; }
  // 2 铬球
  d2 = (length((p - gP2) / gS2) - 0.3) * gK2;
  if (d2 < d) { d = d2; mat = 3.; }
  return d;
}

// 射线与球求交，返回 t（未命中返回 1e9）
float sphHit(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = ro - c; float b = dot(oc, rd), q = dot(oc, oc) - r * r, h = b * b - q;
  if (h < 0.) return 1e9;
  float t = -b - sqrt(h);
  return t > 0. ? t : 1e9;
}
vec3 beadPos(vec2 id){ return vec3((id.x + 0.5 * mod(id.y, 2.)) * SX, BR + cellAt(id).r + hash12(id) * 0.012, id.y * SZ); }


vec3 sky(vec3 rd){
  vec3 c = mix(SKYH, SKYT, smoothstep(-0.05, 0.6, rd.y));
  c += smoothstep(0.93, 0.965, dot(rd, vec3(-0.6, 0.75, 0.25) * 0.9922)) * 1.6;
  c += vec3(1.0, 0.95, 0.9) * smoothstep(0.96, 0.985, dot(rd, vec3(0.8, 0.45, 0.4) * 0.997)) * 0.9;
  return c;
}

vec3 beadAlbedo(vec2 cid, out float spread){
  vec4 f = cellAt(cid);
  float h = hash12(cid + 7.1);
  vec3 base = h < 0.3 ? vec3(0.86, 0.78, 1.0) : h < 0.55 ? vec3(0.74, 0.82, 1.0) : h < 0.8 ? vec3(1.0, 0.80, 0.91) : vec3(1.0, 0.97, 0.93);
  float th = hash12(cid + 3.3);
  float g = smoothstep(th * 0.7, th * 0.7 + 0.3, f.g);
  float pk = smoothstep(th * 0.7, th * 0.7 + 0.3, f.b);
  base = mix(base, mix(PINK, vec3(1.0, 0.82, 0.9), h), pk);
  base = mix(base, mix(HERO, vec3(1.0, 0.62, 0.32), hash12(cid + 1.7) * 0.6), g);
  spread = g;
  return base;
}

vec4 beadAt(int i){ return texelFetch(uField, ivec2(i, int(gFR.w)), 0); }

void main(){
  gP0 = uObjP[0].xyz; gP1 = uObjP[1].xyz; gP2 = uObjP[2].xyz; gS0 = uObjS[0].xyz; gS1 = uObjS[1].xyz; gS2 = uObjS[2].xyz;
  float c0 = cos(uObjP[0].w), s0 = sin(uObjP[0].w), c1 = cos(uObjS[1].w), s1 = sin(uObjS[1].w);
  gR0 = mat2(c0, -s0, s0, c0); gR1 = mat2(c1, -s1, s1, c1);
  gK0 = min(gS0.x, gS0.y); gK1 = min(gS1.x, gS1.y); gK2 = min(gS2.x, gS2.y);
  gFR = uFieldRect; gBB = uBeadB;
#ifdef D_TRIV
  fragColor = vec4(1.); return;
#endif
  vec2 fc = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y);   // 上下翻转，readPixels 后即为正向
  vec2 uv = (fc - 0.5 * uR) / uR.y * 2.;
  vec3 ro = uCam;
  vec3 fw = normalize(uTgt - ro), rt = normalize(cross(fw, vec3(0, 1, 0))), up = cross(rt, fw);
  vec3 rd = normalize(fw * 2.25 + uv.x * rt + uv.y * up);
  vec3 bg = sky(rd), col = bg;
  float t = 1e9, mat = -1., tmax = 16.; vec2 cid = vec2(0.);
  // 1) 珠田：逐行（z 方向）解析求交
#ifndef D_NOBEADS
  if (rd.y < 0.) {
    float ta = max(0., (ro.y - 0.18) / -rd.y), tb = min(tmax, (ro.y + 0.12) / -rd.y);
    if (ta < tmax) {
      float rz = abs(rd.z) < 1e-3 ? 1e-3 : rd.z;
      float za = ro.z + rz * ta, zb = ro.z + rz * tb, dir = sign(zb - za);
      float j = floor(za / SZ + 0.5) - dir, jEnd = floor(zb / SZ + 0.5) + dir;
      int extra = -1;
      for (int k = 0; k < 44; k++) {
        float tj = (j * SZ - ro.z) / rz, xj = ro.x + rd.x * tj, off = 0.5 * mod(j, 2.);
        float fx = xj / SX - off, i0 = floor(fx + 0.5), i1 = i0 + (fx + 0.5 - i0 < 0.5 ? -1. : 1.);
        for (int di = 0; di < 2; di++) {
          vec2 id = vec2(di == 0 ? i0 : i1, j);
          float hh = hash12(id);
          float th = sphHit(ro, rd, vec3((id.x + off) * SX, BR + cellAt(id).r + hh * 0.012, j * SZ), BR * (0.92 + 0.12 * fract(hh * 7.31)));
          if (th < t) { t = th; cid = id; mat = 6.; }
        }
        if (mat > 0.) { extra++; if (extra >= 1) break; }
        if ((j - jEnd) * dir >= 0.) break;
        j += dir;
      }
      if (mat < 0.) { float tg = (ro.y - 0.0) / -rd.y; if (tg < tmax) { t = tg; mat = 4.; } }
    }
  }
#endif
  // 2) 飞溅小珠
  if (gBB.w > 0.) for (int i = 0; i < 18; i++) { vec4 bb = beadAt(i); float th = sphHit(ro, rd, bb.xyz, bb.w); if (th < t) { t = th; mat = 5.; } }
  // 3) 主体：球体追踪（全着色器只保留一处 obj3 的追踪调用，另一处在下面的统一采样循环里）
  {
    float to = 0., dm;
    if (ro.y > uTop) to = rd.y >= 0. ? 1e9 : (ro.y - uTop) / -rd.y;
    float lim = min(t, tmax);
#ifdef D_NOOBJ
    lim = -1.;
#endif
    for (int i = 0; i < 64; i++) {
      if (to > lim) break;
      float d = obj3(ro + rd * to, dm);
      if (d < 0.001 * to) { t = to; mat = dm; break; }
      to += d;
    }
  }
#ifdef D_NOSHADE
  if (mat >= 0.) col = vec3(mat * 0.1);
  if (false) {
#else
  if (mat >= 0.) {
#endif
    vec3 p = ro + rd * t;
    vec3 n = vec3(0., 1., 0.);
    bool isObj = mat < 4.;
    if (mat == 6.) n = normalize(p - beadPos(cid));
    else if (mat == 5.) {
      float bd = 1e9;
      for (int i = 0; i < 18; i++) { vec4 bb = beadAt(i); vec3 v = p - bb.xyz; float dd = length(v) - bb.w; if (dd < bd) { bd = dd; n = normalize(v); } }
    }
    // 统一采样循环：法线(4) → AO(3) → 软阴影(≤14)
    vec3 nacc = vec3(0.);
    float occ = 0., sca = 1., sh = 1., st = 0.03, dm;
    // 远离物体时跳过 AO；阴影射线不碰任何包围球时跳过阴影
    float dNear = obj3(p, dm);
    bool needAO = dNear < 0.5;
    bool needSh = false;
    for (int k = 0; k < 3; k++) { vec3 oc = p - (k == 0 ? gP0 : k == 1 ? gP1 : gP2); float b = dot(oc, LDIR), c = dot(oc, oc) - 0.81; if (c < 0. || (b < 0. && b * b > c)) needSh = true; }
    int iEnd = needSh ? 18 : 7;
    int iBeg = isObj ? 0 : needAO ? 4 : 7;
    for (int i = iBeg; i < iEnd; i++) {
      if (i == 7 && !needSh) break;
      vec3 e = 0.5773 * (2. * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.);
      float hh = 0.04 + 0.12 * float(i - 4);
      vec3 q = i < 4 ? p + e * 0.0015 : i < 7 ? p + n * hh : p + n * 0.01 + LDIR * st;
      float d = obj3(q, dm);
      if (i < 4) { nacc += e * d; if (i == 3) n = normalize(nacc); }
      else if (i < 7) { if (needAO) { occ += (hh - d) * sca; sca *= 0.6; } }
      else { sh = min(sh, 8. * d / st); st += clamp(d, 0.06, 0.5); if (sh < 0.01 || st > 3.5) break; }
    }
    sh = clamp(sh, 0., 1.);
    float ao = clamp(1. - 2.2 * occ, 0., 1.);
    if (mat == 6.) ao *= mix(0.55, 1., smoothstep(-0.6, 0.7, n.y));
    if (mat == 4.) ao *= 0.4;
    vec3 r = reflect(rd, n);
    // 珠子颜色（珠田本身，或铬球里反射出的珠田）——只调用一次
    vec2 bid = cid; float bead = 1., tp = 0.; vec2 l = vec2(0.);
    if (mat == 3. && r.y < -0.02) {
      tp = (p.y - 0.08) / -r.y; vec3 q = p + r * tp;
      float j = floor(q.z / SZ + 0.5), off = 0.5 * mod(j, 2.), i = floor(q.x / SX - off + 0.5);
      l = vec2(q.x - (i + off) * SX, q.z - j * SZ); bid = vec2(i, j);
      bead = smoothstep(BR * 1.05, BR * 0.6, length(l));
    }
    float sp = 0.;
    vec3 balb = mat == 6. ? beadAlbedo(bid, sp) : vec3(0.);
    float gloss = 0.5, spec = 0.6;
    vec3 alb = vec3(0.72, 0.64, 0.88);
    if (mat == 1.) { alb = HERO; gloss = 1.; spec = 1.; }
    else if (mat == 2.) { alb = PINK; gloss = 1.; spec = 1.; }
    else if (mat == 5.) { alb = vec3(1.0, 0.52, 0.24); gloss = 0.8; }
    else if (mat == 6.) { alb = balb; gloss = 0.7; spec = 0.8; }
    else if (mat == 4.) { gloss = 0.; spec = 0.; }
    float dif = clamp(dot(n, LDIR), 0., 1.);
    vec3 h = normalize(LDIR - rd);
    float fre = pow(1. - clamp(dot(n, -rd), 0., 1.), 4.);
    col = alb * (vec3(1.0, 0.97, 0.94) * dif * sh * 0.62 + vec3(0.92, 0.88, 1.0) * (0.62 + 0.22 * n.y) * ao);
    if (mat == 1. || mat == 2.) col += alb * alb * 0.4 * (1. - 0.6 * dif * sh) * mix(0.6, 1., ao);   // 糖釉的次表面暖光
    col += spec * pow(clamp(dot(n, h), 0., 1.), 90.) * sh * 1.4;
    vec3 env = sky(r);
    if (r.y < 0.) env = mix(env, vec3(0.88, 0.84, 0.98), smoothstep(0., -0.15, r.y));
    col += gloss * (0.06 + 0.6 * fre) * env * mix(1., ao, 0.6) * mix(0.35, 1., smoothstep(-0.2, 0.3, r.y));
    if (mat == 3.) {
      vec3 rc = env;
      if (r.y < -0.02) {
        float g = cellAt(bid).g;
        rc = mix(vec3(0.84, 0.80, 0.98), vec3(1.0, 0.5, 0.25), smoothstep(0.2, 0.8, g)) * 0.9;
        rc = mix(rc, env, smoothstep(1.5, 6., tp));
      }
      col = rc * vec3(0.93, 0.94, 1.0) * (0.78 + 0.25 * fre) + pow(clamp(dot(n, h), 0., 1.), 220.) * 2.;
      col *= mix(0.6, 1., ao);
    }
    col = mix(col, bg, smoothstep(6.5, 15.5, t));
  }
  col = col / (1. + col * 0.12);
  vec2 q = fc / uR;
  col *= 0.9 + 0.1 * pow(16. * q.x * q.y * (1. - q.x) * (1. - q.y), 0.2);
  fragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

  let GL = null;
  function initGL() {
    const c = document.createElement('canvas'); c.width = GW; c.height = GH;
    const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('s05: no webgl2');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('s05 shader: ' + gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS.replace('__DEFS__', ((window.__flags || '').match(/D_\w+/g) || []).map(d => '#define ' + d).join('\n')))); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('s05 link: ' + gl.getProgramInfoLog(pr));
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, TW, TH + 1);
    const U = {}; for (const n of ['uTop', 'uR', 'uT', 'uCam', 'uTgt', 'uObjP', 'uObjS', 'uBeadB', 'uField', 'uFieldRect']) U[n] = gl.getUniformLocation(pr, n);
    GL = { c, gl, pr, tex, U, buf: new Float32Array(TW * (TH + 1) * 4) };
  }

  // 每帧的物体状态
  function stateAt(t) {
    const hero = dropper(t, 0.5, 0.5 + 0.11);
    const don = dropper(t, 1.5, 0.165 + 0.1);
    const chr = dropper(t, 2.0, 0.3 + 0.1);
    const objs = [
      { x: 0.05, z: -0.35, y: hero.y, sq: hero.sq, yaw: 0.62 + 0.15 * Math.exp(-Math.max(0, t - 0.5) * 3) * Math.sin((t - 0.5) * 8), R: 0.5, half: 0.5, imp: hero.imp, ti: 0.5, kind: 0 },
      { x: -0.92, z: 0.55, y: don.y, sq: don.sq, yaw: 0.3, R: 0.5, half: 0.165, imp: don.imp, ti: 1.5, kind: 1 },
      { x: 0.95, z: 0.62, y: chr.y, sq: chr.sq, yaw: 0, R: 0.3, half: 0.3, imp: chr.imp, ti: 2.0, kind: 2 },
    ];
    return objs;
  }

  function fieldTexture(t, objs) {
    const b = GL.buf, impacts = [];
    for (const o of objs) for (const m of o.imp) if (t >= m.t) impacts.push({ x: o.x, z: o.z, t: m.t, s: m.s * (o.kind === 0 ? 1 : 0.7) });
    for (let jz = 0; jz < TH; jz++) {
      const j = jz + J0, z = j * SZ, off = 0.5 * (((j % 2) + 2) % 2);
      for (let ix = 0; ix < TW; ix++) {
        const x = (ix + I0 + off) * SX;
        let h = 0, hero = 0, pink = 0;
        for (const m of impacts) {
          const dt = t - m.t, d = Math.hypot(x - m.x, z - m.z), front = dt * 2.3;
          if (d < front + 0.1) h += m.s * 0.11 * Math.sin(13 * (d - front)) * Math.exp(-dt * 1.5) * Math.exp(-d * 0.45) * S.smooth(front + 0.1, front - 0.25, d);
        }
        for (const o of objs) {
          const d = Math.hypot(x - o.x, z - o.z);
          const bottom = o.y - o.half * (1 - o.sq), sink = 0.13 - bottom;
          const fr = o.R * (1 + o.sq * 0.5) * 0.92;
          if (sink > 0) {
            h -= sink * S.smooth(fr + 0.2, fr - 0.15, d);
            h += sink * 0.35 * Math.exp(-Math.pow((d - fr - 0.2) / 0.14, 2));
          }
          // 颜色从接触点蔓延
          const dt = t - o.ti;
          if (dt > 0) {
            const R = (o.kind === 0 ? 2.2 : 0.8) * (1 - Math.exp(-dt * 0.75)) + 0.45;
            const n = S.noise2(x * 1.7 + o.kind * 9, z * 1.7) * 0.35;
            const k = S.clamp((R + n - d) / 0.35);
            if (o.kind === 0) hero = Math.max(hero, k); else if (o.kind === 1) pink = Math.max(pink, k);
          }
        }
        const q = (jz * TW + ix) * 4; b[q] = h; b[q + 1] = hero; b[q + 2] = pink; b[q + 3] = 1;
      }
    }
    return b;
  }

  function scatter(t, objs) {
    const out = [];
    for (const o of objs) {
      const dt = t - o.ti;
      for (let k = 0; k < 6; k++) {
        const r = S.rng(o.kind * 100 + k + 7), a = r() * S.TAU, v = 1.2 + r() * 1.4, vy = 2.2 + r() * 2.2, rr = 0.045 + r() * 0.02;
        if (dt <= 0) { out.push([0, -5, 0, 0]); continue; }
        const x = o.x + Math.cos(a) * (o.R * 0.9 + v * dt), z = o.z + Math.sin(a) * (o.R * 0.9 + v * dt), y = 0.1 + vy * dt - 0.5 * G * dt * dt;
        out.push(y > 0.05 ? [x, y, z, rr] : [0, -5, 0, 0]);
      }
    }
    return out;
  }

  function renderGL(t) {
    const { gl, U } = GL;
    const objs = stateAt(t);
    gl.viewport(0, 0, GW, GH); gl.useProgram(GL.pr);
    // 场贴图
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.tex);
    const fb = fieldTexture(t, objs), sc = scatter(t, objs);
    sc.forEach((v, i) => fb.set(v, (TH * TW + i) * 4));
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, TH + 1, gl.RGBA, gl.FLOAT, fb);
    gl.uniform1i(U.uField, 0);
    gl.uniform4f(U.uFieldRect, I0, J0, TW, TH);
    gl.uniform2f(U.uR, GW, GH); gl.uniform1f(U.uT, t);
    // 镜头：一镜到底的缓慢推近 + 环绕
    const k = S.E.inOut2(S.seg(t, -0.6, 4.6));
    const ang = S.lerp(0.5, 0.02, k), dist = S.lerp(7.1, 5.9, k), hgt = S.lerp(3.2, 2.6, k);
    gl.uniform3f(U.uCam, Math.sin(ang) * dist, hgt, Math.cos(ang) * dist - 0.2);
    gl.uniform3f(U.uTgt, 0.0, 0.1, -0.15);
    const P = [], Sc = [];
    for (const o of objs) {
      P.push(o.x, o.y, o.z, o.yaw);
      const sy = 1 - o.sq, sx = 1 + o.sq * 0.55;
      Sc.push(sx, sy, sx, o.kind === 1 ? 0.5 * Math.exp(-Math.max(0, t - o.ti) * 3) * Math.cos(Math.max(0, t - o.ti) * 10) + (t < o.ti ? 0.5 : 0) : 0);
    }
    gl.uniform1f(U.uTop, Math.max(...objs.map(o => o.y + 0.75)));
    gl.uniform4fv(U.uObjP, P); gl.uniform4fv(U.uObjS, Sc);
    let cx = 0, cy = 0, cz = 0, n = 0;
    for (const s of sc) if (s[3] > 0) { cx += s[0]; cy += s[1]; cz += s[2]; n++; }
    let br = -1;
    if (n) { cx /= n; cy /= n; cz /= n; br = 0; for (const s of sc) if (s[3] > 0) br = Math.max(br, Math.hypot(s[0] - cx, s[1] - cy, s[2] - cz) + s[3]); }
    gl.uniform4f(U.uBeadB, cx, n ? cy : -9, cz, br);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return GL.c;
  }

  registerScene({
    n: 5, key: 'render3d', zh: '3D 渲染', en: '3D Render',
    bg: '#e8def6', accent: HERO,
    init: async () => { initGL(); },
    draw(ctx, t, S) {
      const { W, H, E, seg, clamp } = S;
      if (!GL) initGL();
      renderGL(t);
      ctx.save(); ctx.imageSmoothingQuality = 'low'; // 读回像素（着色器已上下翻转输出）→ 离屏层 → 放大绘制；比直接 drawImage(WebGL 画布) 省很多
      const gl = GL.gl; if (!GL.px) { GL.px = new Uint8ClampedArray(GW * GH * 4); GL.img = new ImageData(GL.px, GW, GH); }
      gl.readPixels(0, 0, GW, GH, gl.RGBA, gl.UNSIGNED_BYTE, GL.px);
      const L = S.layer('s05-gl', GW, GH); L.getContext('2d').putImageData(GL.img, 0, 0);
      ctx.drawImage(L, 0, 0, W, H); ctx.restore();

      // ---------- 标题：干净的产品渲染式排版 ----------
      const a = E.out3(seg(t, -0.3, 0.45)), b = E.out3(seg(t, -0.15, 0.6)), c2 = E.out3(seg(t, 0.0, 0.7));
      ctx.save();
      ctx.textBaseline = 'alphabetic';
      // 编号：大号、渐变、柔和投影
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 40);
      ctx.font = S.F(250, 'InterXB', 800); ctx.letterSpacing = '-12px';
      const g = ctx.createLinearGradient(0, 230, 0, 470); g.addColorStop(0, '#ff9a5c'); g.addColorStop(0.55, HERO); g.addColorStop(1, '#e8481c');
      ctx.shadowColor = 'rgba(160,80,60,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      ctx.fillStyle = g; ctx.fillText('05', 80, 450);
      ctx.shadowColor = 'transparent';
      // 糖釉高光
      const hg = ctx.createLinearGradient(0, 270, 0, 380); hg.addColorStop(0, 'rgba(255,255,255,0.6)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.fillText('05', 80, 450);
      ctx.restore();
      ctx.letterSpacing = '0px';
      // 中文名
      ctx.save(); ctx.globalAlpha = b; ctx.translate((1 - b) * 30, 0);
      ctx.font = S.F(128, 'NotoSansSC', 900); ctx.fillStyle = '#2d2545';
      ctx.fillText('3D 渲染', 420, 400);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = c2; ctx.translate((1 - c2) * 30, 0);
      ctx.font = S.F(46, 'Inter'); ctx.letterSpacing = '10px'; ctx.fillStyle = '#5b4f7a';
      ctx.fillText('3D RENDER', 426, 456);
      ctx.restore();
      // 细线与参数注记（渲染器 UI 感）
      ctx.save(); ctx.globalAlpha = c2 * 0.8; ctx.fillStyle = '#6d5f90'; ctx.font = S.F(24, 'JetBrainsMono'); ctx.letterSpacing = '2px';
      ctx.fillRect(84, 500, 860 * E.out3(seg(t, 0.1, 0.9)), 2);
      const spp = Math.min(4096, Math.round(64 * Math.pow(2, clamp(t + 0.4) * 6)));
      ctx.fillText(`RAYMARCH · SDF · ${spp} SPP`, 84, 540);
      ctx.textAlign = 'right'; ctx.fillText(`F ${String(Math.max(0, Math.round((t + 0.4) * 30))).padStart(3, '0')}`, 940, 540);
      ctx.restore();
      ctx.restore();
    },
  });
})();
