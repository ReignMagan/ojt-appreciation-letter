import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Run with Node 22+ and Chrome; no npm dependencies are required.
const root = resolve(import.meta.dirname, '..');
const deadline = setTimeout(() => { console.error('FAIL: browser check timed out'); process.exit(1); }, 30000);
const server = createServer(async (req, res) => {
  const file = { '/ojt/': 'index.html', '/ojt/style.css': 'style.css', '/ojt/script.js': 'script.js' }[req.url];
  try {
    assert.ok(file);
    const body = await readFile(join(root, file));
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const profile = await mkdtemp(join(tmpdir(), 'ojt-browser-'));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(100); }
  }
  assert.ok(port, 'Chrome must start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(5000) })).json();
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (task) { pending.delete(message.id); message.error ? task.reject(message.error) : task.resolve(message.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const url = `http://127.0.0.1:${server.address().port}/ojt/`;
  const load = async () => {
    const loaded = new Promise(resolve => {
      const onMessage = ({ data }) => {
        if (JSON.parse(data).method === 'Page.loadEventFired') {
          socket.removeEventListener('message', onMessage);
          resolve();
        }
      };
      socket.addEventListener('message', onMessage);
    });
    await send('Page.navigate', { url });
    await loaded;
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`document.readyState === 'complete' && location.pathname === '/ojt/'`)) return;
      await delay(50);
    }
    assert.fail('Page did not load');
  };
  await send('Page.enable');
  await load();
  assert.equal(await evaluate(`!!document.querySelector('#letter')`), true, 'The thank-you letter exists');
  assert.equal(await evaluate(`['Cristina', 'Kyleen', 'Jayped', 'Cristyflor', 'Charlie', 'Moscoso', 'Jarvis', 'One spreadsheet at a time', 'Your slightly awkward'].every(text => document.querySelector('#letter').textContent.includes(text))`), true, 'The complete personal appreciation and sign-off are preserved');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#letter')).maxWidth`), '680px', 'The stylesheet loads under the repository subpath');
  assert.equal(await evaluate(`document.querySelector('#letter').hidden`), true, 'The envelope initially conceals the letter');
  if (process.env.OJT_SCREENSHOTS) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await delay(1600);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tmpdir(), 'ojt-desktop.png'), Buffer.from(shot.data, 'base64'));
  }
  for (const input of ['mouse', 'Enter', ' ', 'touch']) {
    await load();
    await evaluate(`document.querySelector('#open-letter').focus()`);
    if (input === 'mouse' || input === 'touch') {
      const point = await evaluate(`(() => { const r = document.querySelector('#open-letter').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      if (input === 'touch') {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
      }
    } else {
      const key = input === ' ' ? { key: ' ', code: 'Space', windowsVirtualKeyCode: 32 } : { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...key, text: input === 'Enter' ? '\r' : ' ' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
    }
    await delay(950);
    assert.equal(await evaluate(`!document.querySelector('#letter').hidden && document.activeElement.id === 'letter-title'`), true, `${input} opens the letter and focuses its heading`);
    await evaluate(`document.querySelector('#open-letter').click()`);
    assert.equal(await evaluate(`document.querySelector('#open-letter').disabled`), true, 'Opening cannot restart');
  }
  for (const width of [320, 390, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `No horizontal overflow at ${width}px`);
    if (width === 390 && process.env.OJT_SCREENSHOTS) {
      await evaluate('scrollTo(0, 700)');
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(tmpdir(), 'ojt-mobile.png'), Buffer.from(shot.data, 'base64'));
    }
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load();
  assert.equal(await evaluate(`document.querySelector('#open-letter').click(); !document.querySelector('#letter').hidden && document.activeElement.id === 'letter-title'`), true, 'Reduced motion reveals and focuses immediately');
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await load();
  assert.equal(await evaluate(`!document.querySelector('#letter').hidden && document.querySelector('#open-letter').hidden`), true, 'Without JavaScript the letter is readable and the inactive control is hidden');
  console.log('PASS: mouse, touch, Enter, Space, focus, repeat activation, mobile/desktop overflow, reduced motion, no-JS, and repository-subpath loading.');
} finally {
  socket?.close();
  chrome.kill();
  server.close();
  await delay(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  clearTimeout(deadline);
}
