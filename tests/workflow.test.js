import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, appendFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { root, readJson, writeJson } from '../src/files.js';
import { generateCases, importCases, reviewCases, generateAutomation, reviewAutomation, executionPlan, status, workspacePath } from '../src/workflow.js';

const feature = path.join(root, 'examples/login-feature.json');
const manual = path.join(root, 'examples/manual-cases.json');
const approve = { ids: 'all', decision: 'approve', reviewer: 'Automated gate test' };
async function workspace(t) {
  const parent = path.join(root, 'work');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'unit-'));
  t.after(async () => {
    const relative = path.relative(parent, directory);
    assert.ok(relative.startsWith('unit-') && !relative.includes(path.sep));
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('end-to-end gates: no implicit approval; source and script edits invalidate approval', async (t) => {
  const dir = await workspace(t);
  await generateCases(dir, feature, { provider: 'mock' });
  await importCases(dir, manual, feature);
  assert.equal((await status(dir)).length, 12);
  await assert.rejects(generateAutomation(dir, {}), /No currently approved/);
  await reviewCases(dir, { ...approve, ids: 'UI-001,API-006' });
  await reviewCases(dir, { ...approve, ids: 'UI-002', decision: 'reject' });
  await assert.rejects(generateAutomation(dir, { ids: 'UI-002' }), /not approved/);
  await generateAutomation(dir, { provider: 'mock' });
  const manifest = await readJson(path.join(dir, 'automation.json'));
  assert.deepEqual(manifest.artifacts.map((item) => item.caseId), ['UI-001', 'API-006']);
  const importedCode = await readFile(path.join(dir, manifest.artifacts[1].file), 'utf8');
  assert.match(importedCode, /API-006/);
  assert.match(importedCode, /toBe\(400\)/);
  await assert.rejects(executionPlan(dir), /Script UI-001 is not approved/);
  await reviewAutomation(dir, approve);
  await executionPlan(dir);
  const scriptPath = path.join(dir, manifest.artifacts[0].file);
  await appendFile(scriptPath, '\n// reviewer edit\n');
  await assert.rejects(executionPlan(dir), /edited after review/);
  await reviewAutomation(dir, { ...approve, ids: 'UI-001' });
  await executionPlan(dir);
  const state = await readJson(path.join(dir, 'cases.json'));
  state.cases[0].expected.message = 'Changed expectation';
  await writeJson(path.join(dir, 'cases.json'), state);
  await assert.rejects(executionPlan(dir), /Case UI-001 changed/);
  await reviewCases(dir, { ...approve, ids: 'UI-001' });
  await assert.rejects(executionPlan(dir), /Review and regenerate/);
});

test('manual input can initialize workflow; duplicate IDs and malformed input leave state intact', async (t) => {
  const dir = await workspace(t);
  await importCases(dir, manual, feature);
  const before = await readFile(path.join(dir, 'cases.json'), 'utf8');
  await assert.rejects(importCases(dir, manual, feature), /Duplicate/);
  const bad = path.join(dir, 'bad.json');
  await writeJson(bad, { cases: [{ id: 'API-007' }] });
  await assert.rejects(importCases(dir, bad, feature), /invalid/);
  assert.equal(await readFile(path.join(dir, 'cases.json'), 'utf8'), before);
  await reviewCases(dir, approve);
  await generateAutomation(dir, { provider: 'mock' });
  await reviewAutomation(dir, approve);
  assert.equal((await executionPlan(dir)).artifacts.length, 2);
});

test('rejecting a previously approved case or script blocks execution', async (t) => {
  const dir = await workspace(t);
  await importCases(dir, manual, feature);
  await reviewCases(dir, approve);
  await generateAutomation(dir, {});
  await reviewAutomation(dir, approve);
  await reviewAutomation(dir, { ...approve, ids: 'API-006', decision: 'reject' });
  await assert.rejects(executionPlan(dir), /Script API-006 is not approved/);
  await reviewAutomation(dir, approve);
  await reviewCases(dir, { ...approve, ids: 'UI-006', decision: 'reject' });
  await assert.rejects(executionPlan(dir), /no longer approved/);
});

test('changing contract invalidates case approval; mock does not silently ignore changed criteria', async (t) => {
  const dir = await workspace(t);
  await generateCases(dir, feature, {});
  await reviewCases(dir, approve);
  const state = await readJson(path.join(dir, 'cases.json'));
  state.feature.contract.submitName = 'Sign in';
  await writeJson(path.join(dir, 'cases.json'), state);
  assert.ok((await status(dir)).every((row) => row.caseReview === 'pending'));
  const changed = path.join(dir, 'feature.json');
  await writeJson(changed, state.feature);
  await assert.rejects(generateCases(path.join(dir, 'changed'), changed, {}), /Mock case generation supports only/);
});

test('workspace must stay inside project work directory', () => {
  assert.throws(() => workspacePath('../outside'), /Invalid artifact path/);
  assert.throws(() => workspacePath('work'), /Invalid artifact path/);
  assert.equal(workspacePath('work/demo'), path.join(root, 'work/demo'));
});
