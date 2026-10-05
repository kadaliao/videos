// 逐帧导出：本地静态服务 + 多个无头 Chromium 页面并行 renderFrame(i)，抓 JPEG，ffmpeg 合成无声视频。
// usage: node render.mjs [--workers 6] [--from 秒] [--to 秒] [--stills 1,5.5,...] [--cover]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wav': 'audio/wav', '.json': 'application/json' };
const server = createServer((q, r) => { const f = join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(+(process.env.PORT || 8791));
const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
async function open() {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('[pageerror]', e.message)); p.on('console', m => m.type() === 'warning' && console.warn('[warn]', m.text()));
  await p.goto('http://127.0.0.1:' + (process.env.PORT || 8791) + '/index.html?mode=render'); await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return p;
}
const grab = (p, fn, arg) => p.evaluate(([fn, arg]) => { window[fn](arg); return document.getElementById('stage').toDataURL('image/jpeg', 0.95).slice(23); }, [fn, arg]);
mkdirSync(join(ROOT, 'build/stills'), { recursive: true });
if (a.includes('--cover')) {
  const p = await open(); const b = await p.evaluate(() => { window.renderCover(); return document.getElementById('stage').toDataURL('image/png').slice(22); });
  writeFileSync(join(ROOT, 'out/cover.png'), Buffer.from(b, 'base64')); console.log('out/cover.png');
} else if (opt('--stills')) {
  const p = await open();
  for (const s of opt('--stills').split(',')) { const b = await grab(p, 'renderFrame', Math.round(+s * 30)); writeFileSync(join(ROOT, `build/stills/t${(+s).toFixed(1)}.jpg`), Buffer.from(b, 'base64')); }
  const ev = await p.evaluate(() => window.sfxEvents()); writeFileSync(join(ROOT, 'build/sfx.json'), JSON.stringify(ev));
  console.log('stills ok');
} else {
  const p0 = await open(); const total = await p0.evaluate(() => window.TOTAL_FRAMES);
  writeFileSync(join(ROOT, 'build/sfx.json'), JSON.stringify(await p0.evaluate(() => window.sfxEvents()))); await p0.close();
  const f0 = Math.round(+opt('--from', 0) * 30), f1 = Math.min(total, Math.round(+opt('--to', 1e9) * 30));
  const dir = join(ROOT, 'build/frames'); mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) unlinkSync(join(dir, f));
  const workers = +opt('--workers', 6); let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const p = await open();
    for (let i = f0 + k; i < f1; i += workers) {
      writeFileSync(join(dir, `${String(i - f0).padStart(5, '0')}.jpg`), Buffer.from(await grab(p, 'renderFrame', i), 'base64'));
      if (++done % 300 === 0) console.log(`${done}/${f1 - f0} ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} fps`);
    }
  }));
  console.log(`rendered ${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', join(dir, '%05d.jpg'), '-vf', 'scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'animation', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', join(ROOT, 'build/video.mp4')], { stdio: 'inherit' });
  console.log('build/video.mp4');
}
await browser.close(); server.close();
