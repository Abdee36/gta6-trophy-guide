// Takes the entry's 4 screenshots with puppeteer-core and the VM's
// Chromium build. Serves nothing itself: run `node serve.ts --port 8123`
// in the repo first, then `node shots.mjs`. Output is JPEG at 1280x800,
// which keeps each file well under the gate's 256 KiB cap.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/home/hatch/workspace/.shot/node_modules/puppeteer-core');

const BASE = 'file:///home/hatch/workspace/makefun/gta6-trophy-guide-01/repo/app/index.html';
const SHOTS = [
  // Cover: checklist scrolled into view under the sticky filter bar, with
  // demo progress and guides + sources visible.
  { file: 'screenshots/1-cover.jpg', hash: '#demo', scroll: 'list', offset: -150, bust: 'v=1' },
  // Roadmap to the platinum, with the missable-trophy warning.
  { file: 'screenshots/2-roadmap.jpg', hash: '#roadmap', scroll: 'roadmap', offset: -150, bust: 'v=2' },
  // Spoiler mode on, with demo progress: story trophies hidden, earned ones revealed.
  { file: 'screenshots/3-spoiler.jpg', hash: '#spoiler&demo', scroll: 'list', offset: -150, bust: 'v=3' },
  // Missable filter: the one possibly-missable trophy with its full guide.
  { file: 'screenshots/4-missable.jpg', hash: '#missable', scroll: 'list', offset: -150, bust: 'v=4' },
];

const policy = 'hatch-webgl-allowed-domains-v1\nexample.com\n';
const policyPath = '/tmp/webgl-policy-gta6.txt';
writeFileSync(policyPath, policy);
const sha = createHash('sha256').update(policy).digest('hex');

const browser = await puppeteer.launch({
  executablePath: '/opt/meta-chromium/chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--disable-features=LocalNetworkAccessChecks',
    '--allow-file-access-from-files',
    '--no-proxy-server',
    `--hatch-webgl-allowed-domains-file=${policyPath}`,
    `--hatch-webgl-allowed-domains-sha256=${sha}`,
    '--user-data-dir=/tmp/chrome-shot-prof-gta6',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
for (const shot of SHOTS) {
  await page.goto(`${BASE}?${shot.bust}${shot.hash}`, { waitUntil: 'load', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate((id, offset) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo(0, Math.max(0, y));
  }, shot.scroll, shot.offset);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: shot.file, type: 'jpeg', quality: 82 });
  console.log(`shot: ${shot.file}`);
}
await browser.close();
console.log('done');
