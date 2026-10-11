---
name: MariaDB bootstrap in this environment
description: Distinguish shell-tool sandbox failures from actual MariaDB startup failures.
---

A MariaDB initialization failure mentioning an invalid `/proc/.../fd/-1` in a shell-tool invocation is not evidence that MariaDB cannot run in this workspace.

**Why:** The standard initializer failed in the shell execution sandbox but completed successfully when run by the managed development workflow, with normal authenticated accounts.

**How to apply:** Prefer normal initialization in the managed workflow when this sandbox error occurs. Do not weaken database authentication or introduce `--skip-grant-tables` to compensate for a tool-side execution restriction.

Fresh temporary test databases can hit the same shell-sandbox failure. A successful check against an already initialized, isolated test database verifies the runtime and package, but does not prove fresh initialization on a GitHub Linux runner.

**Why:** Fresh initialization has been blocked by the shell sandbox while verification against the running isolated development database succeeds.

**How to apply:** Keep those validation results separate. Confirm runner-specific bootstrap fixes in GitHub Actions before declaring the remote workflow healthy.
