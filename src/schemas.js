import Ajv from 'ajv';

const text = { type: 'string', minLength: 1 };
const strings = { type: 'array', items: text, minItems: 1 };
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const categories = ['Script/locator issue', 'Product defect', 'Environment issue', 'Test data issue', 'Assertion mismatch', 'Needs investigation'];

export const caseSchema = object({
  id: { type: 'string', pattern: '^(UI|API)-[0-9]{3}$' },
  type: { enum: ['UI', 'API'] },
  title: text,
  requirementIds: strings,
  preconditions: strings,
  steps: strings,
  data: object({ username: { type: 'string' }, password: { type: 'string' } }),
  expected: object({ status: { type: 'integer', minimum: 100, maximum: 599 }, message: text }),
});
export const casesSchema = object({ cases: { type: 'array', items: caseSchema, minItems: 1 } });
export const featureSchema = object({
  feature: text,
  acceptanceCriteria: { type: 'array', minItems: 1, items: object({ id: text, description: text }) },
  contract: object({
    uiPath: text, apiPath: text,
    usernameLabel: text, passwordLabel: text, submitName: text,
    accounts: object({ active: object({ username: text, password: text }), locked: object({ username: text, password: text }) }),
    responses: object({
      valid: object({ status: { type: 'integer' }, message: text }),
      invalid: object({ status: { type: 'integer' }, message: text }),
      missing: object({ status: { type: 'integer' }, message: text }),
      locked: object({ status: { type: 'integer' }, message: text }),
    }),
  }),
});
export const automationSchema = object({ scripts: { type: 'array', minItems: 1, items: object({ caseId: text, code: text }) } });
export const classificationSchema = object({ classifications: { type: 'array', items: object({
  failureId: text, category: { enum: categories }, confidence: { type: 'number', minimum: 0, maximum: 1 },
  evidence: strings, reasoning: text, nextAction: text,
}) } });

const ajv = new Ajv({ allErrors: true });
const validators = new Map();
export function validate(schema, value, label = 'Input') {
  if (!validators.has(schema)) validators.set(schema, ajv.compile(schema));
  const check = validators.get(schema);
  if (!check(value)) throw new Error(`${label} is invalid: ${ajv.errorsText(check.errors, { separator: '; ' })}`);
  return value;
}

export function validateCases(cases, feature) {
  validate(casesSchema, { cases }, 'Test cases');
  const ids = new Set();
  const requirements = new Set(feature.acceptanceCriteria.map((item) => item.id));
  for (const item of cases) {
    if (ids.has(item.id)) throw new Error(`Duplicate case ID: ${item.id}`);
    ids.add(item.id);
    if (!item.id.startsWith(`${item.type}-`)) throw new Error(`Case ${item.id}: ID must match type`);
    if (item.requirementIds.some((id) => !requirements.has(id))) throw new Error(`Case ${item.id}: unknown requirement ID`);
  }
  return cases;
}
