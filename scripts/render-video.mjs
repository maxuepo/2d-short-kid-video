#!/usr/bin/env node
// 逐帧渲染 index.html 并用 ffmpeg 合成为 MP4（确定性渲染，与实时帧率无关）
//
//   npm run render                       # 1080p30 全片 → out/xiaohe-lantern-night.mp4
//   npm run render -- --fps 24 --start 14 --end 22 --out out/bridge.mp4
//   npm run render -- --subs 0           # 不烧录字幕
//   npm run stills                       # 导出若干关键帧 PNG 到 out/stills/
//   npm run render:still                 # 单图模式（assets/scenes/bridge-night）→ out/still-bridge-night.mp4
//   npm run render -- --mode still --scene my-scene
//
// 依赖：playwright（npm i）与系统 ffmpeg。可用 CHROMIUM_PATH 指定浏览器可执行文件。
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(' ')
    .split(/\s*--/)
    .filter(Boolean)
    .map((s) => {
      const [k, ...v] = s.trim().split(/\s+/);
      return [k, v.length ? v.join(' ') : '1'];
    })
);

const fps = Number(args.fps || 30);
const subs = args.subs !== '0';
const stills = args.stills ? args.stills.split(',').map(Number) : null;
const still = args.mode === 'still';
const scene = args.scene || 'bridge-night';
const defaultOut = stills ? 'out/stills' : still ? `out/still-${scene}.mp4` : 'out/xiaohe-lantern-night.mp4';
const out = path.resolve(root, args.out || defaultOut);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[page]', e.message));
const url = pathToFileURL(path.join(root, 'index.html'));
url.search = `?record=1&subs=${subs ? 1 : 0}${still ? `&mode=still&scene=${encodeURIComponent(scene)}` : ''}`;
await page.goto(url.href);
await page.waitForFunction(() => window.KV && window.KV.ready === true, null, { timeout: 60000 });
const duration = await page.evaluate(() => window.KV.DURATION);
const canvas = await page.$('#stage');

const grab = async (t) => {
  await page.evaluate((tt) => window.KV.renderAt(tt), t);
  return canvas.screenshot({ type: stills ? 'png' : 'jpeg', quality: stills ? undefined : 95 });
};

if (stills) {
  mkdirSync(out, { recursive: true });
  for (const t of stills) {
    const file = path.join(out, `t${String(t).padStart(5, '0')}.png`);
    const buf = await grab(t);
    (await import('node:fs')).writeFileSync(file, buf);
    console.log('wrote', path.relative(root, file));
  }
} else {
  const start = Number(args.start || 0);
  const end = Math.min(Number(args.end || duration), duration);
  const frames = Math.round((end - start) * fps);
  mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], {
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await grab(start + i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r渲染中 ${i}/${frames} 帧 (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await done;
  console.log(`\n完成 → ${path.relative(root, out)}`);
}
await browser.close();
