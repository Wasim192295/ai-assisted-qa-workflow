import { parseArgs } from 'node:util';
import path from 'node:path';
import { root } from './files.js';
import { workspacePath, generateCases, importCases, reviewCases, generateAutomation, reviewAutomation, runAutomation, analyze, status } from './workflow.js';

const help = `AI-assisted QA workflow (User Login)

Commands:
  generate-cases       --input examples/login-feature.json [--provider mock|ollama]
  import-cases         --input examples/manual-cases.json [--feature examples/login-feature.json]
  status               Show case and automation review state
  review-cases         --ids all|UI-001,API-001 --decision approve|reject --reviewer NAME [--note TEXT]
  generate-automation  [--ids UI-001,API-001] [--provider mock|ollama]
  review-automation    --ids all|UI-001,API-001 --decision approve|reject --reviewer NAME [--note TEXT]
  run                  Execute current automation only after both reviews
  analyze              --report PATH [--provider mock|ollama]

All commands accept --workspace work/NAME (default: work/default).
Edit cases.json or the generated .spec.js files in your editor, then re-approve.
Mock mode is deterministic demo logic, not a live AI call. See README.md.
`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    input: { type: 'string' }, feature: { type: 'string', default: 'examples/login-feature.json' },
    workspace: { type: 'string', default: 'work/default' }, provider: { type: 'string', default: 'mock' },
    ids: { type: 'string' }, decision: { type: 'string' }, reviewer: { type: 'string' }, note: { type: 'string' },
    report: { type: 'string' }, help: { type: 'boolean' },
  } });
  const [command] = positionals;
  if (values.help || !command) { console.log(help); }
  else {
    if (positionals.length !== 1) throw new Error('Expected one command. Use --help.');
    const workspace = workspacePath(values.workspace);
    const required = (name) => { if (!values[name]) throw new Error(`--${name} is required.`); return path.resolve(root, values[name]); };
    switch (command) {
      case 'generate-cases': console.log(await generateCases(workspace, required('input'), values)); break;
      case 'import-cases': console.log(await importCases(workspace, required('input'), path.resolve(root, values.feature))); break;
      case 'review-cases': console.log(await reviewCases(workspace, values)); break;
      case 'generate-automation': console.log(await generateAutomation(workspace, values)); break;
      case 'review-automation': console.log(await reviewAutomation(workspace, values)); break;
      case 'run': process.exitCode = await runAutomation(workspace); break;
      case 'analyze': console.log(JSON.stringify(await analyze(workspace, required('report'), values), null, 2)); break;
      case 'status': console.table(await status(workspace)); break;
      default: throw new Error(`Unknown command: ${command}. Use --help.`);
    }
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
