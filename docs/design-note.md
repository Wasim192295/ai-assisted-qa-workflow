# Design note

The prototype keeps one complete QA workflow visible: requirements → manual cases → reviewed automation → execution → failure triage. Its main design choice is to separate probabilistic suggestions from deterministic validation and explicit review decisions.

## Scaling the solution

Keep the provider boundary and schemas, then replace per-workspace files with versioned storage and a small job queue. Batch generation by feature, preserve requirement/case IDs, and execute approved revisions in isolated CI workers. Add application-specific contracts or page objects as additional workflows are introduced; avoid building a universal template for unrelated screens. Store large traces separately and reference them from normalized failure records. Introduce model timeouts, bounded retries, token budgets, and request deduplication when volume justifies them.

## Where human validation is critical

1. **Before test approval:** Resolve ambiguous acceptance criteria and confirm status codes, account state, expected behavior, meaningful positive/negative coverage, and consistency between manual steps and executable data.
2. **Before execution:** Review the generated code for the intended scenario, trustworthy locators, useful assertions, test independence, and unintended actions. Editing the approved case requires regeneration; editing a script requires another script review.
3. **After failure categorization:** Check traces, product logs, fixture state, and reproducibility before treating a suggestion as a root cause. A changing error message might be a test expectation problem or a product regression. Never relax an assertion just because AI suggests it.

## Improvements with more time

- Run the live model against a small labelled dataset of cases and failures; measure requirement coverage, generated-script execution success, and a classification confusion matrix. Do not use mock results as evidence of model accuracy.
- Add sanitized trace excerpts and application-log correlation to improve diagnosis, especially the distinction between product defects and assertion mismatches.
- Add a compact diff-based review screen with authenticated reviewers, revision history, and CI enforcement. The current local hash check prevents accidental stale approvals but is not a security or compliance system.
- Run generated code in an isolated worker with controlled network access and dependencies. Add richer typed action schemas only when additional workflows require them.

These are extensions, not implemented features or requirements for this submission.
