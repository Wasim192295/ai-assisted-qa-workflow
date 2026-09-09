import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { root, writeJson } from './files.js';
import { validate } from './schemas.js';
import { mockCases, mockAutomation, mockClassify } from './mock-provider.js';

const mocks = { 'generate-cases': mockCases, 'generate-automation': mockAutomation, 'classify-failures': mockClassify };
export async function askAI(task, input, schema, { provider = 'mock', workspace, fetchImpl = fetch } = {}) {
  if (!['mock', 'ollama'].includes(provider)) throw new Error(`Unknown provider: ${provider}. Choose mock or ollama.`);
  const system = await readFile(path.join(root, 'prompts', `${task}.txt`), 'utf8');
  const messages = [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify({ input, outputSchema: schema }) }];
  const model = provider === 'ollama' ? process.env.OLLAMA_MODEL : 'deterministic-demo-v1';
  let output;
  if (provider === 'mock') {
    output = await mocks[task](input);
  } else {
    if (!model) throw new Error('Set OLLAMA_MODEL to a locally installed Ollama model before using --provider ollama.');
    const base = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    const response = await fetchImpl(`${base.replace(/\/$/, '')}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, format: schema, stream: false, options: { temperature: 0 } }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}; no mock fallback was used.`);
    const body = await response.json();
    if (!body.message?.content) throw new Error('Ollama response has no message.content.');
    try { output = JSON.parse(body.message.content); } catch { throw new Error('Ollama returned invalid JSON. Review the prompt/model and retry; no output was approved.'); }
  }
  validate(schema, output, `${task} response`);
  const provenance = { provider, model, mocked: provider === 'mock', timestamp: new Date().toISOString() };
  if (workspace) await writeJson(path.join(workspace, 'ai-audit', `${task}-${randomUUID()}.json`), { ...provenance, task, messages, output });
  return { output, provenance };
}
