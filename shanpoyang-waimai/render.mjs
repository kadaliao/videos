// 逐帧导出：本地静态服务 + 多个无头 Chromium 页面并行 renderFrame(i)，抓 JPEG，ffmpeg 合成无声视频。
// usage: node render.mjs [--page film.html] [--out build/video2.mp4] [--workers 4] [--from 秒] [--to 秒] [--stills 1,5.5,...] [--cover]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav' };
const PORT = +(process.env.PORT || 8793);
const PAGE = opt('--page', 'index.html'), OUTV = opt('--out', 'build/video.mp4');
const server = createServer((q, r) => { const f = join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(PORT);
const exe = process.env.CHROMIUM || (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--font-render-hinting=none'] });
async function open() {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('[pageerror]', e.message)); p.on('console', m => ['warning', 'error'].includes(m.type()) && console.warn('[console]', m.text()));
  await p.goto(`http://127.0.0.1:${PORT}/${PAGE}?mode=render`); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return p;
}
const grab = (p, fn, arg, type = 'jpeg') => p.evaluate(async ([fn, arg, type]) => { await window[fn](arg); const u = document.getElementById('stage').toDataURL('image/' + type, 0.95); return u.slice(u.indexOf(',') + 1); }, [fn, arg, type]);
mkdirSync(join(ROOT, 'build/stills'), { recursive: true }); mkdirSync(join(ROOT, 'out'), { recursive: true });
if (a.includes('--cover')) {
  const p = await open(); writeFileSync(join(ROOT, 'out/cover.png'), Buffer.from(await grab(p, 'renderCover', 0, 'png'), 'base64')); console.log('out/cover.png');
} else if (opt('--stills')) {
  const p = await open();
  for (const s of opt('--stills').split(',')) writeFileSync(join(ROOT, `${opt('--stilldir', 'build/stills')}/t${(+s).toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(await grab(p, 'renderAt', +s), 'base64'));
  console.log('stills ok');
} else {
  const p0 = await open(); writeFileSync(join(ROOT, 'build/cues.json'), JSON.stringify(await p0.evaluate(() => window.CUES || null))); const total = await p0.evaluate(() => window.TOTAL_FRAMES); const fps = await p0.evaluate(() => window.FPS_OUT); await p0.close();
  const f0 = Math.round(+opt('--from', 0) * fps), f1 = Math.min(total, Math.round(+opt('--to', 1e9) * fps));
  const dir = join(ROOT, PAGE === 'index.html' ? 'build/frames' : PAGE === 'film.html' ? 'build/frames2' : 'build/frames3'); mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) unlinkSync(join(dir, f));
  const workers = +opt('--workers', 4); let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const p = await open();
    for (let i = f0 + k; i < f1; i += workers) {
      writeFileSync(join(dir, `${String(i - f0).padStart(5, '0')}.jpg`), Buffer.from(await grab(p, 'renderFrame', i), 'base64'));
      if (++done % 300 === 0) console.log(`${done}/${f1 - f0} ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} fps`);
    }
  }));
  console.log(`rendered ${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', join(dir, '%05d.jpg'), '-vf', 'scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'film', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', join(ROOT, OUTV)], { stdio: 'inherit' });
  console.log(OUTV);
}
await browser.close(); server.close();
