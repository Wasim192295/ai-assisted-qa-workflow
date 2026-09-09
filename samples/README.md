# Sample outputs and verification

These artifacts were produced locally on **2026-09-09** with Node.js **24.19.0** and Playwright **1.63.0** on Windows. AI generation and categorization used the explicitly labelled **mock** provider. No live model inference is claimed.

| Artifact | Source / interpretation |
| --- | --- |
| [generated-test-cases.json](generated-test-cases.json) | Ten draft cases generated from the supplied five login criteria; five UI and five API |
| [reviewed-test-cases.json](reviewed-test-cases.json) | The ten generated cases plus two imported manual cases used for execution |
| [playwright/](playwright/) | Twelve generated Playwright source files, copied without changes from the verified generation |
| [automation-manifest.json](automation-manifest.json) | Original generation metadata, case/content digests, and workspace-relative artifact paths |
| [review-decisions.json](review-decisions.json) | Case and source-review records for prototype verification; explicitly labelled assistant demonstration review, not candidate sign-off |
| [execution-pass.json](execution-pass.json) | Actual healthy Playwright JSON report: **12 passed**, exit code **0** |
| [execution-pass-summary.json](execution-pass-summary.json) | Normalized summary of the healthy run |
| [pass-categorization.json](pass-categorization.json) | Empty classification list; AI was not called for the passing report |
| [execution-fail.json](execution-fail.json) | Actual Playwright report with `DEMO_BUG=locked-login`: **10 passed, 2 failed**, exit code **1** |
| [execution-fail-summary.json](execution-fail-summary.json) | Normalized injected-defect run; failures are API-005 and UI-005 |
| [real-failure-categorization.json](real-failure-categorization.json) | Mock triage of those two actual assertion failures; both remain tentative assertion mismatches |
| [failure-categorization.json](failure-categorization.json) | Mock triage of [the explicitly synthetic report](../examples/failure-report.json): six final failures, one recovered retry, one pass, one skip |

The synthetic report demonstrates Script/locator issue, Product defect, Environment issue, Test data issue, Assertion mismatch, and Needs investigation. Its product-defect evidence is hand-authored fixture text. It must not be presented as independently observed product behavior or measured AI accuracy.

## Verification performed

- `npm.cmd test`: **10 passed, 0 failed**. Checks cover review invalidation, rejection, selected-case execution eligibility, manual-only input, duplicate/malformed input, requirement changes, nested reports, projects, retries, expected failures, interruptions, uncertain classification, and simulated Ollama response validation.
- Healthy reviewed UI/API generation: **12/12 passing**, completed in approximately **4.8 seconds**.
- Injected locked-login defect: **10 passing, 2 expected-to-be-detected failures**, completed in approximately **11.6 seconds**. These are ordinary failed tests, not Playwright `test.fail()` declarations.
- Live Ollama inference: **not run**; no local model was installed. The HTTP adapter was tested using simulated responses.

The final Playwright executions used normal local process permissions because the restricted coding sandbox prevented Windows server cleanup. This did not require changing the application or tests.

## Reproduce and interpret paths

Use the commands in the [main README](../README.md). For direct report-only analysis:

```powershell
npm.cmd run qa -- analyze --workspace work/report-demo --report samples/execution-fail.json
npm.cmd run qa -- analyze --workspace work/report-demo --report examples/failure-report.json
```

Report and review paths preserve the original `work/verification` execution location for provenance. The raw `execution-report.json` was copied after each run to the corresponding pass/fail filename before the next run overwrote it. The scripts under `playwright/` are copies of the manifest's files; create new approvals through the CLI to execute your own run.

Binary traces and screenshots referenced by the raw failing report are runtime artifacts, omitted from this small submission. Rerunning the injected-defect demonstration recreates them under your workspace's `test-results/` directory.
