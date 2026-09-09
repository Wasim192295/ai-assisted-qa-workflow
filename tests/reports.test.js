import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { root, readJson } from '../src/files.js';
import { parseReport } from '../src/reports.js';
import { mockClassify } from '../src/mock-provider.js';

test('nested report preserves failures, recovered retries, skips and all triage categories', async () => {
  const parsed = parseReport(await readJson(path.join(root, 'examples/failure-report.json')));
  assert.deepEqual(parsed.summary, { total: 9, passed: 1, failed: 6, flaky: 1, skipped: 1, interrupted: 0, reportErrors: 0 });
  assert.equal(parsed.failures.length, 7);
  assert.equal(parsed.failures[0].file, 'login.spec.js');
  assert.equal(parsed.failures.at(-1).kind, 'flaky');
  assert.equal(parsed.failures.at(-1).attempts, 2);
  const categories = mockClassify(parsed).classifications.map((item) => item.category);
  assert.deepEqual(categories, ['Script/locator issue', 'Product defect', 'Environment issue', 'Test data issue', 'Assertion mismatch', 'Needs investigation', 'Environment issue']);
});

test('project runs stay distinct; expected failures, unexpected passes and interruptions are handled', () => {
  const parsed = parseReport({ suites: [{ title: 'suite', specs: [{ id: 'shared-id', title: 'UI-001', tests: [
    { projectName: 'chromium', expectedStatus: 'passed', results: [{ status: 'failed', error: { message: 'Expected: A; Received: B' } }] },
    { projectName: 'firefox', expectedStatus: 'passed', results: [{ status: 'failed', errors: [{ message: 'failure' }] }] },
    { expectedStatus: 'failed', results: [{ status: 'failed' }] },
    { expectedStatus: 'failed', results: [{ status: 'passed' }] },
    { results: [{ status: 'interrupted' }] },
    { results: [] },
  ] }] }], errors: [{ message: 'webServer could not start' }] });
  assert.deepEqual(parsed.summary, { total: 6, passed: 1, failed: 3, flaky: 0, skipped: 1, interrupted: 1, reportErrors: 1 });
  assert.equal(new Set(parsed.failures.map((item) => item.id)).size, 5);
  assert.match(parsed.failures[2].errors[0], /Expected test status failed; observed passed/);
});

test('malformed and unsupported reports fail explicitly', () => {
  assert.throws(() => parseReport({ tests: [] }), /Expected a Playwright JSON/);
  assert.throws(() => parseReport({ suites: [{ specs: [{ tests: [{ results: [{ status: 'mystery' }] }] }] }] }), /unknown status/);
  assert.throws(() => parseReport({ suites: [{ specs: [{ tests: null }] }] }), /tests must be an array/);
});

test('an assertion difference alone is never called a proven product defect', () => {
  const output = mockClassify({ failures: [
    { id: '1', errors: ['Expected: 423. Received: 200.'] },
    { id: '2', errors: ["expect(locator).toHaveText failed. Expected string: Account is locked. Received string: Welcome! Call log: waiting for getByRole('status')"] },
  ] });
  assert.equal(output.classifications[0].category, 'Assertion mismatch');
  assert.equal(output.classifications[1].category, 'Assertion mismatch');
});
