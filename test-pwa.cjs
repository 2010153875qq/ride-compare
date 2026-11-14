const { chromium } = require('/workspace/snake-online/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const root = '/workspace/ride-compare/site';
const prefix = '/ride-compare';
const port = 8198;
const base = `http://localhost:${port}${prefix}/`;
const types = {
  html: 'text/html; charset=utf-8', css: 'text/css', js: 'application/javascript',
  json: 'application/json', webmanifest: 'application/manifest+json',
  png: 'image/png', svg: 'image/svg+xml'
};

const srv = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === prefix) url = prefix + '/';
  if (!url.startsWith(prefix + '/') && url !== prefix) {
    res.writeHead(404); return res.end('not under ' + prefix);
  }
  let rel = url.slice(prefix.length + 1);
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, d) => {
    if (e) { res.writeHead(404); return res.end('missing ' + rel); }
    const ext = path.extname(file).slice(1);
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(port);

function assert(cond, msg) { if (!cond) throw new Error(msg); }

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(base, { waitUntil: 'load' });

  // manifest
  const manHref = await pg.$eval('link[rel="manifest"]', el => el.getAttribute('href'));
  assert(manHref === 'manifest.webmanifest', 'manifest href should be relative: ' + manHref);
  const manUrl = await pg.$eval('link[rel="manifest"]', el => el.href);
  assert(manUrl === base + 'manifest.webmanifest', 'manifest resolved url: ' + manUrl);
  const man = await pg.evaluate(async (u) => {
    const r = await fetch(u);
    return { status: r.status, type: r.headers.get('content-type'), body: await r.json() };
  }, manUrl);
  assert(man.status === 200, 'manifest status ' + man.status);
  assert((man.type || '').includes('manifest') || (man.type || '').includes('json'), 'manifest type ' + man.type);
  assert(man.body.name === '打车比价', 'name ' + man.body.name);
  assert(man.body.short_name === '打车比价', 'short_name');
  assert(man.body.display === 'standalone', 'display ' + man.body.display);
  assert(man.body.start_url === './', 'start_url ' + man.body.start_url);
  assert(man.body.scope === './', 'scope ' + man.body.scope);
  assert(man.body.theme_color === '#1a73ff', 'theme');
  console.log('manifest ok', man.body.name, man.body.start_url, man.body.display);

  // iOS meta
  const metas = await pg.evaluate(() => ({
    capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]').content,
    status: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content,
    title: document.querySelector('meta[name="apple-mobile-web-app-title"]').content,
    icon: document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href')
  }));
  assert(metas.capable === 'yes', 'capable');
  assert(!!metas.status, 'status bar style missing');
  assert(metas.title === '打车比价', 'ios title ' + metas.title);
  assert(metas.icon === 'icons/apple-touch-icon.png', 'apple-touch-icon path');
  console.log('ios meta ok', metas);

  // service worker
  const sw = await pg.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    let cached = [];
    if (keys.length) cached = await caches.open(keys[0]).then(c => c.keys()).then(ks => ks.map(k => k.url));
    return {
      scope: reg.scope,
      active: !!(reg.active && reg.active.scriptURL),
      scriptURL: reg.active && reg.active.scriptURL,
      cacheNames: keys,
      cachedCount: cached.length
    };
  });
  assert(sw.active, 'SW not active');
  assert(sw.scope === base, 'SW scope ' + sw.scope + ' expected ' + base);
  assert(sw.scriptURL === base + 'sw.js', 'SW script ' + sw.scriptURL);
  assert(sw.cachedCount >= 10, 'too few cached assets: ' + sw.cachedCount);
  console.log('sw ok', sw.scope, 'cached', sw.cachedCount, sw.cacheNames);

  // existing feature still works under subpath
  await pg.fill('#km', '8');
  await pg.fill('#min', '20'); await pg.click('#btnCalc');
  await pg.waitForSelector('.ritem');
  const n = await pg.$$eval('.ritem', els => els.length);
  assert(n >= 5, 'expected result rows, got ' + n);

  // offline reload
  await pg.context().setOffline(true);
  await pg.reload({ waitUntil: 'domcontentloaded' });
  const logo = await pg.textContent('.logo');
  assert(logo && logo.includes('打车比价'), 'offline logo missing: ' + logo);
  const title = await pg.title();
  assert(title.includes('打车比价'), 'offline title: ' + title);
  const hasForm = await pg.$('#routeForm');
  assert(!!hasForm, 'route form missing offline');
  console.log('offline reload ok', logo, title);
  await pg.context().setOffline(false);

  // iOS Safari hint visible, dismissible, stays dismissed
  const safariUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, userAgent: safariUA });
  await m.goto(base, { waitUntil: 'load' });
  const shown = await m.$eval('#iosHint', el => !el.classList.contains('hidden'));
  assert(shown, 'hint should show in iOS Safari');
  const text = await m.textContent('#iosHint');
  assert(text.includes('分享') && text.includes('添加到主屏幕'), 'hint text: ' + text);
  await m.click('#iosHintClose');
  const hidden = await m.$eval('#iosHint', el => el.classList.contains('hidden'));
  assert(hidden, 'hint should hide after close');
  await m.reload({ waitUntil: 'load' });
  const still = await m.$eval('#iosHint', el => el.classList.contains('hidden'));
  assert(still, 'hint should stay dismissed');
  console.log('ios hint ok');

  // non-Safari iPhone UA: hint hidden (same as existing mobile test UA, no Safari token)
  const other = await b.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile'
  });
  await other.goto(base, { waitUntil: 'load' });
  const noHint = await other.$eval('#iosHint', el => el.classList.contains('hidden'));
  assert(noHint, 'hint should stay hidden without Safari in UA');
  console.log('non-safari hint hidden ok');

  if (errs.length) console.log('pageerrors (non-fatal unless unexpected):', errs);
  await b.close();
  srv.close();
  console.log('RIDE PWA TESTS PASSED');
})().catch(e => { console.error('FAIL', e); try { srv.close(); } catch {} process.exit(1); });
