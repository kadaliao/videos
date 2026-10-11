// 逐帧导出：本地静态服务 + 多个无头 Chromium 页面并行 renderFrame(i)，抓 JPEG，ffmpeg 合成无声视频。
// usage:
//   node render.mjs --stills 3.5,10,20                 全片时间点静帧 → build/stills/
//   node render.mjs --scene 7 --times 0,1,2,3          单个场景（不带转场）的本地时间静帧 → build/stills/s07/
//   node render.mjs --scene 7 --sheet                  单个场景 -0.2..4.2s 每 0.3s 一帧的接触表 → build/stills/s07/sheet.jpg
//   node render.mjs --out build/video.mp4 [--workers 4] [--from 秒] [--to 秒] [--fps 30]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav' };
const server = createServer((q, r) => { const f = join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); });
await new Promise(res => server.listen(0, '127.0.0.1', res)); const PORT = server.address().port;
const exe = process.env.CHROMIUM || (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--font-render-hinting=none', '--disable-accelerated-2d-canvas', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
async function open() {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => { errors.push(e.message); console.error('[pageerror]', e.message); });
  p.on('console', m => ['warning', 'error'].includes(m.type()) && console.warn('[console]', m.text()));
  await p.goto(`http://127.0.0.1:${PORT}/index.html?mode=render`); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  return p;
}
const grab = (p, fn, arg, type = 'jpeg') => p.evaluate(async ([fn, arg, type]) => { await window[fn](arg); const u = document.getElementById('stage').toDataURL('image/' + type, 0.94); return u.slice(u.indexOf(',') + 1); }, [fn, arg, type]);
const save = (f, b64) => writeFileSync(f, Buffer.from(b64, 'base64'));
mkdirSync(join(ROOT, 'build/stills'), { recursive: true });

if (opt('--scene')) {
  const n = +opt('--scene'), dir = join(ROOT, `build/stills/s${String(n).padStart(2, '0')}`); mkdirSync(dir, { recursive: true });
  const p = await open();
  if (a.includes('--sheet')) {
    const times = []; for (let t = -0.2; t <= 4.21; t += 0.3) times.push(+t.toFixed(2));
    const tmp = join(dir, 'sheet'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
    let k = 0, t0 = Date.now();
    for (const t of times) save(join(tmp, `${String(k++).padStart(3, '0')}.jpg`), await grab(p, 'renderScene', [n, t]));
    const ms = (Date.now() - t0) / times.length;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(tmp, '%03d.jpg'), '-vf', 'scale=270:480,drawtext=text=%{n}:fontcolor=white:fontsize=18:box=1:boxcolor=black@0.5:x=6:y=6,tile=5x3:padding=6:color=gray', '-frames:v', '1', join(dir, 'sheet.jpg')]);
    console.log(`${join(dir, 'sheet.jpg')}  (frames at t = ${times.join(', ')}; avg ${ms.toFixed(0)} ms/frame)`);
  } else {
    const t0 = Date.now(), ts = (opt('--times', '0.5,1.5,2.5,3.5')).split(',').map(Number);
    for (const t of ts) save(join(dir, `t${t.toFixed(2)}.jpg`), await grab(p, 'renderScene', [n, t]));
    console.log(`${dir}/  (${ts.length} stills, avg ${((Date.now() - t0) / ts.length).toFixed(0)} ms/frame)`);
  }
} else if (opt('--stills')) {
  const p = await open(), dir = join(ROOT, opt('--stilldir', 'build/stills')); mkdirSync(dir, { recursive: true });
  for (const s of opt('--stills').split(',')) save(join(dir, `T${(+s).toFixed(2).padStart(6, '0')}.jpg`), await grab(p, 'renderAt', +s));
  console.log('stills ok');
} else {
  const p0 = await open(); const fps = await p0.evaluate(() => window.FPS_OUT), total = await p0.evaluate(() => window.TOTAL_FRAMES); await p0.close();
  const f0 = Math.round(+opt('--from', 0) * fps), f1 = Math.min(total, Math.round(+opt('--to', 1e9) * fps));
  // 帧按全片绝对序号命名；只渲染一段（--from/--to）时保留其余帧，方便局部重渲后再整体编码
  const dir = join(ROOT, 'build/frames'); mkdirSync(dir, { recursive: true }); if (f0 === 0 && f1 === total) for (const f of readdirSync(dir)) unlinkSync(join(dir, f));
  const workers = +opt('--workers', 4); let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const p = await open();
    for (let i = f0 + k; i < f1; i += workers) {
      save(join(dir, `${String(i).padStart(5, '0')}.jpg`), await grab(p, 'renderFrame', i));
      if (++done % 150 === 0) console.log(`${done}/${f1 - f0} ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} fps`);
    }
  }));
  console.log(`rendered ${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const OUTV = opt('--out', 'build/video.mp4'); mkdirSync(dirname(join(ROOT, OUTV)), { recursive: true });
  // 两遍编码，6 Mbps：成片控制在 GitHub 单文件 100 MB 以内
  const enc = pass => ['-v', 'error', '-y', '-framerate', String(fps), '-i', join(dir, '%05d.jpg'), '-vf', 'scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-b:v', '6000k', '-maxrate', '9000k', '-bufsize', '12000k', '-pass', String(pass), '-passlogfile', join(ROOT, 'build/x264')];
  execFileSync('ffmpeg', [...enc(1), '-an', '-f', 'null', '-'], { stdio: 'inherit' });
  execFileSync('ffmpeg', [...enc(2), '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', join(ROOT, OUTV)], { stdio: 'inherit' });
  console.log(OUTV);
}
if (errors.length) console.error(`${errors.length} page errors`);
await browser.close(); server.close();
