const { chromium } = require('C:/Users/Huy/.bun/install/cache/playwright-core@1.64.1@@@1');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/Huy/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  await page.addInitScript(() => {
    window.__galleryAudioContexts = [];
    window.__galleryFootsteps = 0;
    const OriginalContext = window.AudioContext;
    window.AudioContext = class extends OriginalContext {
      constructor(...args) { super(...args); window.__galleryAudioContexts.push(this); }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (...args) => { window.__galleryFootsteps++; return start(...args); };
        return source;
      }
    };
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://localhost:3000/trien-lam-1975');
  await page.getByRole('button', { name: 'Enter', exact: true }).waitFor();
  await page.waitForFunction(() => !!document.querySelector('canvas'));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '.run/exhibition-intro.png' });
  console.log('entry buttons:', await page.getByRole('button').count());
  console.log('no sound before Enter:', await page.evaluate(() => window.__galleryAudioContexts.length === 0));
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await page.waitForTimeout(600);
  console.log('pointer lock:', await page.evaluate(() => Boolean(document.pointerLockElement)));
  console.log('restored reference has no audio:', await page.evaluate(() => window.__galleryAudioContexts.length === 0));
  await page.screenshot({ path: '.run/exhibition-room1.png' });
  await page.locator('.exhibition-walking-hint').waitFor({ state: 'hidden', timeout: 6000 });
  console.log('Esc hint hides automatically');
  await page.keyboard.down('w'); await page.waitForTimeout(1600); await page.keyboard.up('w');
  await page.keyboard.press('m');
  await page.getByRole('dialog').waitFor();
  await page.screenshot({ path: '.run/exhibition-menu.png' });
  await page.getByRole('button', { name: /02.*Ngày toàn thắng/ }).click();
  await page.getByRole('button', { name: 'Tiếp tục tham quan' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.run/exhibition-room2.png' });
  await page.keyboard.down('w'); await page.waitForTimeout(4500); await page.keyboard.up('w');
  await page.getByRole('button', { name: 'E Xem chi tiết' }).waitFor();
  await page.keyboard.down('w'); await page.waitForTimeout(950); await page.keyboard.up('w');
  await page.screenshot({ path: '.run/exhibition-reading-distance.png' });
  await page.keyboard.press('e');
  await page.getByRole('dialog').waitFor();
  console.log('nearby artwork inspection works');
  await page.screenshot({ path: '.run/exhibition-near-detail.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tiếp tục tham quan' }).click();
  await page.keyboard.press('m');
  await page.getByRole('button', { name: /03.*Đất nước liền một dải/ }).click();
  await page.getByRole('button', { name: 'Tiếp tục tham quan' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.run/exhibition-room3.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mục lục triển lãm', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Danh mục' }).click();
  await page.getByRole('button', { name: '05 Khoảnh khắc toàn thắng' }).click();
  await page.getByRole('img', { name: /Xe tăng quân giải phóng vượt/ }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.run/exhibition-detail.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Một khoảng lặng.' }).waitFor();
  console.log('esc pause visible:', await page.getByRole('heading', { name: 'Một khoảng lặng.' }).isVisible());
  console.log('errors:', errors);
  await page.getByRole('button', { name: 'Tiếp tục tham quan' }).click();
  const frameStats = await page.evaluate(() => new Promise(resolve => {
    const intervals = [];
    let previous = performance.now();
    function tick(now) {
      intervals.push(now - previous); previous = now;
      if (intervals.length < 120) requestAnimationFrame(tick);
      else resolve({ averageMs: intervals.reduce((a,b) => a+b,0)/intervals.length, p95Ms: intervals.sort((a,b) => a-b)[Math.floor(intervals.length*.95)] });
    }
    requestAnimationFrame(tick);
  }));
  console.log('headless frame timing (not a laptop hardware guarantee):', frameStats);
  await page.keyboard.press('Escape');
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await mobile.goto('http://localhost:3000/trien-lam-1975');
  await mobile.getByRole('button', { name: 'Enter', exact: true }).waitFor();
  await mobile.waitForTimeout(1500);
  await mobile.screenshot({ path: '.run/exhibition-mobile.png' });
  await mobile.getByRole('button', { name: 'Enter', exact: true }).click();
  await mobile.getByRole('button', { name: 'Đi tới', exact: true }).waitFor();
  await mobile.screenshot({ path: '.run/exhibition-mobile-room.png' });
  console.log('mobile controls visible');
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
