import { digest } from './files.js';

const clean = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
const messages = (result) => {
  const errors = result.errors?.length ? result.errors : result.error ? [result.error] : [];
  return errors.map((error) => clean(typeof error === 'string' ? error : error.message || error.stack || JSON.stringify(error)));
};

// Playwright JSON reporter: nested suites -> specs -> project/repeat tests -> attempts.
export function parseReport(report) {
  if (!report || !Array.isArray(report.suites) || (report.errors !== undefined && !Array.isArray(report.errors))) {
    throw new Error('Expected a Playwright JSON report with a suites array and optional errors array.');
  }
  const summary = { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, interrupted: 0, reportErrors: 0 };
  const failures = [];
  const statuses = new Set(['passed', 'failed', 'timedOut', 'skipped', 'interrupted']);
  function visit(suite, parents = [], parentFile = null) {
    if (!suite || (suite.suites !== undefined && !Array.isArray(suite.suites)) || (suite.specs !== undefined && !Array.isArray(suite.specs))) throw new Error('Malformed Playwright suite.');
    const titles = [...parents, suite.title || ''].filter(Boolean);
    const suiteFile = suite.file || parentFile;
    for (const spec of suite.specs || []) {
      if (!Array.isArray(spec.tests)) throw new Error('Malformed Playwright spec: tests must be an array.');
      for (const test of spec.tests) {
        if (!Array.isArray(test.results) || test.results.some((result) => !statuses.has(result.status))) throw new Error('Malformed Playwright test results or unknown status.');
        summary.total++;
        const final = test.results.at(-1);
        if (!final || final.status === 'skipped') { summary.skipped++; continue; }
        const expected = test.expectedStatus || 'passed';
        const recovered = final.status === expected && test.results.some((result) => result.status !== expected && result.status !== 'skipped');
        if (final.status === expected && !recovered) { summary.passed++; continue; }
        const kind = recovered ? 'flaky' : final.status === 'interrupted' ? 'interrupted' : 'failed';
        summary[kind]++;
        const relevant = recovered ? test.results.filter((result) => result.status !== expected && result.status !== 'skipped') : [final];
        const errors = relevant.flatMap(messages);
        if (!errors.length) errors.push(`Expected test status ${expected}; observed ${final.status}. No error details supplied.`);
        const title = [...titles, spec.title || '(untitled)'].join(' > ');
        failures.push({
          id: `failure-${digest(`${spec.id || title}:${test.projectName || ''}:${summary.total}`).slice(0, 12)}`,
          caseId: spec.title?.match(/\b(?:UI|API)-\d{3}\b/)?.[0] || null,
          title, project: test.projectName || 'default', kind,
          file: spec.file || suiteFile,
          attempts: test.results.length, finalStatus: final.status, errors,
        });
      }
    }
    for (const child of suite.suites || []) visit(child, titles, suiteFile);
  }
  for (const suite of report.suites) visit(suite);
  for (const error of report.errors || []) {
    summary.reportErrors++;
    failures.push({ id: `report-error-${summary.reportErrors}`, caseId: null, title: 'Report-level execution error', project: 'runner', kind: 'report-error', file: null, attempts: 0, finalStatus: 'failed', errors: messages({ errors: [error] }) });
  }
  return { summary, failures };
}
