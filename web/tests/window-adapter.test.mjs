import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

test('desktop window adapter routes each operation and hides host errors', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTauriWindow } = await server.ssrLoadModule('/src/adapters/tauri/window.ts');
  const calls = [];
  let fail = false;
  const target = Object.fromEntries(['minimize', 'toggleMaximize', 'close'].map(method => [method, async function () {
    assert.equal(this, target);
    calls.push(method);
    if (fail) throw new Error('SECRET native failure');
  }]));
  const window = createTauriWindow(target, 'windows');
  assert.equal(window.platform, 'windows');
  assert.deepEqual(calls, [], 'construction performs no window operation');
  for (const method of ['minimize', 'toggleMaximize', 'close']) {
    assert.equal(await window[method](), undefined);
  }
  assert.deepEqual(calls, ['minimize', 'toggleMaximize', 'close']);
  fail = true;
  for (const method of ['minimize', 'toggleMaximize', 'close']) {
    await assert.rejects(window[method](), error => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, '窗口操作未能完成，请重试。');
      assert.equal(error.cause, undefined);
      return true;
    });
  }
  assert.deepEqual(calls, ['minimize', 'toggleMaximize', 'close', 'minimize', 'toggleMaximize', 'close'], 'failed operations are not retried');

  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.after(() => {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
  });
  for (const [userAgent, platform] of [
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'macos'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'windows'],
    ['Mozilla/5.0 (X11; Linux x86_64)', 'linux'],
  ]) {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent } });
    assert.equal(createTauriWindow(target).platform, platform);
  }
  assert.throws(() => createTauriWindow(), { message: '无法连接桌面窗口。' });
});
