// Headless Chrome'u DevTools protokolüyle sür: node dev/cdp.js '<json adımlar>' [genişlik] [yükseklik]
// Adımlar: {"url":"?q"} {"wait":ms} {"eval":"js"} {"shot":"dosya.png"}
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const steps = JSON.parse(process.argv[2]);
const W = parseInt(process.argv[3] || '1920', 10), H = parseInt(process.argv[4] || '1080', 10), DPR = parseFloat(process.argv[5] || '1');
const root = path.resolve(__dirname, '..');
const base = 'file://' + encodeURI(path.join(root, 'index.html')).replace(/#/g, '%23');
const ud = '/tmp/bh-claude-cdp-' + process.pid;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--user-data-dir=' + ud, '--hide-scrollbars', `--window-size=${W},${H}`,
  '--remote-debugging-port=0', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let killed = false;
function cleanup(code) {
  if (!killed) { killed = true; try { chrome.kill('SIGKILL'); } catch (e) {} }
  try { fs.rmSync(ud, { recursive: true, force: true }); } catch (e) {}
  process.exit(code);
}
const hard = setTimeout(() => { console.error('ZAMAN AŞIMI'); cleanup(2); }, parseInt(process.env.CDP_TIMEOUT || '240000', 10));

let wsUrl = null;
chrome.stderr.on('data', (d) => {
  const m = String(d).match(/DevTools listening on (ws:\/\/\S+)/);
  if (m && !wsUrl) { wsUrl = m[1]; run().catch((e) => { console.error('HATA', e); cleanup(1); }); }
});

async function run() {
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  let sessionId = null;
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result); return; }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const t = msg.params.args.map((a) => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      console.log(`[console.${msg.params.type}] ${t}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.log('[exception] ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 800));
    }
  });
  const send = (method, params = {}, sid) => new Promise((res, rej) => {
    const m = { id: ++id, method, params };
    if (sid) m.sessionId = sid;
    pending.set(m.id, { res, rej });
    ws.send(JSON.stringify(m));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
  for (const st of steps) {
    if (st.url !== undefined) {
      await S('Page.navigate', { url: base + st.url });
      await new Promise((r) => setTimeout(r, 300));
    } else if (st.wait) {
      await new Promise((r) => setTimeout(r, st.wait));
    } else if (st.eval) {
      const r = await S('Runtime.evaluate', { expression: st.eval, returnByValue: true, awaitPromise: true });
      console.log('[eval] ' + JSON.stringify(r.result.value !== undefined ? r.result.value : r.result.description));
    } else if (st.shot) {
      const r = await S('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.resolve(root, st.shot), Buffer.from(r.data, 'base64'));
      console.log('[shot] ' + st.shot);
    }
  }
  try { await send('Browser.close'); } catch (e) {}
  clearTimeout(hard);
  setTimeout(() => cleanup(0), 500);
}
