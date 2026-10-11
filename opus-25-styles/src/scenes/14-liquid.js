// 14 液态流动 —— WebGL2 光线步进的元球果冻：橙、品红、紫三团液体颈部鼓起融合、拉伸断开、落下溅起皇冠水花，弹性回弹后微微晃动。
// 标题也是同一个着色器里的果冻：文字先画进 2D 画布并模糊成高度图，再按同样的折射/高光着色。
(function () {
  const GW = 540, GH = 960;
  const ND = 8;                       // 皇冠飞溅的小液滴
  const DATA_W = 12 + ND;

  const FS = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uR;
uniform float uT;
uniform sampler2D uData;   // 每个图元一个纹素
uniform sampler2D uText;   // 标题高度图（a）+ 颜色（rgb）

const vec3 C_OR = vec3(1.0, 0.52, 0.06);
const vec3 C_MG = vec3(1.0, 0.08, 0.52);
const vec3 C_VI = vec3(0.52, 0.16, 1.0);
const float F = 2.5;

// 图元（从纹理拷到全局变量，避免内联函数里反复取 uniform）
float gT;
vec4 gA, gAs, gB, gBs, gD, gDs, gC, gCp, gS1, gS2, gDB;

float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * 0.25; }
float sdEll(vec3 p, vec4 c, vec3 s){ vec3 q = (p - c.xyz) / s; return (length(q) - c.w) * min(s.x, min(s.y, s.z)); }

float map(vec3 p){
  float d = sdEll(p, gA, gAs.xyz);
  d = smin(d, sdEll(p, gB, gBs.xyz), gAs.w);
  d = smin(d, sdEll(p, gD, gDs.xyz), gDs.w);
  if (gCp.z > 0.) {
    vec3 q = p - gC.xyz;
    float ring = length(vec2(length(q.xz) - gC.w, q.y)) - gCp.x;
    // 皇冠的尖：沿圆周起伏
    ring -= gCp.y * (0.5 + 0.5 * cos(atan(q.z, q.x) * 8.)) * smoothstep(-0.05, 0.1, q.y);
    d = smin(d, ring, 0.12);
  }
  if (length(p - gDB.xyz) < gDB.w + 0.3) {
    for (int i = 0; i < ${ND}; i++) {
      vec4 b = texelFetch(uData, ivec2(12 + i, 0), 0);
      if (b.w > 0.) d = smin(d, length(p - b.xyz) - b.w, 0.1);
    }
  }
  d = smin(d, length(p - gS1.xyz) - gS1.w, 0.26);
  d = smin(d, length(p - gS2.xyz) - gS2.w, 0.08);
  return d;
}

// 命中点的颜色：按到各图元的距离加权混合（相邻处颜色交融）
vec3 colorAt(vec3 p){
  float wa = exp(-14. * max(sdEll(p, gA, gAs.xyz), 0.));
  float wb = exp(-14. * max(sdEll(p, gB, gBs.xyz), 0.));
  float wd = exp(-14. * max(sdEll(p, gD, gDs.xyz), 0.));
  float ws = exp(-14. * max(min(length(p - gS1.xyz) - gS1.w, length(p - gS2.xyz) - gS2.w), 0.));
  float wc = gCp.z > 0. ? exp(-9. * max(length(p - gC.xyz) - gC.w - 0.1, 0.)) * 0.6 : 0.;
  vec3 c = wa * C_OR + wb * C_MG + wd * C_VI + ws * C_VI + wc * mix(C_OR, C_MG, 0.5);
  return c / (wa + wb + wd + ws + wc + 1e-4);
}

vec3 bgAt(vec2 uv){
  vec2 q = uv - vec2(0., -0.25);
  float r = length(q * vec2(1.25, 0.8));
  vec3 c = mix(vec3(0.30, 0.10, 0.42), vec3(0.035, 0.0, 0.075), smoothstep(0.0, 1.25, r));
  // 远处虚化光斑
  c += vec3(0.9, 0.3, 0.6) * 0.10 * smoothstep(0.22, 0.0, length(uv - vec2(-0.42, 0.55)));
  c += vec3(1.0, 0.5, 0.2) * 0.07 * smoothstep(0.16, 0.0, length(uv - vec2(0.45, -0.85)));
  c += vec3(0.5, 0.3, 1.0) * 0.08 * smoothstep(0.3, 0.0, length(uv - vec2(0.5, 0.15)));
  // 漂浮的失焦小气泡
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 bp = vec2(fract(fi * 0.618 + 0.13) * 1.1 - 0.55, fract(fi * 0.371 + gT * 0.05 + 0.2) * 2.2 - 1.1);
    float br = 0.025 + 0.03 * fract(fi * 0.53);
    float dd = length(uv - bp);
    vec3 bc = i % 3 == 0 ? vec3(1.0, 0.5, 0.2) : i % 3 == 1 ? vec3(1.0, 0.2, 0.6) : vec3(0.6, 0.3, 1.0);
    c += bc * (0.10 * smoothstep(br, br * 0.6, dd) + 0.08 * smoothstep(br * 0.3, br * 1.05, dd) * smoothstep(br * 1.1, br * 0.9, dd));
  }
  return c;
}
vec3 bgDir(vec3 d){ return bgAt(d.xy / max(-d.z, 0.05) * F * 0.95); }
vec3 env(vec3 r){
  // 摄影棚环境：上方大柔光箱 + 侧面条灯，供模糊反射
  float top = smoothstep(0.35, 0.9, r.y) * smoothstep(-0.2, 0.5, -r.z + 0.3);
  float side = smoothstep(0.75, 0.95, dot(r, normalize(vec3(-0.9, 0.2, 0.5))));
  float side2 = smoothstep(0.85, 0.97, dot(r, normalize(vec3(0.9, -0.1, 0.4))));
  return vec3(1.0, 0.95, 1.0) * top * 0.9 + vec3(1.0, 0.6, 0.85) * side * 0.6 + vec3(0.6, 0.5, 1.0) * side2 * 0.5;
}

vec3 jelly(vec3 n, vec3 rd, vec3 c, vec2 uv, float thick){
  float ndv = clamp(dot(n, -rd), 0., 1.);
  float fre = pow(1. - ndv, 3.);
  vec3 rr = refract(rd, n, 0.72);
  vec3 trans = bgDir(rr) * 2.6 + 0.04;
  // 越厚越深、越饱和；边缘透出背景
  vec3 absorb = pow(c, vec3(0.45 + 2.2 * thick));
  vec3 col = trans * absorb * 1.3 + c * c * (0.10 + 0.22 * (1. - thick));
  // 内部焦散：背光一侧（下方）透出的亮色
  col += mix(c, vec3(1.0, 0.8, 0.5), 0.25) * smoothstep(-0.1, 0.9, -n.y * 0.8 + n.x * 0.3) * (0.55 - 0.3 * ndv);
  // 次表面：边缘透亮
  col += c * pow(1. - ndv, 1.8) * 0.5;
  // 边缘光
  col += mix(vec3(1.0, 0.55, 0.9), vec3(0.6, 0.5, 1.0), 0.5 + 0.5 * n.x) * smoothstep(0.6, 1., 1. - ndv) * 0.5;
  vec3 r = reflect(rd, n);
  col += env(r) * (0.12 + 0.8 * fre);
  // 锐利的白色高光
  col += vec3(1.) * pow(clamp(dot(r, normalize(vec3(-0.45, 0.75, 0.6))), 0., 1.), 160.) * 2.6;
  col += vec3(1.) * pow(clamp(dot(r, normalize(vec3(0.6, 0.35, 0.75))), 0., 1.), 300.) * 1.4;
  return col;
}

void main(){
  vec2 fc = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y);
  vec2 uv = (fc - 0.5 * uR) / uR.y * 2.;
  gT = uT;
  gA = texelFetch(uData, ivec2(0, 0), 0); gAs = texelFetch(uData, ivec2(1, 0), 0);
  gB = texelFetch(uData, ivec2(2, 0), 0); gBs = texelFetch(uData, ivec2(3, 0), 0);
  gD = texelFetch(uData, ivec2(4, 0), 0); gDs = texelFetch(uData, ivec2(5, 0), 0);
  gC = texelFetch(uData, ivec2(6, 0), 0); gCp = texelFetch(uData, ivec2(7, 0), 0);
  gS1 = texelFetch(uData, ivec2(8, 0), 0); gS2 = texelFetch(uData, ivec2(9, 0), 0); gDB = texelFetch(uData, ivec2(10, 0), 0);

  vec3 col = bgAt(uv);
  // ---- 标题果冻（高度图）----
  ivec2 ip = ivec2(gl_FragCoord.xy);   // 渲染行 0 = 画面顶部 = 文字纹理行 0
  vec4 tx = texelFetch(uText, ip, 0);
  bool done = false;
  if (tx.a > 0.02) {
    float hx = texelFetch(uText, ip + ivec2(2, 0), 0).a - texelFetch(uText, ip - ivec2(2, 0), 0).a;
    float hy = texelFetch(uText, ip + ivec2(0, 2), 0).a - texelFetch(uText, ip - ivec2(0, 2), 0).a;
    vec3 n = normalize(vec3(-hx * 2.2, hy * 2.2, 1.));
    vec3 c = tx.rgb / max(tx.a, 1e-3);
    vec3 jc = jelly(n, vec3(0., 0., -1.), c, uv, smoothstep(0.2, 1., tx.a));
    // 软边：阴影 + 渐入
    col *= 1. - 0.35 * smoothstep(0.0, 0.3, texelFetch(uText, ip - ivec2(5, 8), 0).a);
    col = mix(col, jc, smoothstep(0.08, 0.38, tx.a));
  } else {
    col *= 1. - 0.35 * smoothstep(0.0, 0.3, texelFetch(uText, ip - ivec2(5, 8), 0).a);
  }
  // ---- 元球 ----
  vec3 ro = vec3(0., 1.35, 5.);
  vec3 fw = normalize(vec3(0., 0.04, 0.) - ro), rt = normalize(cross(fw, vec3(0., 1., 0.))), up = cross(rt, fw);
  vec3 rd = normalize(fw * F + uv.x * rt + uv.y * up);
  // 包围球：射线不经过就跳过
  vec3 oc = ro - vec3(0., -0.3, 0.);
  float bb = dot(oc, rd), bc = dot(oc, oc) - 1.45 * 1.45, bh = bb * bb - bc;
  float t = bh > 0. ? max(0., -bb - sqrt(bh)) : 1e9;
  float tEnd = bh > 0. ? -bb + sqrt(bh) : -1.;
  float hit = -1., md = 1e9, mt = 0.;
  float pix = 2.6 / uR.y / F;   // 每像素对应的角度
  for (int i = 0; i < 72; i++) {
    if (t > tEnd) break;
    float d = map(ro + rd * t);
    if (d / t < md) { md = d / t; mt = t; }
    if (d < 0.0015) { hit = t; break; }
    t += d * 0.9;
  }
  // 边缘抗锯齿：未命中但贴近表面的像素按覆盖率混合
  float cover = hit > 0. ? 1. : 1. - smoothstep(0., pix, md);
  if (cover > 0.) {
    if (hit < 0.) t = mt;
    vec3 p = ro + rd * t;
    vec3 n = vec3(0.);
    for (int i = 0; i < 5; i++) {
      // i < 4: 法线四面体采样；i == 4: 沿折射方向探入，估计厚度
      vec3 e = 0.5773 * (2. * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.);
      vec3 q = i < 4 ? p + e * 0.002 : p + normalize(refract(rd, normalize(n), 0.75)) * 0.35;
      float d = map(q);
      if (i < 4) n += e * d; else t = clamp(-d / 0.3, 0., 1.);
    }
    n = normalize(n);
    vec3 c = colorAt(p);
    col = mix(col, jelly(n, rd, c, uv, t), cover);
  } else {
    // 液体下方的柔和反光
    vec2 q = uv - vec2(0., -0.72);
    col += vec3(0.6, 0.15, 0.4) * 0.16 * exp(-dot(q * vec2(1.2, 5.), q * vec2(1.2, 5.)));
  }
  // 暗角
  vec2 v = fc / uR - 0.5;
  col *= 1. - 0.55 * dot(v * vec2(1.4, 1.0), v * vec2(1.4, 1.0));
  col = col / (1. + 0.15 * col);
  fragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

  let GL = null;
  function initGL() {
    const c = document.createElement('canvas'); c.width = GW; c.height = GH;
    const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('s14: no webgl2');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('s14 shader: ' + gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('s14 link: ' + gl.getProgramInfoLog(pr));
    const mkTex = (w, h, fmt, ifmt, type) => {
      const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texStorage2D(gl.TEXTURE_2D, 1, ifmt, w, h); return tx;
    };
    const data = mkTex(DATA_W, 1, gl.RGBA, gl.RGBA32F, gl.FLOAT);
    const text = mkTex(GW, GH, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE);
    gl.useProgram(pr);
    gl.uniform1i(gl.getUniformLocation(pr, 'uData'), 0); gl.uniform1i(gl.getUniformLocation(pr, 'uText'), 1);
    GL = { c, gl, pr, data, text, uR: gl.getUniformLocation(pr, 'uR'), uT: gl.getUniformLocation(pr, 'uT'), buf: new Float32Array(DATA_W * 4), textKey: null,
      px: new Uint8ClampedArray(GW * GH * 4) };
    GL.img = new ImageData(GL.px, GW, GH);
  }

  // ---------- 编排（t 的纯函数） ----------
  function scene(t) {
    const { seg, E, clamp, lerp } = S;
    const out = new Float32Array(DATA_W * 4);
    const set = (i, a, b, c, d) => { out[i * 4] = a; out[i * 4 + 1] = b; out[i * 4 + 2] = c; out[i * 4 + 3] = d; };
    // 漂移靠拢 → 0.5 拍点融合 → 弹性收拢
    const app = E.inOut2(seg(t, -0.6, 0.55));
    const settle = t > 0.55 ? 1 - Math.exp(-(t - 0.55) * 5) * Math.cos((t - 0.55) * 16) : 0;
    let ax = lerp(-0.8, -0.4, app), bx = lerp(0.8, 0.38, app);
    ax = lerp(ax, -0.27, settle); bx = lerp(bx, 0.25, settle);
    const floatY = Math.sin(t * 2.2) * 0.03;
    // 撞击后的整体晃动
    const imp = t - 2.0;
    const wob = imp > 0 ? Math.exp(-imp * 2.6) * Math.sin(imp * 17) : 0;
    const neck = t < 0.55 ? 0.12 + 0.25 * E.in2(seg(t, -0.2, 0.55)) : 0.37;
    // 融合时的挤压
    const fuse = t > 0.45 ? Math.exp(-(t - 0.45) * 4) * Math.sin((t - 0.45) * 14) : 0;
    set(0, ax, -0.52 + floatY, 0, 0.44);
    const br1 = 0.025 * Math.sin(t * 4.4), br2 = 0.025 * Math.sin(t * 4.4 + 1.9);
    set(1, 1 - fuse * 0.08 + wob * 0.06 - br1, 1 + fuse * 0.1 - wob * 0.1 + br1, 1, neck);
    set(2, bx, -0.44 - floatY, 0.05, 0.39);
    set(3, 1 - fuse * 0.08 + wob * 0.06 - br2, 1 + fuse * 0.12 - wob * 0.12 + br2, 1, 0);
    // 液滴：从融合体顶部拉出（1.0–1.55），断开上升，回落（2.0 撞击）
    let dy, dr = 0.17, sy = 1, dk = 0.3;
    if (t < 1.0) { dy = -0.45; dr = 0.12 + 0.05 * seg(t, 0.6, 1.0); }
    else if (t < 1.6) { const k = seg(t, 1.0, 1.6); dy = lerp(-0.4, 0.24, E.out3(k)); sy = 1 + 0.6 * Math.sin(Math.PI * Math.min(1, k * 1.6)); dk = lerp(0.35, 0.18, k); }
    else if (t < 2.0) { const k = seg(t, 1.6, 2.0); dy = lerp(0.24, -0.1, E.in2(k)); sy = 1 + 0.35 * k; dk = 0.18; }
    else { const k = seg(t, 2.0, 2.35); dy = lerp(-0.1, -0.35, E.out2(k)); dr = 0.17 * (1 - 0.6 * k); sy = 1 - 0.3 * Math.exp(-imp * 6); dk = 0.3; }
    if (t > 1.55 && t < 1.62) dk = 0.18;
    set(4, 0.0, dy, 0.08, dr);
    set(5, 1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy), dk);
    // 皇冠水花（2.0 撞击后升起再塌下）
    const ck = seg(t, 2.0, 2.9);
    const crownOn = t > 2.0 && t < 2.9 ? 1 : 0;
    const top = -0.12 + 0.02 * Math.sin(t * 2.2);
    set(6, 0, top + 0.12 * Math.sin(Math.PI * Math.min(1, ck * 1.3)), 0.06, 0.08 + 0.3 * E.out3(ck));
    set(7, 0.045 * (1 - ck), 0.07 * Math.sin(Math.PI * Math.min(1, ck * 1.5)), crownOn, 0);
    // 卫星小球（紫）缓慢环绕
    const a1 = t * 0.9 + 0.6, a2 = t * 0.9 + 3.6;
    // 紫色小团：先在左侧漂浮，2.4 起从下方绕到右下，3.0 拍点并入主体
    {
      const k = E.inOut2(seg(t, 2.4, 3.0));
      const x0 = Math.cos(a1) * 0.7, y0 = -0.1 + Math.sin(a1) * 0.1, z0 = Math.sin(a1) * 0.3;
      const x1 = 0.5, y1 = -0.78, z1 = 0.15;
      const bx2 = S.lerp(S.lerp(x0, 0.0, k), S.lerp(0.0, x1, k), k), by2 = S.lerp(S.lerp(y0, -1.05, k), S.lerp(-1.05, y1, k), k);
      const after = t - 3.0, jig = after > 0 ? Math.exp(-after * 4) * Math.sin(after * 18) * 0.04 : 0;
      set(8, bx2, by2 + jig, S.lerp(z0, z1, k), 0.13 + 0.07 * k + 0.012 * S.pulse(t, 7));
    }
    set(9, 0.72 + Math.cos(a2) * 0.08, 0.12 + Math.sin(a2 * 1.3) * 0.1, 0.1 + Math.sin(a2) * 0.2, 0.07 + 0.01 * Math.sin(t * 6));
    // 飞溅小液滴：从皇冠边缘抛出，落回并融合
    let cx = 0, cy = 0, cz = 0, n = 0;
    const drops = [];
    for (let i = 0; i < ND; i++) {
      const r = S.rng(1400 + i), ang = (i + 0.3 * r()) / ND * S.TAU, v = 0.6 + r() * 0.5, vy = 1.0 + r() * 0.7, dt = t - 2.05;
      if (dt <= 0 || dt > 1.25) { set(12 + i, 0, -9, 0, 0); continue; }
      const R0 = 0.2 + v * dt, y = top + 0.05 + vy * dt - 0.5 * 4.2 * dt * dt;
      const x = Math.cos(ang) * R0, z = Math.sin(ang) * R0 * 0.6 + 0.06;
      const rr = (0.035 + r() * 0.03) * clamp(dt * 8) * (y < -0.25 ? clamp(1 - (-0.25 - y) * 4) : 1);
      set(12 + i, x, y, z, rr); drops.push([x, y, z, rr]);
      if (rr > 0) { cx += x; cy += y; cz += z; n++; }
    }
    let br = 0;
    if (n) { cx /= n; cy /= n; cz /= n; for (const d of drops) if (d[3] > 0) br = Math.max(br, Math.hypot(d[0] - cx, d[1] - cy, d[2] - cz) + d[3]); }
    set(10, cx, n ? cy : -9, cz, n ? br : 0);
    return out;
  }

  // 标题高度图：2D 画布写字 → 模糊 → 作为纹理
  function textMap(t) {
    const { E, seg, clamp } = S;
    // 入场后静止：量化动画状态做缓存
    const k = Math.round(clamp((t + 0.4) / 1.4) * 42);
    const wob = t > 1.0 ? Math.round(Math.sin(t * Math.PI * 2) * S.pulse(t, 6) * 6) : 0;
    const key = k + ':' + wob;
    if (GL.textKey === key) return false;
    GL.textKey = key;
    const tt = k / 42 * 1.4 - 0.4;
    const L = S.layer('s14-text', GW, GH), g = L.getContext('2d');
    const A = S.layer('s14-textA', GW, GH), ga = A.getContext('2d');
    ga.setTransform(1, 0, 0, 1, 0, 0); ga.clearRect(0, 0, GW, GH);
    ga.textBaseline = 'alphabetic';
    // 14：橙→品红
    const e1 = E.outElastic(seg(tt, -0.4, 0.5));
    ga.save(); ga.translate(46 + 70, 236); ga.scale(e1, 2 - e1 + wob * 0.004); ga.translate(-70, 0);
    const g1 = ga.createLinearGradient(0, -110, 0, 0); g1.addColorStop(0, '#ffc04a'); g1.addColorStop(0.5, '#ff7a3a'); g1.addColorStop(1, '#ff2f7a');
    ga.fillStyle = g1; ga.font = S.F(122, 'RubikMonoOne'); ga.fillText('14', 0, 0); ga.restore();
    // 液态流动：逐字弹入
    ga.font = S.F(100, 'ZCOOLQingKe');
    const cs = S.chars(ga, '液态流动', 44, 'left', 4);
    cs.forEach((c, i) => {
      const e = E.outElastic(seg(tt, -0.25 + i * 0.09, 0.75 + i * 0.09));
      const g2 = ga.createLinearGradient(0, 250, 0, 360); g2.addColorStop(0, ['#ff9a3c', '#ff5a6e', '#e93ca8', '#a65bff'][i]); g2.addColorStop(1, ['#ff4a6e', '#e2329a', '#9b48ff', '#7a3cff'][i]);
      ga.save(); ga.translate(c.cx, 352); ga.scale(e, (2 - e) * (1 + (i % 2 ? -1 : 1) * wob * 0.006)); ga.fillStyle = g2; ga.fillText(c.ch, -c.w / 2, 0); ga.restore();
    });
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, GW, GH); g.filter = 'blur(3.5px)'; g.drawImage(A, 0, 0); g.filter = 'none';
    const gl = GL.gl;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, GL.text);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GW, GH, gl.RGBA, gl.UNSIGNED_BYTE, L);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    return true;
  }

  function renderGL(t) {
    const gl = GL.gl;
    gl.viewport(0, 0, GW, GH); gl.useProgram(GL.pr);
    textMap(t);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.data);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, DATA_W, 1, gl.RGBA, gl.FLOAT, scene(t));
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, GL.text);
    gl.uniform2f(GL.uR, GW, GH); gl.uniform1f(GL.uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, GW, GH, gl.RGBA, gl.UNSIGNED_BYTE, GL.px);
    const L = S.layer('s14-gl', GW, GH); L.getContext('2d').putImageData(GL.img, 0, 0);
    return L;
  }

  registerScene({
    n: 14, key: 'liquid', zh: '液态流动', en: 'Liquid Jelly',
    bg: '#1e0a2e', accent: '#ff3d8b',
    init: async () => { initGL(); },
    draw(ctx, t, S) {
      const { W, H, E, seg } = S;
      if (!GL) initGL();
      const L = renderGL(t);
      ctx.save(); ctx.imageSmoothingQuality = 'low'; ctx.drawImage(L, 0, 0, W, H); ctx.restore();
      // 英文名：清晰的小字
      const a = E.out3(seg(t, 0.1, 0.7));
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * 40, 0);
      ctx.font = S.F(40, 'InterXB', 800); ctx.letterSpacing = '14px'; ctx.fillStyle = 'rgba(255,214,240,0.92)';
      ctx.fillText('LIQUID  JELLY', 96, 820);
      ctx.fillStyle = 'rgba(255,160,210,0.6)'; ctx.fillRect(96, 846, 120 + 300 * a, 3);
      ctx.restore();
    },
  });
})();
