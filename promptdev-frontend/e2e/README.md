End-to-end (e2e) tests

This folder (./e2e) is the canonical location for end-to-end tests (Playwright) in this repository.

Recommended practices
- Keep all e2e tests in this dedicated folder (./e2e). Configure Playwright's testDir to point here (playwright.config.ts sets testDir: './e2e').
- Colocate unit and component tests with source files (next to the component) and keep e2e tests separate.
- Name e2e test files consistently (e.g., *.spec.ts or *.e2e.ts).
- Run e2e tests with an npm script (e.g., "npm run test:e2e" -> "playwright test").
- Do not commit secrets into tests; use environment variables or CI secret stores.
- Use stable selectors (data-* attributes) to reduce flakiness.

Notes
- This repo already contains a Playwright config with testDir set to './e2e'. If any e2e tests are found elsewhere, move them here and update imports.
- See Playwright docs: https://playwright.dev/docs/writing-tests
