import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { root, readJson, writeJson, exists, digest, inside } from './files.js';
import { validate, validateCases, featureSchema, casesSchema, automationSchema, classificationSchema } from './schemas.js';
import { askAI } from './provider.js';
import { parseReport } from './reports.js';

export function workspacePath(value = 'work/default') {
  return inside(path.join(root, 'work'), path.relative(path.join(root, 'work'), path.resolve(root, value)));
}
const file = (workspace, name) => path.join(workspace, name);
const hashCase = (state, item) => digest({ feature: state.feature, case: item });
const current = (entry, hash) => entry?.digest === hash ? entry.decision : 'pending';
async function stateAt(workspace) {
  const state = await readJson(file(workspace, 'cases.json'));
  validate(featureSchema, state.feature, 'Feature');
  validateCases(state.cases, state.feature);
  return state;
}
async function reviewsAt(workspace) {
  return await exists(file(workspace, 'reviews.json')) ? readJson(file(workspace, 'reviews.json')) : { cases: {}, automation: {}, history: [] };
}
function select(items, ids) {
  if (!ids) throw new Error('Supply --ids all or a comma-separated list of case IDs.');
  const requested = ids === 'all' ? items.map((item) => item.id) : ids.split(',').map((id) => id.trim());
  if (!requested.length || new Set(requested).size !== requested.length) throw new Error('Selection must contain distinct case IDs.');
  return requested.map((id) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`Unknown case ID: ${id}`);
    return item;
  });
}
function decision(options) {
  if (!['approve', 'reject'].includes(options.decision)) throw new Error('--decision must be approve or reject.');
  if (!options.reviewer?.trim()) throw new Error('--reviewer is required to record a human review decision.');
  return { decision: options.decision, reviewer: options.reviewer, note: options.note || '', timestamp: new Date().toISOString() };
}
async function recordReviews(workspace, reviews, kind, entries) {
  for (const [id, entry] of entries) {
    reviews[kind][id] = entry;
    reviews.history.push({ kind, id, ...entry });
  }
  await writeJson(file(workspace, 'reviews.json'), reviews);
}
export async function generateCases(workspace, input, options) {
  if (await exists(file(workspace, 'cases.json'))) throw new Error('Cases already exist. Edit/import them or choose a new --workspace.');
  const feature = validate(featureSchema, await readJson(input), 'Feature');
  const { output, provenance } = await askAI('generate-cases', feature, casesSchema, { ...options, workspace });
  validateCases(output.cases, feature);
  if (!['UI', 'API'].every((type) => output.cases.some((item) => item.type === type))) throw new Error('Generated output must contain both UI and API coverage.');
  const covered = new Set(output.cases.flatMap((item) => item.requirementIds));
  if (feature.acceptanceCriteria.some((item) => !covered.has(item.id))) throw new Error('Generated output leaves an acceptance criterion unlinked.');
  await writeJson(file(workspace, 'cases.json'), { feature, cases: output.cases, sources: Object.fromEntries(output.cases.map((item) => [item.id, { source: 'generated', ...provenance }])) });
  return `${output.cases.length} draft cases saved to ${file(workspace, 'cases.json')}`;
}
export async function importCases(workspace, input, featurePath) {
  const incoming = validate(casesSchema, await readJson(input), 'Manual input');
  const state = await exists(file(workspace, 'cases.json')) ? await stateAt(workspace) : { feature: validate(featureSchema, await readJson(featurePath), 'Feature'), cases: [], sources: {} };
  validateCases([...state.cases, ...incoming.cases], state.feature);
  state.cases.push(...incoming.cases);
  for (const item of incoming.cases) state.sources[item.id] = { source: 'manual', timestamp: new Date().toISOString() };
  await writeJson(file(workspace, 'cases.json'), state);
  return `${incoming.cases.length} manual cases imported as pending review.`;
}
export async function reviewCases(workspace, options) {
  const entry = decision(options);
  const state = await stateAt(workspace);
  const reviews = await reviewsAt(workspace);
  const items = select(state.cases, options.ids);
  await recordReviews(workspace, reviews, 'cases', items.map((item) => [item.id, { ...entry, digest: hashCase(state, item) }]));
  return `${items.length} case(s): ${entry.decision}.`;
}
export async function generateAutomation(workspace, options) {
  const state = await stateAt(workspace);
  const reviews = await reviewsAt(workspace);
  const cases = options.ids ? select(state.cases, options.ids) : state.cases.filter((item) => current(reviews.cases[item.id], hashCase(state, item)) === 'approve');
  if (!cases.length) throw new Error('No currently approved test cases. Review cases first.');
  for (const item of cases) if (current(reviews.cases[item.id], hashCase(state, item)) !== 'approve') throw new Error(`${item.id} is not approved or was edited after review.`);
  const { output, provenance } = await askAI('generate-automation', { feature: state.feature, cases }, automationSchema, { ...options, workspace });
  const ids = output.scripts.map((script) => script.caseId);
  if (new Set(ids).size !== cases.length || ids.length !== cases.length || cases.some((item) => !ids.includes(item.id))) throw new Error('Automation response must contain exactly one script for each selected case.');
  // Each generation has its own directory so older unselected scripts cannot run.
  const generation = `automation/${randomUUID()}`;
  await mkdir(file(workspace, generation), { recursive: true });
  const artifacts = [];
  for (const script of output.scripts) {
    const relative = `${generation}/${script.caseId}.spec.js`;
    const target = inside(workspace, relative);
    await writeFile(target, script.code);
    checkSyntax(target);
    artifacts.push({ caseId: script.caseId, file: relative, caseDigest: hashCase(state, cases.find((item) => item.id === script.caseId)), generatedDigest: digest(script.code) });
  }
  await writeJson(file(workspace, 'automation.json'), { provenance, artifacts });
  return `${artifacts.length} draft Playwright scripts generated. Inspect the files listed in ${file(workspace, 'automation.json')}, then review-automation.`;
}
function checkSyntax(target) {
  const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Script syntax check failed for ${target}: ${result.error?.message || result.stderr}`);
}
async function artifactState(workspace, artifact, state, reviews) {
  const item = state.cases.find((candidate) => candidate.id === artifact.caseId);
  if (!item || hashCase(state, item) !== artifact.caseDigest || current(reviews.cases[item.id], hashCase(state, item)) !== 'approve') throw new Error(`Case ${artifact.caseId} changed or is no longer approved. Review and regenerate automation.`);
  const target = inside(workspace, artifact.file);
  const code = await readFile(target, 'utf8');
  return { target, hash: digest({ code, caseDigest: artifact.caseDigest, file: artifact.file }) };
}
export async function reviewAutomation(workspace, options) {
  const entry = decision(options);
  const state = await stateAt(workspace);
  const reviews = await reviewsAt(workspace);
  const manifest = await readJson(file(workspace, 'automation.json'));
  const items = select(manifest.artifacts.map((item) => ({ ...item, id: item.caseId })), options.ids);
  const entries = [];
  for (const item of items) {
    const artifact = await artifactState(workspace, item, state, reviews);
    if (entry.decision === 'approve') checkSyntax(artifact.target);
    entries.push([item.file, { ...entry, digest: artifact.hash }]);
  }
  await recordReviews(workspace, reviews, 'automation', entries);
  return `${entries.length} script(s): ${entry.decision}.`;
}
export async function executionPlan(workspace) {
  const state = await stateAt(workspace);
  const reviews = await reviewsAt(workspace);
  const manifest = await readJson(file(workspace, 'automation.json'));
  if (!manifest.artifacts?.length) throw new Error('No automation artifacts to execute.');
  for (const item of manifest.artifacts) {
    const artifact = await artifactState(workspace, item, state, reviews);
    if (current(reviews.automation[item.file], artifact.hash) !== 'approve') throw new Error(`Script ${item.caseId} is not approved or was edited after review.`);
  }
  return manifest;
}
export async function runAutomation(workspace) {
  const manifest = await executionPlan(workspace);
  const generationDir = path.dirname(manifest.artifacts[0].file);
  if (manifest.artifacts.some((item) => path.dirname(item.file) !== generationDir)) throw new Error('Manifest artifacts must belong to one generation.');
  const reportPath = file(workspace, 'execution-report.json');
  const config = file(workspace, 'playwright.config.js');
  const port = Number(process.env.DEMO_PORT || 4173);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('DEMO_PORT must be between 1024 and 65535.');
  const baseURL = `http://127.0.0.1:${port}`;
  const settings = {
    testDir: inside(workspace, generationDir),
    testMatch: manifest.artifacts.map((item) => `**/${path.basename(item.file)}`),
    outputDir: file(workspace, 'test-results'),
    fullyParallel: false, workers: 1, retries: 0, timeout: 15000,
    expect: { timeout: 5000 },
    reporter: [['list'], ['json', { outputFile: reportPath }]],
    use: { baseURL, browserName: 'chromium', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    webServer: { command: 'node demo/server.js', cwd: root, url: `${baseURL}/health`, reuseExistingServer: false, timeout: 15000, env: { DEMO_PORT: String(port) } },
  };
  await writeFile(config, `// Created only after review validation by the CLI.\nexport default ${JSON.stringify(settings, null, 2)};\n`);
  // Replace an earlier report with an explicit incomplete marker before starting.
  await writeJson(reportPath, { incomplete: true, startedAt: new Date().toISOString() });
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', config], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  const report = await readJson(reportPath);
  if (report.incomplete) throw new Error('Playwright did not produce a report. Check the runner output.');
  await writeJson(file(workspace, 'execution-summary.json'), { ...parseReport(report), exitCode: result.status, bugInjection: process.env.DEMO_BUG || null, timestamp: new Date().toISOString() });
  return result.status ?? 1;
}
export async function analyze(workspace, reportPath, options) {
  const parsed = parseReport(await readJson(reportPath));
  const context = await exists(file(workspace, 'cases.json')) ? await stateAt(workspace) : null;
  const reviews = await reviewsAt(workspace);
  const approvedContext = context?.cases.filter((item) => current(reviews.cases[item.id], hashCase(context, item)) === 'approve' && parsed.failures.some((failure) => failure.caseId === item.id)) || [];
  const result = parsed.failures.length
    ? await askAI('classify-failures', { ...parsed, feature: context?.feature || null, cases: approvedContext }, classificationSchema, { ...options, workspace })
    : { output: { classifications: [] }, provenance: { provider: 'none', mocked: false, reason: 'No failures or recovered retries to classify.' } };
  const ids = result.output.classifications.map((item) => item.failureId);
  if (ids.length !== parsed.failures.length || new Set(ids).size !== ids.length || parsed.failures.some((failure) => !ids.includes(failure.id))) throw new Error('AI classifications do not match report failure IDs.');
  const output = {
    sourceReport: path.relative(root, reportPath).replaceAll('\\', '/'),
    provenance: result.provenance, summary: parsed.summary,
    classifications: result.output.classifications.map((item) => ({ ...item, failure: parsed.failures.find((failure) => failure.id === item.failureId), humanReviewRequired: true })),
  };
  await writeJson(file(workspace, 'failure-categorization.json'), output);
  return output;
}
export async function status(workspace) {
  const state = await stateAt(workspace);
  const reviews = await reviewsAt(workspace);
  const manifest = await exists(file(workspace, 'automation.json')) ? await readJson(file(workspace, 'automation.json')) : { artifacts: [] };
  const rows = [];
  for (const item of state.cases) {
    const artifact = manifest.artifacts.find((candidate) => candidate.caseId === item.id);
    let automation = 'not generated';
    if (artifact) {
      try { const value = await artifactState(workspace, artifact, state, reviews); automation = current(reviews.automation[artifact.file], value.hash); }
      catch { automation = 'stale'; }
    }
    rows.push({ id: item.id, type: item.type, source: state.sources[item.id]?.source || 'manual', caseReview: current(reviews.cases[item.id], hashCase(state, item)), automation, title: item.title });
  }
  return rows;
}
