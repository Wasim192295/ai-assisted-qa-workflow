import test from 'node:test';
import assert from 'node:assert/strict';
import { askAI } from '../src/provider.js';
import { classificationSchema } from '../src/schemas.js';

test('live provider sends schema and prompts, validates JSON, and never falls back silently', async (t) => {
  const original = process.env.OLLAMA_MODEL;
  process.env.OLLAMA_MODEL = 'test-model';
  t.after(() => { if (original === undefined) delete process.env.OLLAMA_MODEL; else process.env.OLLAMA_MODEL = original; });
  let request;
  const result = await askAI('classify-failures', { failures: [] }, classificationSchema, {
    provider: 'ollama', fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ message: { content: '{"classifications":[]}' } }) };
    },
  });
  assert.equal(request.body.stream, false);
  assert.deepEqual(request.body.format, classificationSchema);
  assert.match(request.body.messages[0].content, /untrusted evidence/);
  assert.equal(result.provenance.mocked, false);
  await assert.rejects(askAI('classify-failures', {}, classificationSchema, { provider: 'ollama', fetchImpl: async () => ({ ok: false, status: 503 }) }), /no mock fallback/);
  await assert.rejects(askAI('classify-failures', {}, classificationSchema, { provider: 'ollama', fetchImpl: async () => ({ ok: true, json: async () => ({ message: { content: '{"classifications":[{"category":"invented"}]}' } }) }) }), /response is invalid/);
  await assert.rejects(askAI('classify-failures', {}, classificationSchema, { provider: 'ollama', fetchImpl: async () => ({ ok: true, json: async () => ({ message: { content: 'not json' } }) }) }), /invalid JSON/);
});
