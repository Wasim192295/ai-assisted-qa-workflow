# Supporting evidence for the execution PDF

These selected evidence files support `Wasim-Syed-AI-QA-Execution-Evidence.pdf`, supplied separately as an email attachment. All of the PDF's Evidence references can be inspected in this GitHub repository without the ZIP. The submission ZIP also includes these files and the PDF.

## Original location to packaged location

| Original local artifact | File in this repository (also included in the ZIP) |
| --- | --- |
| `work/demo/cases.json` | [demo/cases.json](demo/cases.json) |
| `work/demo/reviews.json` | [demo/reviews.json](demo/reviews.json) |
| `work/demo/automation.json` | [demo/automation.json](demo/automation.json) |
| Manifest-referenced `work/demo/automation/<generation>/*.spec.js` | Same relative paths under [demo/automation/](demo/automation/) |
| `work/demo/ai-audit/*.json` for the four demonstrated provider calls | [demo/ai-audit/](demo/ai-audit/) |
| `work/demo/execution-report.json` | [demo/execution-report.json](demo/execution-report.json) |
| `work/demo/execution-summary.json` | [demo/execution-summary.json](demo/execution-summary.json) |
| `work/demo/failure-categorization.json` | [demo/failure-categorization.json](demo/failure-categorization.json) |
| Captured workflow-test PowerShell output | [console/workflow-tests.txt](console/workflow-tests.txt) |
| Captured review-status PowerShell output | [console/review-status.txt](console/review-status.txt) |
| Playwright's actual UI-005 failure screenshot | [demo/UI-005-failure.png](demo/UI-005-failure.png) |
| Retained healthy baseline from 09 Sep 2026 | [../samples/execution-pass.json](../samples/execution-pass.json), its summary and pass categorization |

## How to interpret the evidence

- The demo cases and source approvals are recorded under Wasim syed on 10 Sep 2026. Review metadata is preserved exactly; no new approval has been fabricated.
- The demo execution report contains the intentional locked-login defect: 10 passes and 2 failures, with exit code 1.
- The current demo categorization file analyzes the separately labelled synthetic example, not the preceding real report. The real report's two classifications are preserved in the corresponding `classify-failures` audit file.
- Provider calls are explicitly mocked. Audit files retain prompts, inputs, outputs, provider/model labels and timestamps; they do not demonstrate live Ollama inference.
- Original paths inside raw reports, error stacks, transcripts and audit content are historical provenance. They have not been rewritten to make the original executions appear to have occurred elsewhere. Use the mapping above to find the copied evidence.
- The original screenshot is copied without modification. Other binary traces/error-context attachments mentioned inside raw reports are not part of this curated evidence set; rerunning the documented commands creates those runtime artifacts.
- The manifest's relative script paths resolve from `evidence/demo/`, but this directory is evidence to inspect, not an active CLI workspace. Use a fresh `work/<name>` workspace to reproduce the workflow.

The ZIP excludes the full runtime folders, report-building helpers, interview-preparation notes, installed dependencies and Git history. The public demo credentials appearing in cases/source/audits are test fixtures.
