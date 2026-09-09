import { digest, readJson, root } from './files.js';
import path from 'node:path';

export async function mockCases(feature) {
  const sample = await readJson(path.join(root, 'examples/login-feature.json'));
  if (digest(feature) !== digest(sample)) throw new Error('Mock case generation supports only examples/login-feature.json. Use --provider ollama for changed criteria, or import manually authored cases.');
  const { accounts, responses } = feature.contract;
  const variants = [
    ['001', 'Log in with valid credentials', 'AC-01', accounts.active, responses.valid],
    ['002', 'Reject invalid credentials', 'AC-02', { ...accounts.active, password: 'WrongPassword!' }, responses.invalid],
    ['003', 'Require a username', 'AC-03', { ...accounts.active, username: '' }, responses.missing],
    ['004', 'Require a password', 'AC-03', { ...accounts.active, password: '' }, responses.missing],
    ['005', 'Reject a locked account', 'AC-04', accounts.locked, responses.locked],
  ];
  return { cases: ['UI', 'API'].flatMap((type) => variants.map(([number, title, requirement, data, expected]) => ({
    id: `${type}-${number}`, type, title,
    requirementIds: type === 'API' ? [requirement, 'AC-05'] : [requirement],
    preconditions: [type === 'UI' ? 'Login page is available; no user is logged in' : 'Login API is available', 'Demo active and locked accounts match the documented contract'],
    steps: type === 'UI'
      ? ['Open the login page', `Enter Username: ${JSON.stringify(data.username)}`, `Enter Password: ${JSON.stringify(data.password)}`, 'Click Log in', `Verify the visible message: ${expected.message}`]
      : [`POST ${feature.contract.apiPath} with the supplied username and password as JSON`, `Verify HTTP ${expected.status}`, `Verify response message: ${expected.message}`],
    data, expected,
  }))) };
}

// Deterministic login adapter. This is explicitly a mock of the LLM stage.
// It supports imported cases using the same login data/expectation contract.
export function mockAutomation({ cases, feature }) {
  const q = JSON.stringify;
  const c = feature.contract;
  return { scripts: cases.map((item) => ({
    caseId: item.id,
    code: `import { test, expect } from '@playwright/test';\n\n// Mock-provider draft; human review required.\n// Requirements: ${item.requirementIds.join(', ')}\ntest(${q(`${item.id}: ${item.title}`)}, async ({ ${item.type === 'UI' ? 'page' : 'request'} }) => {\n` +
      (item.type === 'UI'
        ? `  await page.goto(${q(c.uiPath)});\n  await page.getByLabel(${q(c.usernameLabel)}, { exact: true }).fill(${q(item.data.username)});\n  await page.getByLabel(${q(c.passwordLabel)}, { exact: true }).fill(${q(item.data.password)});\n  await page.getByRole('button', { name: ${q(c.submitName)}, exact: true }).click();\n  await expect(page.getByRole('status')).toHaveText(${q(item.expected.message)});\n`
        : `  const response = await request.post(${q(c.apiPath)}, { data: ${q(item.data)} });\n  expect(response.status()).toBe(${item.expected.status});\n  expect(await response.json()).toEqual({ message: ${q(item.expected.message)} });\n`) +
      '});\n',
  })) };
}

export function mockClassify({ failures }) {
  return { classifications: failures.map((failure) => {
    const evidence = failure.errors.join('\n');
    let category = 'Needs investigation';
    let confidence = 0.25;
    let reasoning = 'The supplied text is insufficient to distinguish script, product, data, or infrastructure causes.';
    let nextAction = 'Inspect the trace, application logs, and approved expectation, then reproduce the failure.';
    if (/ECONNREFUSED|ENOTFOUND|Executable doesn.t exist|browserType.launch|503 Service Unavailable/i.test(evidence)) {
      category = 'Environment issue'; confidence = 0.9;
      reasoning = 'Connectivity or runtime availability evidence points to the test environment.';
      nextAction = 'Check the service health, base URL, and installed browser before rerunning.';
    } else if (/fixture.*(missing|not found|expired)|test account.*(missing|not found|expired)/i.test(evidence)) {
      category = 'Test data issue'; confidence = 0.85;
      reasoning = 'The failure explicitly identifies unavailable test setup data.';
      nextAction = 'Restore the documented fixture account and verify its state before rerunning.';
    } else if (/strict mode violation|locator.*(not found|resolved to 0)/i.test(evidence) || (/waiting for.*getBy|waiting for locator/i.test(evidence) && !/Expected:|Received:|Received string:|Expected string:/i.test(evidence))) {
      category = 'Script/locator issue'; confidence = 0.75;
      reasoning = 'The locator could not uniquely find its target; a UI behavior change remains an alternative.';
      nextAction = 'Inspect the DOM and trace against the reviewed locator and required UI behavior.';
    } else if (/AC-04.*locked users cannot log in/i.test(evidence) && /locked.user.*(received|actual).*200/i.test(evidence)) {
      category = 'Product defect'; confidence = 0.85;
      reasoning = 'The supplied reproduction and AC-04 context report successful login for the known locked account.';
      nextAction = 'Verify the account is locked and reproduce manually; raise a defect only after confirmation.';
    } else if (/Expected:|Received:|expect\(/i.test(evidence)) {
      category = 'Assertion mismatch'; confidence = 0.6;
      reasoning = 'Expected and observed values differ; the text alone cannot establish whether the test or product is wrong.';
      nextAction = 'Compare the actual response with the approved acceptance criterion and API contract.';
    }
    return { failureId: failure.id, category, confidence, evidence: [evidence.slice(0, 1000) || 'No error message supplied'], reasoning, nextAction };
  }) };
}
