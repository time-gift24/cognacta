import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

async function load(t) {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  return { ...await server.ssrLoadModule('/src/adapters/tauri/providers.ts'), ...await server.ssrLoadModule('/src/adapters/demo/providers.ts'), ...await server.ssrLoadModule('/src/providers/source.ts') };
}
const entry = { name: '公司网关', baseURL: 'https://gateway.example/prefix/v1', models: ['Model-A', 'model-a'], hasKey: true };
const catalog = { providers: [entry], defaultModel: { provider: entry.name, model: 'Model-A' } };

test('Provider boundary validates catalog, credentials, URL and explicit defaults', async t => {
  const { readProviderCatalog, validateProviderInput } = await load(t);
  assert.deepEqual(readProviderCatalog(catalog), catalog);
  for (const invalid of [
    { ...catalog, providers: [entry, entry] },
    { ...catalog, defaultModel: { provider: 'missing', model: 'Model-A' } },
    { ...catalog, providers: [{ ...entry, models: ['a', 'a'] }] },
    { ...catalog, providers: [{ ...entry, hasKey: 'yes' }] },
    { ...catalog, providers: [{ ...entry, baseURL: 'https://user:secret@example.test/v1' }] },
  ]) assert.throws(() => readProviderCatalog(invalid));
  for (const baseURL of ['file:///tmp/model', 'https://example.test/v1?key=secret', 'https://example.test/v1#key', 'https://example.test/\nkey'])
    assert.throws(() => validateProviderInput({ ...entry, baseURL }));
  assert.throws(() => validateProviderInput({ ...entry, apiKey: 'secret\nheader' }));
  assert.throws(() => validateProviderInput({ ...entry, apiKey: '密'.repeat(900) }));
  assert.deepEqual(validateProviderInput({ name: ' 空接入 ', baseURL: 'http://localhost:8000/v1/', models: [] }), { name: '空接入', baseURL: 'http://localhost:8000/v1', models: [] });
});

test('desktop source changes notify models only after commit; test cancellation is explicit and stale responses cannot succeed', async t => {
  const { createTauriProviders } = await load(t);
  const calls = [], testResult = Promise.withResolvers();
  let failSave = true;
  const source = createTauriProviders(async (method, params) => {
    calls.push([method, params]);
    if (method === 'provider_save' && failSave) throw { kind: 'credentials', message: 'SECRET upstream payload' };
    if (method === 'provider_test') return testResult.promise;
    if (method === 'provider_test_cancel') return { cancelled: true };
    if (method === 'models_list') return [{ id: '["公司网关","Model-A"]', label: '公司网关 / Model-A', isDefault: true }];
    return catalog;
  });
  let changes = 0;
  const dispose = source.models.subscribe(() => changes++);
  await assert.rejects(source.providers.save({ ...entry, apiKey: 'SECRET' }), error => error.message.includes('凭据') && !error.message.includes('SECRET'));
  assert.equal(changes, 0);
  failSave = false;
  await source.providers.save({ ...entry });
  assert.equal(changes, 1);
  assert.equal('apiKey' in calls.at(-1)[1], false, 'omitted key means preserve');
  assert.equal((await source.models.list())[0].isDefault, true);
  const controller = new AbortController();
  const testing = source.providers.test(catalog.defaultModel, controller.signal);
  controller.abort();
  await assert.rejects(testing, { name: 'AbortError' });
  assert.equal(calls.filter(([method]) => method === 'provider_test_cancel').length, 1);
  assert.equal(calls.find(([method]) => method === 'provider_test')[1].testId, calls.find(([method]) => method === 'provider_test_cancel')[1].testId);
  testResult.resolve({ tested: true });
  await new Promise(resolve => setTimeout(resolve, 0));
  const completedController = new AbortController();
  await source.providers.test(catalog.defaultModel, completedController.signal);
  completedController.abort();
  assert.equal(calls.filter(([method]) => method === 'provider_test_cancel').length, 1, 'completed tests release abort listeners');
  dispose();
  await source.providers.setDefault(catalog.defaultModel);
  assert.equal(changes, 1);
});

test('demo Provider instances and returned data are independent; no key values leave the source', async t => {
  const { createDemoProviders, providerModelId } = await load(t);
  const first = createDemoProviders(), second = createDemoProviders();
  const before = await second.providers.load();
  const saved = await first.providers.save({ name: '本地', baseURL: 'http://localhost:8000/prefix/v1', models: ['model', 'Model'], apiKey: 'SECRET' });
  assert.equal(first.providers.simulated, true);
  assert.equal(JSON.stringify(saved).includes('SECRET'), false);
  saved.providers[0].models.push('caller mutation');
  assert.equal((await first.providers.load()).providers[0].models.includes('caller mutation'), false);
  assert.deepEqual(await second.providers.load(), before);
  await first.providers.setDefault({ provider: '本地', model: 'Model' });
  assert.equal((await first.models.list()).find(model => model.isDefault).id, providerModelId({ provider: '本地', model: 'Model' }));
  await first.providers.save({ originalName: '本地', name: '本地', baseURL: 'http://localhost:8000/prefix/v1', models: ['Model'] });
  assert.equal((await first.providers.load()).providers.find(entry => entry.name === '本地').hasKey, true);
  await first.providers.save({ originalName: '本地', name: '本地', baseURL: 'http://localhost:8000/prefix/v1', models: ['Model'], apiKey: null });
  assert.equal((await first.providers.load()).providers.find(entry => entry.name === '本地').hasKey, false);
  const controller = new AbortController();
  const checking = first.providers.test({ provider: '本地', model: 'Model' }, controller.signal);
  controller.abort();
  await assert.rejects(checking, { name: 'AbortError' });
  await first.providers.remove('本地');
  assert.equal((await first.providers.load()).defaultModel, null);
  assert.equal((await first.models.list()).some(model => model.isDefault), false);
});

test('demo selection unwraps the actual model and fixes configuration identity without fallback', async t => {
  const { createDemoProviders, providerModelId } = await load(t);
  const source = createDemoProviders(), requests = [];
  let stops = 0;
  const gateway = source.wrapGateway({ abort() { stops++ }, async *stream(request) { requests.push(request); yield { type: 'started', metadata: { providerName: 'old', protocolName: 'mock', requestedModel: 'old' } }; yield { type: 'completed', response: { assistant: { parts: [] }, finish: { reason: 'stop' }, usage: {}, metadata: { providerName: 'old', protocolName: 'mock', requestedModel: 'old' } } }; } });
  const selected = { provider: '演示接入', model: 'sonnet-5' }, id = providerModelId(selected);
  const events = await Array.fromAsync(gateway.stream({ model: id, messages: [{ role: 'user', text: 'fixture' }] }));
  assert.equal(requests[0].model, 'sonnet-5');
  assert.equal(events[0].metadata.providerName, selected.provider);
  assert.equal(events.at(-1).response.metadata.resolvedModel, selected.model);
  await source.providers.setDefault({ provider: '演示接入', model: 'pine-1' });
  await Array.fromAsync(gateway.stream({ model: id, messages: [] }));
  assert.equal(requests.length, 2, 'default changes do not rebind existing sessions');
  await source.providers.save({ originalName: '演示接入', name: '演示接入', baseURL: 'https://changed.example/v1', models: ['sonnet-5'] });
  const failure = await Array.fromAsync(gateway.stream({ model: id, messages: [] }));
  assert.equal(failure[0].type, 'failed');
  assert.equal(requests.length, 2, 'changed configuration fails before mock execution');
  gateway.abort(); assert.equal(stops, 1);
});
