// One-off verification: load the guide from file://, record every request
// the page makes, tick a trophy, reload, and confirm the tick survives
// (localStorage). Run: node check-offline.mjs
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/home/hatch/workspace/.shot/node_modules/puppeteer-core');

const policy = 'hatch-webgl-allowed-domains-v1\nexample.com\n';
const policyPath = '/tmp/webgl-policy-gta6.txt';
writeFileSync(policyPath, policy);
const sha = createHash('sha256').update(policy).digest('hex');

const browser = await puppeteer.launch({
  executablePath: '/opt/meta-chromium/chrome',
  headless: 'shell',
  args: [
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--disable-features=LocalNetworkAccessChecks', '--allow-file-access-from-files',
    '--no-proxy-server',
    `--hatch-webgl-allowed-domains-file=${policyPath}`,
    `--hatch-webgl-allowed-domains-sha256=${sha}`,
    '--user-data-dir=/tmp/chrome-shot-prof-gta6',
  ],
});
const page = await browser.newPage();
const requests = [];
page.on('request', (r) => requests.push(r.url()));
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
await page.setViewport({ width: 1280, height: 800 });
await page.goto('file:///home/hatch/workspace/makefun/gta6-trophy-guide-01/repo/app/index.html', { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1000));
const rendered = await page.evaluate(() => document.querySelectorAll('#list .trophy').length);
console.log('trophies rendered:', rendered);
const external = requests.filter((u) => !u.startsWith('file://') && !u.startsWith('data:'));
console.log('total requests:', requests.length, '| non-file/data requests:', JSON.stringify(external));
// Tick the first unchecked trophy, reload, check it persisted.
await page.evaluate(() => {
  const box = document.querySelector('#list .trophy input[type="checkbox"]:not(:checked)');
  box.click();
});
await new Promise((r) => setTimeout(r, 300));
const stored = await page.evaluate(() => localStorage.getItem('gta6-trophy-guide-earned-v1'));
console.log('localStorage after tick:', stored);
await page.reload({ waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 800));
const checkedAfterReload = await page.evaluate(() => document.querySelectorAll('#list .trophy input[type="checkbox"]:checked').length);
console.log('checked after reload:', checkedAfterReload);
const progress = await page.evaluate(() => document.getElementById('progressText').textContent);
console.log('progress line:', progress);
await browser.close();
console.log('offline check done');
