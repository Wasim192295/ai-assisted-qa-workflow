# Assessment coverage

Authoritative source: [Assessment -Sr AI QA Automation Testing,.md](<../Assessment -Sr AI QA Automation Testing,.md>).

| Requirement | Implementation / evidence |
| --- | --- |
| Input acceptance criteria | `examples/login-feature.json`; `generate-cases --input` |
| Structured manual UI and API cases | Separate type/ID fields, requirement IDs, preconditions, ordered steps, concrete data and expectations; five generated UI plus five generated API cases |
| Accept manually created cases | `import-cases`; two hand-authored examples; manual-only workflow supported |
| Convert approved selected cases to Playwright | `generate-automation --ids`; one source file per selected approved case; UI and API scenarios demonstrated |
| Human review before execution | Editable JSON/source, separate approve/reject commands, reviewer notes, content digests, stale-approval blocking |
| Accept execution output | `analyze --report`; real Playwright JSON and explicit synthetic fixture |
| Categorize failures with AI | Live Ollama prompt/schema adapter; labelled deterministic mock fallback selected explicitly, never silently; all five categories plus uncertain outcome |
| Explain AI approach | README, three prompt files, provider provenance, per-call audit files |
| Use Playwright, limited feature scope | Real Chromium UI and API request tests for User Login only |
| Source and local instructions | Source modules, locked dependencies, README commands |
| Sample outputs | `samples/` plus `examples/failure-report.json` |
| Architecture, decisions, assumptions, implemented/mocked | README |
| Scale, human validation, improvements | `docs/design-note.md` |

## Login scenario traceability

| Criterion | UI coverage | API coverage |
| --- | --- | --- |
| AC-01: valid credentials | UI-001 | API-001 |
| AC-02: invalid credentials | UI-002 | API-002 |
| AC-03: mandatory username/password | UI-003, UI-004, manual UI-006 | API-003, API-004, manual API-006 |
| AC-04: locked user | UI-005 | API-005 |
| AC-05: appropriate API status codes | API expectations documented alongside UI results | API-001 through API-006 assert 200/401/400/423 per scenario |

Review signatures in the included verification artifacts are demonstration records, not the candidate's personal approval. Follow the README review steps before presenting the prototype.
